#!/usr/bin/env node
// Hook SessionStart du kit de flotte : en session Cloud, recopie les mods du dépôt
// (`.claude/skills/<nom>/` portant un `.claude-plugin/plugin.json`) dans `~/.claude/skills/`.
//
// Pourquoi : une session Cloud ne charge PAS les plugins d'un dépôt (dossier jamais
// « approuvé » : « project-scope directory … skipped because this workspace was not
// trusted »), mais charge ceux du dossier personnel — et le fait APRÈS les hooks
// SessionStart. Constaté le 2026-10-13 sur deux sessions de test (Recherche-Emploi).
// En local, rien à faire : le dossier du dépôt est approuvé et le mod s'y charge tel quel.
//
// Posé et tenu à jour par le kit (fleet-kit/templates/common/.claude/hooks/) ; ne jamais
// faire échouer le démarrage : toute erreur est avalée.
import { cpSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

try {
  if (process.env.CLAUDE_CODE_REMOTE === "true") {
    const source = join(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), ".claude", "skills");
    const cible = join(homedir(), ".claude", "skills");
    for (const nom of existsSync(source) ? readdirSync(source) : []) {
      if (existsSync(join(source, nom, ".claude-plugin", "plugin.json"))) {
        cpSync(join(source, nom), join(cible, nom), { recursive: true, force: true });
      }
    }
  }
} catch {
  // Un mod absent ne doit jamais empêcher la session de démarrer.
}
