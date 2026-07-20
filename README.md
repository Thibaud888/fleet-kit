# fleet-kit — le kit de flotte

> Workflows GitHub **réutilisables** + **templates** pour tous mes repos, présents et futurs.
> Ce repo est **public** (les repos publics ne peuvent pas appeler de workflow privé) et ne
> contient **aucune donnée personnelle** : uniquement de l'outillage générique.
> Pilotage : `Thibaud888/claude-ops` (privé) — registre `fleet/fleet.json`, skills `/equiper`, `/dispatch`.

## Principe

Chaque repo de la flotte ne contient que des **stubs de 5 lignes** qui appellent les workflows
d'ici (`uses: Thibaud888/fleet-kit/.github/workflows/<x>.yml@main`). Améliorer un workflow ici
= toute la flotte upgradée instantanément. La version du kit installée dans un repo est notée
dans son fichier `.kit-version` ; l'écart avec [`VERSION`](VERSION) est signalé chaque semaine
par `claude-ops/scripts/hygiene.ps1` (dérive de flotte) et **résorbé automatiquement chaque
lundi** pour les fichiers possédés par le kit (skills de session + `.kit-version`) par le
workflow `kit-propagation` de claude-ops (`scripts/kit-propager.mjs`, 0 token). `/equiper`
reste le geste du premier équipement et des fusions à jugement (CLAUDE.md, allowlist, stubs).

## Workflows réutilisables (`.github/workflows/`)

| Workflow | Rôle | Modèle par défaut |
|---|---|---|
| `map.yml` | Régénère `MAP.md` (carte du repo pour les sessions Claude) à chaque push sur main | Haiku |
| `dispatch.yml` | Issue labellisée `claude` ou commentaire `@claude` → session Claude → PR → **merge auto si CI verte** | Sonnet ; labels `claude:haiku` / `claude:opus` / `claude:fable` pour forcer un autre modèle |
| `pr-ready.yml` | Sort du brouillon (draft) les PR `claude/*` à l'ouverture → mergeables direct | — |
| `self-heal.yml` | Cron en échec → issue avec logs + notification ntfy + session Claude de diagnostic/fix → **merge auto si CI verte** | Sonnet |
| `ci-node.yml` | CI standard Node (lint/test/build `--if-present`) | — |
| `ci-python.yml` | CI standard Python (ruff/pytest si présents) | — |
| `pages.yml` | Build + déploiement GitHub Pages | — |

Action composite : [`actions/notify`](actions/notify/action.yml) — notification ntfy + ping Healthchecks.

## Merge automatique des PR (depuis v1.1.0)

`dispatch.yml` et `self-heal.yml` **mergent (squash) la PR dès que sa CI est verte** — plus
d'attente de relecture humaine par défaut. Trois filets de sécurité, jamais de merge à l'aveugle :
- **CI rouge** → la PR reste ouverte, commentée, pas de merge.
- **Repo sans CI** (depuis v1.4.0) → le merge auto exige une section `## Vérification`
  (commande + résultat) dans le corps de la PR ; sans elle, la PR attend (avant, « sans CI »
  mergait immédiatement, c'est-à-dire à l'aveugle).
- **Fichier `.claude/no-auto-merge`** (vide) à la racine du repo → désactive l'auto-merge sur
  ce repo précis et force la relecture humaine ; à poser/retirer à la main à tout moment, ou au
  choix à la création du repo (`/nouveau-projet`).

Note sur les **PR en brouillon (draft)** : une PR draft ne peut pas être mergée (GitHub renvoie
405 sur le bouton « Merger »). Les sessions flotte (`@claude`/label) créent des PR **prêtes** ;
les sessions Claude Code web / FleetView les ouvrent en **draft** par consigne du harnais.

⚠️ **Limite connue, non contournée** (constatée les 2026-07-14/15, réexaminée le 2026-07-20) :
la mutation `markPullRequestReadyForReview` est **refusée au `GITHUB_TOKEN`** d'Actions
(« Resource not accessible by integration »). Donc `pr-ready.yml` **échoue** sur une vraie PR
draft, et l'appel `gh pr ready` des étapes d'auto-merge n'est **pas** le filet de sécurité qu'il
paraissait : jusqu'au 2026-07-20 son échec était masqué (`2>/dev/null || true`), le merge partait
quand même, se prenait un 405, et `continue-on-error` rendait le run **vert** — PR non mergée,
personne averti. Depuis, `dispatch.yml` et `self-heal.yml` **rendent le blocage visible** :
détection du draft, tentative non masquée, puis commentaire sur la PR + `::warning::` et arrêt
propre au lieu d'un merge dans le vide. **Une PR draft demande donc un geste humain**
(« Ready for review » puis merge) — mais on le sait au lieu de le découvrir.
Correctif complet possible (PAT `FLEET_GH_TOKEN` cross-repo au lieu du `github.token`) écarté
sciemment : il imposerait le secret sur toute la flotte, un changement de stubs et un bump de
kit, pour un cas qui ne s'est plus produit depuis le 2026-07-15.

