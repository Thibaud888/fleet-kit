# Backlog

> 1 item = 1 session Claude (issue labellisée `claude` ou session Cloud) = 1 PR.
> Cocher + lien PR quand c'est mergé. `/dispatch` et `/backlog` (claude-ops) lisent ce fichier.
> Priorité optionnelle en tête d'item : `(P1)` urgent · `(P2)` important · `(P3)` un jour.

- [ ] (P2) Propagation automatique des mises à jour du kit vers la flotte — aujourd'hui un bump de VERSION ici laisse les repos équipés en arrière (dérive seulement signalée par l'hygiène hebdo) jusqu'à un `/equiper` manuel par repo. Étudier un mécanisme de propagation : workflow de release sur fleet-kit qui, au bump de VERSION, ouvre 1 PR d'upgrade par repo actif du registre (précédent : upgrade v1.2.0 scripté en 1 commit/repo via l'API Git Data, cf. claude-ops chantier G3) ; alternatives à comparer : étendre l'hygiène hebdo pour ouvrir les PR, ou déclencher une session `/equiper` par repo. Prérequis probable : secret cross-repo `FLEET_GH_TOKEN` (déjà identifié comme manquant pour codex-cadrage). DoD : décision documentée dans le README + mécanisme en place, ou découpage en items d'implémentation.
