// Contrat d'état du mod choix-modele (autonome : aucun import autorisé ici).

export type Niveau = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

// Le réglage d'une session tel que le moteur le donne : un id de modèle, un effort
// (niveau, budget chiffré, ou absent pour un modèle qui n'en prend pas).
export type Reglage = { model: string; effort?: Niveau | number }

// Ce que le mod retient pour la session en cours.
export type Choix = {
  // Le réglage envoyé à l'API à chaque requête de la boucle principale.
  applique: Reglage
  // Le réglage de la session au moment du choix : s'il change ensuite (/model, /effort,
  // repli automatique), c'est que quelqu'un d'autre a tranché, et le mod s'efface.
  base: Reglage
}

declare module 'claude-code' {
  interface PluginState {
    'choix-modele': {
      // « a-juger » : le premier message est arrivé ; « tranche » : on ne redemande plus.
      etat: 'a-juger' | 'tranche'
      tache: string | null
      choix: Choix | null
    }
  }
}
