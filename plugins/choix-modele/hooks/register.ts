// choix-modele — au premier message d'une session, un petit modèle juge la tâche et
// recommande un modèle + un effort. Déjà bons → rien à demander (une ligne discrète).
// Sinon → une question : passer au réglage recommandé, ou garder l'actuel.
//
// Le choix vaut pour la session seulement : chaque requête de la boucle principale est
// réécrite (`turn.step`), rien n'est écrit dans les réglages. Les sous-agents ne sont pas
// touchés. Un /model ou /effort tapé ensuite reprend la main : le mod s'efface.
//
// Source unique : Thibaud888/fleet-kit, plugins/choix-modele. Les copies posées dans
// `.claude/skills/choix-modele/` des repos de la flotte sont écrasées par le kit : modifier la source.
import type { EngineInterface, Register } from 'claude-code'

import type { Choix } from '../types'
import {
  type Avis,
  type Niveau,
  type Reglage,
  cible,
  dejaBon,
  libelle,
  libelleAvis,
  lireAvis,
  lireReponse,
  promptJuge,
  SYSTEME,
} from './regles'

const ETAT = { plugin: 'choix-modele', key: 'etat' } as const
const TACHE = { plugin: 'choix-modele', key: 'tache' } as const
const CHOIX = { plugin: 'choix-modele', key: 'choix' } as const

// Ce qui ne vient pas d'une personne ne déclenche rien : routine, notification (c'est par
// là qu'arrive la consigne d'une session lancée par /dispatch, constaté le 2026-10-13),
// autre session, relais. Liste d'exclusion plutôt qu'autorisation : le message d'une
// personne en session Cloud n'a pas d'étiquette garantie (« sdk », « bridge »…).
const AUTOMATIQUES = new Set([
  'task-notification',
  'scheduled-trigger',
  'peer',
  'peer-send-message',
  'projects-relay',
  'channel',
  'coordinator',
  'observer',
  'observer-activity',
  'auto-continuation',
  'plugin',
])

// Sans réponse dans ce délai (session lancée sans personne devant, /dispatch…), on garde
// le réglage actuel et la session part. Une réponse tardive s'applique encore à la suite.
const DELAI_MS = 90_000

const reglage = (model: string, effort: Niveau | number | undefined): Reglage =>
  effort === undefined ? { model } : { model, effort }

const nomDepot = async ($: EngineInterface): Promise<string> => {
  try {
    return (await $.session.cwd()).split('/').filter(Boolean).pop() ?? '?'
  } catch {
    return '?'
  }
}

// La question, ou undefined si personne ne répond à temps (ou ne peut répondre : -p).
// La réponse arrivée après le délai est passée à `tard`.
const demander = (
  $: EngineInterface,
  question: string,
  options: string[],
  signal: AbortSignal,
  tard: (reponse: string) => void,
): Promise<string | undefined> =>
  new Promise(resolve => {
    let fini = false
    const finir = (r: string | undefined) => {
      if (!fini) {
        fini = true
        minuteur.cancel()
        resolve(r)
      }
    }
    const minuteur = $.clock.after(DELAI_MS, () => finir(undefined))
    if (signal.aborted) return finir(undefined)
    signal.addEventListener('abort', () => finir(undefined))
    $.ui.ask(question, { header: 'Modèle', options }).then(
      r => (fini ? tard(r) : finir(r)),
      () => finir(undefined),
    )
  })

const appliquer = async ($: EngineInterface, actuel: Reglage, vise: Reglage) => {
  if (vise.model === actuel.model && vise.effort === actuel.effort) {
    $.ui.log(`choix-modele : on garde ${libelle(actuel)}.`)
    return
  }
  const choix: Choix = { applique: vise, base: actuel }
  await $.state.set(CHOIX, choix)
  $.ui.status(`${libelle(vise)} (choix-modele)`)
  $.ui.log(`choix-modele : session passée sur ${libelle(vise)}. /model ou /effort pour changer encore.`)
}

// Ce que la réponse veut dire : l'option recommandée, « garder », ou un texte libre.
const interpreter = (reponse: string, propose: string, actuel: Reglage, avis: Avis): Reglage => {
  if (reponse === propose) return cible(actuel, avis.famille, avis.effort)
  if (reponse.startsWith('Garder')) return actuel
  const lu = lireReponse(reponse)
  if (!lu.famille && !lu.effort) return actuel
  const base = lu.famille ? cible(actuel, lu.famille, actuel.effort) : actuel
  return reglage(base.model, lu.effort ?? actuel.effort)
}

const trancher = async ($: EngineInterface, actuel: Reglage, signal: AbortSignal) => {
  const { value: tache } = await $.state.get(TACHE)
  await $.state.set(TACHE, null)
  if (!tache?.trim()) return

  const juge = await $.model.complete({
    model: 'haiku',
    system: SYSTEME,
    prompt: promptJuge(tache, await nomDepot($)),
    maxTokens: 200,
    effort: 'low',
    timeoutMs: 20_000,
  })
  const avis = juge.isAnswered ? lireAvis(juge.text) : undefined
  if (!avis) return

  if (dejaBon(actuel, avis)) {
    $.ui.log(`choix-modele : ${libelle(actuel)} convient (${avis.raison}).`)
    return
  }

  const propose = `Passer à ${libelleAvis(avis)}`
  const garder = `Garder ${libelle(actuel)}`
  const motif = avis.raison ? `${avis.raison.charAt(0).toUpperCase()}${avis.raison.slice(1)} : ` : ''
  const question = `${motif}passer à ${libelleAvis(avis)} ?`
  const tard = (r: string) => {
    appliquer($, actuel, interpreter(r, propose, actuel, avis)).catch(() => undefined)
  }
  const reponse = await demander($, question, [propose, garder], signal, tard)
  if (reponse === undefined) {
    $.ui.log(`choix-modele : pas de réponse, on garde ${libelle(actuel)} (recommandé : ${libelleAvis(avis)}).`)
    return
  }
  await appliquer($, actuel, interpreter(reponse, propose, actuel, avis))
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    // Seul le tout premier message compte : une session ouverte par une consigne
    // automatique ne pose pas la question plus tard, en plein travail.
    const { value: etat } = await $.state.get(ETAT)
    if (etat === undefined) {
      if (AUTOMATIQUES.has(e.origin.kind)) {
        await $.state.set(ETAT, 'tranche')
      } else {
        await $.state.set(TACHE, e.text)
        await $.state.set(ETAT, 'a-juger')
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    // Les sous-agents gardent leur propre modèle.
    if (e.agentId !== undefined) return yield* next(e)

    const actuel = reglage(e.model, e.effort)
    const { value: etat } = await $.state.get(ETAT)
    if (etat === 'a-juger') {
      await $.state.set(ETAT, 'tranche')
      try {
        await trancher($, actuel, next.signal)
      } catch (err) {
        // Un juge en panne ne doit jamais bloquer la session : elle part telle quelle.
        $.ui.log(`choix-modele : ${String(err)}`, { to: 'debug' })
      }
    }

    const { value: choix } = await $.state.get(CHOIX)
    if (!choix) return yield* next(e)
    if (choix.base.model !== actuel.model || choix.base.effort !== actuel.effort) {
      await $.state.set(CHOIX, null)
      $.ui.status(undefined)
      return yield* next(e)
    }
    return yield* next({ ...e, model: choix.applique.model, effort: choix.applique.effort })
  })
}
