# CLAUDE.md — {{NOM}}

> {{QUOI_EN_UNE_PHRASE}}

## Règles de travail (flotte)
- **Lis `MAP.md` avant toute exploration** ; n'explore que ce qu'elle ne couvre pas.
- **Aucune session ne rend la main sans avoir vérifié** : lance `{{COMMANDE_VERIFY}}`
  (ou build + tests) et regarde le résultat avant de conclure.
- Branche + PR, **jamais de push direct sur `main`**. Commits **en français**.
- **La PR se merge automatiquement dès que la CI est verte** (pas d'attente de relecture par
  défaut). CI rouge → PR laissée ouverte, jamais mergée à l'aveugle. Pour forcer la relecture
  humaine sur CE repo : créer un fichier vide `.claude/no-auto-merge`.
- 1 session = 1 item de `BACKLOG.md` = 1 PR ; mets à jour `BACKLOG.md` en fin de session.
- 3e récurrence d'une même tâche → écris un script réutilisable (`scripts/`), pas juste le résultat.

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
