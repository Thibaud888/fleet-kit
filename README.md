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
par `claude-ops/scripts/hygiene.ps1` (dérive de flotte).

## Workflows réutilisables (`.github/workflows/`)

| Workflow | Rôle | Modèle par défaut |
|---|---|---|
| `map.yml` | Régénère `MAP.md` (carte du repo pour les sessions Claude) à chaque push sur main | Haiku |
| `dispatch.yml` | Issue labellisée `claude` ou commentaire `@claude` → session Claude → PR → **merge auto si CI verte** | Sonnet (`claude:haiku` pour forcer Haiku) |
| `self-heal.yml` | Cron en échec → issue avec logs + notification ntfy + session Claude de diagnostic/fix → **merge auto si CI verte** | Sonnet |
| `ci-node.yml` | CI standard Node (lint/test/build `--if-present`) | — |
| `ci-python.yml` | CI standard Python (ruff/pytest si présents) | — |
| `pages.yml` | Build + déploiement GitHub Pages | — |

Action composite : [`actions/notify`](actions/notify/action.yml) — notification ntfy + ping Healthchecks.

## Merge automatique des PR (depuis v1.1.0)

`dispatch.yml` et `self-heal.yml` **mergent (squash) la PR dès que sa CI est verte** — plus
d'attente de relecture humaine par défaut. Un repo sans CI configurée merge immédiatement
(rien à attendre). Deux filets de sécurité, jamais de merge à l'aveugle :
- **CI rouge** → la PR reste ouverte, commentée, pas de merge.
- **Fichier `.claude/no-auto-merge`** (vide) à la racine du repo → désactive l'auto-merge sur
  ce repo précis et force la relecture humaine ; à poser/retirer à la main à tout moment, ou au
  choix à la création du repo (`/nouveau-projet`).

## Auth Claude dans Actions (secrets à poser par `/equiper`)

1. **`CLAUDE_CODE_OAUTH_TOKEN`** (préféré) : généré par `claude setup-token`, couvert par
   l'abonnement Claude → coût API ≈ 0.
2. Repli **`ANTHROPIC_API_KEY`** : clé API avec **plafond de dépense 5 €/mois** dans la console Anthropic.

Autres secrets : `NTFY_TOPIC` (notifications), `HEALTHCHECK_URL_<CRON>` (pings).

## Garde-fous (sécurité & coût)

- Déclenchement Claude restreint à `github.actor == 'Thibaud888'` — **indispensable sur les repos publics**
  (une issue malveillante ne doit jamais déclencher une session ; cf. faille corrigée en claude-code-action v1.0.94).
- `--max-turns` plafonné partout ; concurrence 1 run Claude par repo.
- MAP.md : Haiku uniquement, skip si le push ne touche que `MAP.md`, commit `[skip ci]`.
- Les gros items partent en session Cloud d'abonnement (via `/dispatch` de claude-ops), pas en API.

## Templates (`templates/`)

- `common/` : CLAUDE.md (modèle), BACKLOG.md, `.claude/settings.json` (allowlist), dependabot,
  stubs `map.yml` / `claude.yml` / `self-heal.yml`.
- `static/` (GitHub Pages), `service-node/` (Render/serveur), `cron-python/` (script planifié), `lib/`.

Installés/rafraîchis par la skill **`/equiper <repo>`** (sans écraser l'existant) ; les nouveaux
projets passent par **`/nouveau-projet`** qui appelle `/equiper`.

## Versionnage

`VERSION` suit semver. Bump **mineur** = nouveaux templates/workflows (dérive signalée, upgrade
via `/equiper`), bump **majeur** = changement cassant des stubs (les repos doivent être ré-équipés).

> Statut : v1.0.0 posée par le chantier D1 (2026-07-04). `dispatch.yml` et `self-heal.yml`
> seront validés en conditions réelles par les chantiers D4/D5 (repo de test `test-fleet`).
