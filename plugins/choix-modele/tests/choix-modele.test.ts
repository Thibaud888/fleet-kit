import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

import { dejaBon, lireAvis, lireReponse } from '../hooks/regles'

type Vu = { model: string; effort?: unknown; agentId?: string }

// Le monde sous le mod : le juge (model.complete), la question (AskUserQuestion) et
// l'API (turn.step), qui note avec quel modèle et quel effort chaque requête part.
const monde = (
  on: On,
  { avis, reponse }: { avis: object | string; reponse?: string | 'jamais' },
) => {
  const vus: Vu[] = []
  const questions: string[] = []
  const juges: string[] = []
  const lignes: string[] = []
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('session.cwd', () => ({ value: '/home/user/Recherche-Emploi' }))
  on('ui.log', ($, e) => {
    lignes.push(e.text)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))
  on('model.complete', ($, e) => {
    juges.push(e.prompt)
    return {
      value: {
        isAnswered: true,
        text: typeof avis === 'string' ? avis : JSON.stringify(avis),
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    }
  })
  on('tool.call', { tool: 'AskUserQuestion' }, ($, e) => {
    const q = e.questions[0]?.question ?? ''
    questions.push(q)
    if (reponse === 'jamais') return new Promise(() => undefined)
    return { result: { questions: e.questions, answers: { [q]: reponse ?? '' } } }
  })
  on('turn.step', async function* ($, e) {
    vus.push(e.agentId === undefined ? { model: e.model, effort: e.effort } : { model: e.model, effort: e.effort, agentId: e.agentId })
    return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return { vus, questions, juges, lignes }
}

const SIMPLE = { famille: 'haiku', effort: 'low', raison: 'correction triviale' }

const envoyer = (
  $: any,
  text: string,
  kind: 'composer' | 'sdk' | 'unclassified' | 'scheduled-trigger' | 'task-notification' = 'composer',
) => $.prompt.submit({ text, wait: false, origin: { kind } })

const etape = async ($: any, e: { model: string; effort?: unknown; index?: number; agentId?: string }) => {
  const flux = $.turn.step({ turnId: 't1', messageCount: 1, index: 0, ...e })
  for await (const _ of flux) {
    // les morceaux de réponse ne comptent pas ici
  }
  return flux.result
}

describe('choix-modele', () => {
  test('recommandation acceptée : la session bascule et y reste', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'corrige la faute de frappe dans le README')
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh', index: 1 })
    expect(m.questions).toEqual(['Correction triviale : passer à Haiku · effort bas ?'])
    expect(m.vus).toEqual([
      { model: 'claude-haiku-5-5', effort: 'low' },
      { model: 'claude-haiku-5-5', effort: 'low' },
    ])
    expect(m.lignes).toEqual(['choix-modele : session passée sur Haiku · effort bas. /model ou /effort pour changer encore.'])
  })

  test('déjà le bon réglage : aucune question', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'corrige la faute de frappe')
    await etape($, { model: 'claude-haiku-5-5', effort: 'low' })
    expect(m.questions).toEqual([])
    expect(m.lignes).toEqual(['choix-modele : Haiku · effort bas convient (correction triviale).'])
    expect(m.vus).toEqual([{ model: 'claude-haiku-5-5', effort: 'low' }])
  })

  test('« Garder » : rien ne change', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Garder Opus · effort très élevé' })
    await envoyer($, 'corrige la faute de frappe')
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    expect(m.questions.length).toBe(1)
    expect(m.vus).toEqual([{ model: 'claude-opus-5-5', effort: 'xhigh' }])
  })

  test('réponse libre : « sonnet élevé »', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'plutôt sonnet élevé' })
    await envoyer($, 'corrige la faute de frappe')
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    expect(m.vus).toEqual([{ model: 'claude-sonnet-5-5', effort: 'high' }])
  })

  test('même famille : la version de la session est gardée, seul l’effort change', async ($, on) => {
    const m = monde(on, { avis: { famille: 'opus', effort: 'high', raison: 'conception' }, reponse: 'Passer à Opus · effort élevé' })
    await envoyer($, 'conçois le nouveau module')
    await etape($, { model: 'claude-opus-5', effort: 'medium' })
    expect(m.vus).toEqual([{ model: 'claude-opus-5', effort: 'high' }])
  })

  test('une seule fois par session', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Garder Opus · effort élevé' })
    await envoyer($, 'premier')
    await etape($, { model: 'claude-opus-5-5', effort: 'high' })
    await envoyer($, 'second')
    await etape($, { model: 'claude-opus-5-5', effort: 'high' })
    expect(m.juges.length).toBe(1)
    expect(m.questions.length).toBe(1)
  })

  test('message d’une routine : pas de jugement', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'tâche planifiée', 'scheduled-trigger')
    await etape($, { model: 'claude-opus-5-5', effort: 'high' })
    expect(m.juges).toEqual([])
    expect(m.vus).toEqual([{ model: 'claude-opus-5-5', effort: 'high' }])
  })

  test('consigne d’une session lancée par /dispatch : pas de jugement', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'traite l’item 3 du backlog', 'task-notification')
    await etape($, { model: 'claude-opus-5-5', effort: 'high' })
    expect(m.juges).toEqual([])
  })

  test('session ouverte par une consigne automatique : le message suivant n’est pas jugé', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'traite l’item 3 du backlog', 'task-notification')
    await etape($, { model: 'claude-opus-5-5', effort: 'high' })
    await envoyer($, 'au fait, corrige aussi la faute de frappe')
    await etape($, { model: 'claude-opus-5-5', effort: 'high' })
    expect(m.juges).toEqual([])
    expect(m.questions).toEqual([])
  })

  test('message sans étiquette (session Cloud) : jugé', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'corrige la faute de frappe', 'unclassified')
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    expect(m.vus).toEqual([{ model: 'claude-haiku-5-5', effort: 'low' }])
  })

  test('les sous-agents ne sont pas touchés', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'corrige la faute de frappe')
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    await etape($, { model: 'claude-sonnet-5-5', effort: 'medium', agentId: 'a1' })
    expect(m.vus[1]).toEqual({ model: 'claude-sonnet-5-5', effort: 'medium', agentId: 'a1' })
  })

  test('un /model tapé ensuite reprend la main', async ($, on) => {
    const m = monde(on, { avis: SIMPLE, reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'corrige la faute de frappe')
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    await etape($, { model: 'claude-sonnet-5-5', effort: 'xhigh', index: 1 })
    await etape($, { model: 'claude-sonnet-5-5', effort: 'xhigh', index: 2 })
    expect(m.vus.slice(1)).toEqual([
      { model: 'claude-sonnet-5-5', effort: 'xhigh' },
      { model: 'claude-sonnet-5-5', effort: 'xhigh' },
    ])
  })

  test('juge illisible : la session part telle quelle, sans question', async ($, on) => {
    const m = monde(on, { avis: 'je ne sais pas', reponse: 'Passer à Haiku · effort bas' })
    await envoyer($, 'corrige la faute de frappe')
    await etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    expect(m.questions).toEqual([])
    expect(m.vus).toEqual([{ model: 'claude-opus-5-5', effort: 'xhigh' }])
  })

  test('personne ne répond : au bout du délai, on garde le réglage', async ($, on) => {
    const horloge = mock.clock(on)
    const m = monde(on, { avis: SIMPLE, reponse: 'jamais' })
    await envoyer($, 'corrige la faute de frappe', 'sdk')
    const fin = etape($, { model: 'claude-opus-5-5', effort: 'xhigh' })
    for (let i = 0; i < 50 && m.questions.length === 0; i++) await Promise.resolve()
    await horloge.advance(90_000)
    await fin
    expect(m.questions.length).toBe(1)
    expect(m.lignes.some(l => l.includes('pas de réponse'))).toBe(true)
    expect(m.vus).toEqual([{ model: 'claude-opus-5-5', effort: 'xhigh' }])
  })
})

