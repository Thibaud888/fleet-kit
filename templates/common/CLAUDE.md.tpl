# CLAUDE.md — {{NOM}}

> {{QUOI_EN_UNE_PHRASE}}

## Règles de travail (flotte)
- **Lis `MAP.md` avant toute exploration** ; n'explore que ce qu'elle ne couvre pas.
- **Aucune session ne rend la main sans avoir vérifié** : lance `{{COMMANDE_VERIFY}}`
  (ou build + tests) et regarde le résultat avant de conclure.
- **Branche + PR** — jamais de push direct sur `main`. Commits **en français**.
- **La PR se merge automatiquement dès que la CI est verte** (pas d'attente de relecture par
  défaut). CI rouge → PR laissée ouverte, jamais mergée à l'aveugle. **Repo sans CI** : le
  merge auto exige une section `## Vérification` (commande + résultat) dans le corps de la PR.
  Pour forcer la relecture humaine sur CE repo : créer un fichier vide `.claude/no-auto-merge`.
- **1 session = 1 item = 1 PR** — un item de `BACKLOG.md` par session ; mets à jour
  `BACKLOG.md` en fin de session.
- **Règle du clair** — Thibaud n'est pas technicien quand il te lit (souvent depuis son
  téléphone). Ce qui lui est destiné se comprend sans jargon ; la technique n'est pas retirée,
  elle passe **après**.
  - **Item de backlog** (`titre — contexte/DoD`) : le titre dit ce que ça change pour lui, en
    français courant — pas de nom de fichier ou de fonction, pas de sigle, pas d'anglicisme non
    traduit. Le jargon vit **après le tiret**, aussi précis que nécessaire.
  - **Question** : UNE seule à la fois, ouverte par une ligne en clair (le choix vu de son
    côté), puis un bloc `**Options :**` de 2 à 4 réponses numérotées (une ligne, < 140
    caractères) décrites par leur **conséquence** — ce qu'il verra, ce que ça coûte — et non par
    leur mécanisme, puis `**Recommandation :** option N — pourquoi`. Détail technique en repli
    `<details>` sous la question, jamais au-dessus. Il répond par un simple numéro.
  - Test : si quelqu'un qui ne code pas ne peut pas choisir en lisant la partie haute, c'est raté.
- **Écris l'outil, pas l'output** — à la 3e récurrence d'une même tâche, écris un script
  réutilisable (`scripts/`), pas juste le résultat.

## Stack & commandes
- Stack : {{STACK}}
- Dev : `{{CMD_DEV}}`
- Test : `{{CMD_TEST}}`
- Build : `{{CMD_BUILD}}`
- Déploiement : {{DEPLOIEMENT}}

## Architecture (5-10 lignes)
{{ARCHITECTURE}}

## Pièges connus
{{PIEGES}}
