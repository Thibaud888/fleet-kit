# choix-modele — le bon modèle et le bon effort dès le premier message

À l'ouverture d'une session Claude Code, ton **premier message** est lu par un petit modèle
(Haiku, quelques centièmes de centime) qui juge la tâche et recommande un modèle et un effort :

- **déjà le bon réglage** → aucune question, juste une ligne discrète
  (`choix-modele : Sonnet · effort moyen convient (petit correctif localisé).`) ;
- **sinon** → une question : *« Correction triviale : passer à Haiku · effort bas ? »* avec
  deux réponses, **Passer à…** ou **Garder…** (ou une réponse libre : « opus élevé », « sonnet »…).

Le choix ne vaut **que pour la session** : rien n'est écrit dans tes réglages, la session
suivante repart de ton modèle habituel. Un `/model` ou `/effort` tapé ensuite reprend la main.

Sans réponse au bout de 90 secondes (session lancée sans personne devant, `/dispatch`…), la
session garde son réglage et part ; une réponse tardive s'applique encore à la suite.

## Où il tourne

Deux installations uniques couvrent tout, quel que soit le dépôt :

| Où | Installation (une seule fois) |
|---|---|
| **Sessions Cloud** (tous les dépôts) | Script d'installation de l'environnement (claude.ai → menu de l'environnement → *Edit* → *Setup script*) : `rm -rf /opt/fleet-kit; git clone -q --depth 1 https://github.com/Thibaud888/fleet-kit /opt/fleet-kit && bash /opt/fleet-kit/scripts/installer-mods.sh \|\| true` |
| **Sessions locales** (tous les dossiers) | `claude plugin marketplace add Thibaud888/fleet-kit` puis `claude plugin install choix-modele@fleet-kit` |

Mises à jour : en Cloud, le résultat du script est gardé en cache environ 7 jours, et une
nouvelle version arrive à la reconstruction suivante. En local, `claude plugin update
choix-modele@fleet-kit`, ou la mise à jour automatique activée dans `/plugin` → *Marketplaces*.

En complément, `kit-propager` pose une copie dans `.claude/skills/choix-modele/` des dépôts
équipés du kit, avec le hook `.claude/hooks/mods-cloud.mjs`. Ce hook la recopie au démarrage
dans `~/.claude/skills/` en Cloud, car une session Cloud **ignore** les plugins d'un dépôt
(dossier jamais « approuvé »), constaté le 2026-10-13. Avec les deux installations ci-dessus,
cette copie n'est plus indispensable.

## Comment il marche

- `prompt.submit` retient le premier message d'une personne (clavier, appli, hôte SDK) ;
  routines, notifications et messages d'autres sessions ne déclenchent rien.
- `turn.step` (première requête) : jugement, comparaison, question si besoin ; ensuite chaque
  requête de la boucle principale part avec le réglage choisi. Les sous-agents ne sont pas touchés.
- La réécriture exige un **id complet** (`claude-opus-5-5`) : l'alias seul (`opus`) est refusé
  par l'API. La table est dans `hooks/regles.ts` (`MODELES`) — à mettre à jour à chaque
  nouvelle génération de modèles. Le barème du juge est au même endroit (`SYSTEME`).

## Vérifier

```bash
claude plugin validate plugins/choix-modele
claude plugin test plugins/choix-modele      # 17 cas : bascule, déjà bon, garder, délai, messages automatiques…
```