describe('règles', () => {
  test('lireAvis', () => {
    expect(lireAvis('{"famille":"opus","effort":"high","raison":"refonte large."}')).toEqual({
      famille: 'opus',
      effort: 'high',
      raison: 'refonte large',
    })
    expect(lireAvis('Voici : {"famille":"sonnet","effort":"medium","raison":"x"} fin')?.famille).toBe('sonnet')
    expect(lireAvis('{"famille":"fable","effort":"high","raison":"x"}')).toBeUndefined()
    expect(lireAvis('{"famille":"opus","effort":"max","raison":"x"}')).toBeUndefined()
    expect(lireAvis('{"famille":"gpt","effort":"high"}')).toBeUndefined()
    expect(lireAvis('pas de json')).toBeUndefined()
  })

  test('lireReponse', () => {
    expect(lireReponse('opus très élevé')).toEqual({ famille: 'opus', effort: 'xhigh' })
    expect(lireReponse('Sonnet')).toEqual({ famille: 'sonnet', effort: undefined })
    expect(lireReponse('effort bas')).toEqual({ famille: undefined, effort: 'low' })
    expect(lireReponse('haiku medium')).toEqual({ famille: 'haiku', effort: 'medium' })
    expect(lireReponse('opus élevé')).toEqual({ famille: 'opus', effort: 'high' })
  })

  test('dejaBon', () => {
    const avis = { famille: 'sonnet', effort: 'medium', raison: '' } as const
    expect(dejaBon({ model: 'claude-sonnet-5-5', effort: 'medium' }, avis)).toBe(true)
    expect(dejaBon({ model: 'claude-sonnet-5-5', effort: 'high' }, avis)).toBe(false)
    expect(dejaBon({ model: 'claude-opus-5-5', effort: 'medium' }, avis)).toBe(false)
    expect(dejaBon({ model: 'claude-sonnet-5-5' }, avis)).toBe(true)
  })
})
