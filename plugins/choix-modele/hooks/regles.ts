// Règles pures du mod choix-modele : barème du juge, lecture de son avis et de la réponse
// de Thibaud, libellés. Aucun appel au moteur ici, pour que tout se teste à part.

import type { Niveau, Reglage } from '../types'

export type { Niveau, Reglage }
export type Famille = 'haiku' | 'sonnet' | 'opus' | 'fable'

// Identifiant complet envoyé à l'API : la réécriture d'une requête (`turn.step`) ne résout
// pas les alias (« haiku » seul → 404, constaté le 2026-10-13). À mettre à jour quand une
// nouvelle génération sort. Une session déjà sur la bonne famille garde son propre id.
export const MODELES: Record<Famille, string> = {
  haiku: 'claude-haiku-5-5',
  sonnet: 'claude-sonnet-5-5',
  opus: 'claude-opus-5-5',
  fable: 'claude-fable-5-1',
}

const FAMILLES = Object.keys(MODELES) as Famille[]
const NIVEAUX: readonly Niveau[] = ['low', 'medium', 'high', 'xhigh', 'max']

const NOM: Record<Famille, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus', fable: 'Fable' }
const EFFORT: Record<Niveau, string> = {
  low: 'bas',
  medium: 'moyen',
  high: 'élevé',
  xhigh: 'très élevé',
  max: 'maximum',
}

// Ce que le juge recommande.
export type Avis = { famille: Famille; effort: Niveau; raison: string }

export const familleDe = (model: string): Famille | undefined =>
  FAMILLES.find(f => model.toLowerCase().includes(f))

const estNiveau = (v: unknown): v is Niveau => typeof v === 'string' && NIVEAUX.includes(v as Niveau)

export const libelle = (r: Reglage): string => {
  const f = familleDe(r.model)
  const nom = f ? NOM[f] : r.model
  if (r.effort === undefined) return nom
  return `${nom} · effort ${typeof r.effort === 'number' ? r.effort : EFFORT[r.effort]}`
}

export const libelleAvis = (a: Avis): string => `${NOM[a.famille]} · effort ${EFFORT[a.effort]}`

// « Déjà bon » = même famille et même effort. Un effort absent (modèle sans réglage
// d'effort) compte comme bon : il n'y a rien à changer de ce côté.
export const dejaBon = (actuel: Reglage, avis: Avis): boolean =>
  familleDe(actuel.model) === avis.famille && (actuel.effort === undefined || actuel.effort === avis.effort)

// Le réglage à appliquer pour suivre un avis : on garde l'id de la session quand la
// famille est déjà la bonne (elle peut être sur une autre version que la table).
export const cible = (actuel: Reglage, f: Famille, effort: Niveau | number | undefined): Reglage => ({
  model: familleDe(actuel.model) === f ? actuel.model : MODELES[f],
  effort,
})

export const SYSTEME = `Tu choisis le modèle Claude et l'effort de raisonnement les plus adaptés à une tâche
de développement, avant qu'elle ne commence. Objectif : la qualité nécessaire, sans gaspiller
(le quota est partagé ; un modèle trop gros pour une tâche simple est du gaspillage, un modèle
trop petit pour une tâche difficile coûte une session ratée).

Barème :
- haiku + low : question rapide, correction triviale (faute de frappe, renommage, mise en forme),
  commande unique, lecture ou résumé court.
- sonnet + medium : tâche courante bien délimitée : petit correctif localisé, petite
  fonctionnalité, documentation, script simple, mise à jour d'un backlog.
- sonnet + high : tâche moyenne sur plusieurs fichiers, débogage ordinaire, écriture de tests.
- opus + high : tâche complexe ou ambiguë : conception, refactorisation large, débogage
  difficile, analyse approfondie, rédaction exigeante, décision d'architecture.
- opus + xhigh : tâche très complexe, risquée ou critique : sécurité, migration, chantier
  multi-dépôts, recherche longue, plan d'ensemble.
N'utilise jamais "fable" ni "max" : ils sont réservés à une demande explicite.
Dans le doute entre deux lignes, prends la plus économe.

Réponds UNIQUEMENT par un objet JSON sur une ligne :
{"famille":"haiku|sonnet|opus","effort":"low|medium|high|xhigh","raison":"<6 à 12 mots en français, ce qui rend la tâche simple ou difficile>"}`

const LONGUEUR_MAX = 6000

export const promptJuge = (tache: string, repo: string): string => {
  const t = tache.length > LONGUEUR_MAX ? `${tache.slice(0, LONGUEUR_MAX)}\n[…tronqué]` : tache
  return `Dépôt : ${repo}\n\nPremier message de la session :\n<<<\n${t}\n>>>`
}

// L'avis du juge, ou undefined s'il est illisible (le mod se tait alors).
export const lireAvis = (texte: string): Avis | undefined => {
  const brut = texte.match(/\{[\s\S]*\}/)?.[0]
  if (!brut) return undefined
  let v: unknown
  try {
    v = JSON.parse(brut)
  } catch {
    return undefined
  }
  if (typeof v !== 'object' || v === null) return undefined
  const o = v as Record<string, unknown>
  const famille = typeof o.famille === 'string' ? familleDe(o.famille) : undefined
  if (!famille || famille === 'fable' || !estNiveau(o.effort) || o.effort === 'max') return undefined
  const raison = typeof o.raison === 'string' ? o.raison.trim().replace(/[.\s]+$/, '').slice(0, 120) : ''
  return { famille, effort: o.effort, raison }
}

// Réponse tapée sous « Autre » : « opus élevé », « sonnet », « effort bas »…
// Ce qui n'est pas cité reste tel quel. Les variantes longues avant les courtes
// (« très élevé » avant « élevé »).
const MOTS_EFFORT: readonly [RegExp, Niveau][] = [
  [/\b(xhigh|x-high)\b|tr[eè]s\s+(?:[ée]lev[ée]|haut)/i, 'xhigh'],
  [/\bmax(?:imum|imal)?\b/i, 'max'],
  [/\b(low|bas|faible|minimum)\b/i, 'low'],
  [/\b(medium|moyen|normal)\b/i, 'medium'],
  [/\bhigh\b|[ée]lev[ée]|\bhaut\b/i, 'high'],
]

export const lireReponse = (texte: string): { famille?: Famille; effort?: Niveau } => ({
  famille: familleDe(texte),
  effort: MOTS_EFFORT.find(([re]) => re.test(texte))?.[1],
})