## Auth Claude dans Actions (secrets à poser par `/equiper`)

1. **`CLAUDE_CODE_OAUTH_TOKEN`** (préféré) : généré par `claude setup-token`, couvert par
   l'abonnement Claude → coût API ≈ 0.
2. Repli **`ANTHROPIC_API_KEY`** : clé API avec **plafond de dépense 5 €/mois** dans la console Anthropic.

Autres secrets : `NTFY_TOPIC` (notifications), `HEALTHCHECK_URL_<CRON>` (pings).

## Garde-fous (sécurité & coût)

- Déclenchement Claude restreint à `github.actor == 'Thibaud888'` — **indispensable sur les repos publics**
  (une issue malveillante ne doit jamais déclencher une session ; cf. faille corrigée en claude-code-action v1.0.94).
- `--max-turns` plafonné partout ; concurrence 1 run Claude par repo.
- **Sortie réseau des sessions** : `WebFetch` (lecture seule) est autorisé dans `dispatch.yml` et
  `self-heal.yml` depuis le 2026-07-20 — sans lui, aucune session dispatchée ne pouvait atteindre
  une source web et **tout item de scraping était non dispatchable** (vécu sur
  activites-vallauriennes#16 : arrêt après 30 tours, ~0,62 $, rien produit). Ce n'est pas une
  capacité nouvelle : `Bash(node:*)` autorisait déjà `node -e "fetch(...)"` — l'allowlist était
  *incohérente*, pas fermée. `gh workflow run` / `gh run` restent **hors** de `dispatch.yml`
  (surface trop large sur un repo public) ; `self-heal.yml` garde `gh run` pour lire ses propres
  logs de cron. Le vrai garde-fou reste le déclenchement, verrouillé sur `github.actor`.
- MAP.md : Haiku uniquement, skip si le push ne touche que `MAP.md`, commit `[skip ci]`.
- Les gros items partent en session Cloud d'abonnement (via `/dispatch` de claude-ops), pas en API.

## Templates (`templates/`)

- `common/` : CLAUDE.md (modèle), BACKLOG.md, `.claude/settings.json` (allowlist), dependabot,
  stubs `map.yml` / `claude.yml` / `self-heal.yml` / `pr-ready.yml`, et les skills de session
  `.claude/skills/` (`/backlog` mono-repo, `/bilan`, `/handoff`, `/reprends`) — versionnées
  avec le repo, donc disponibles y compris en **session Cloud** (téléphone / autre PC).
- `static/` (GitHub Pages), `service-node/` (Render/serveur), `cron-python/` (script planifié), `lib/`.

Installés/rafraîchis par la skill **`/equiper <repo>`** (sans écraser l'existant) ; les nouveaux
projets passent par **`/nouveau-projet`** qui appelle `/equiper`.

## Versionnage

`VERSION` suit semver. Bump **mineur** = nouveaux templates/workflows (dérive signalée, upgrade
via `/equiper`), bump **majeur** = changement cassant des stubs (les repos doivent être ré-équipés).

> **2026-07-20, sans bump de VERSION** — `WebFetch` ouvert aux sessions + blocage des PR draft
> rendu visible (`dispatch.yml`, `self-heal.yml`). Effet **immédiat sur toute la flotte** via
> `@main`. Pas de bump délibérément : aucun template ni skill n'a changé, donc rien à
> ré-équiper — bumper aurait seulement fait ouvrir à `kit-propagation` une douzaine de PR
> ne touchant que la ligne `.kit-version`, du bruit pour rien. Règle retenue : **on bumpe quand
> un repo doit recevoir quelque chose, pas quand un workflow appelé en `@main` change.**
>
> Statut : **v1.4.0** (2026-07-19) — merge auto durci : un repo **sans CI** n'auto-merge plus
> à l'aveugle, la PR doit porter une section `## Vérification` (dispatch.yml + self-heal.yml,
> effet immédiat sur toute la flotte via `@main` ; templates : CLAUDE.md.tpl, /bilan, /handoff
> — propagés au prochain `/equiper`). Décisions issues de l'audit des consignes
> (`claude-ops/rapport/challenge-consignes-2026-07-19.md`).
> v1.3.0 — skill **`/backlog` mono-repo** ajoutée à `templates/common/.claude/skills/`
> le 2026-07-17 : consulter/traiter/gérer le `BACKLOG.md` du repo courant depuis une session
> Cloud (la vue flotte multi-repo reste la skill de claude-ops, qui prime en session locale).
> v1.2.0 (2026-07-15) : skills de session `/bilan`, `/handoff`, `/reprends` dans
> `templates/common/` — chaque repo équipé les embarque, donc disponibles en session Cloud.
> v1.1.0 (2026-07-11) : merge auto des PR (`dispatch.yml`/`self-heal.yml`), par-dessus le kit
> initial du chantier D1 (2026-07-04).
