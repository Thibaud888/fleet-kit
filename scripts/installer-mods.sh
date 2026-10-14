#!/bin/bash
# Installe les mods du kit (plugins/<nom>/) dans ~/.claude/skills/<nom>/, où Claude Code les
# charge dans toute session, quel que soit le dépôt ouvert.
#
# Usage : le script d'installation de l'environnement Cloud (claude.ai → environnement →
# Edit → Setup script) clone ce dépôt et lance ce fichier :
#
#   rm -rf /opt/fleet-kit; git clone -q --depth 1 https://github.com/Thibaud888/fleet-kit /opt/fleet-kit \
#     && bash /opt/fleet-kit/scripts/installer-mods.sh || true
#
# Le Cloud garde le résultat en cache (≈ 7 jours, ou jusqu'à ce que le script de
# l'environnement change) : une nouvelle version d'un mod arrive au plus tard à la
# reconstruction suivante. Ne fait jamais échouer le démarrage : sortie 0 dans tous les cas.
set -u
SOURCE="$(cd "$(dirname "$0")/.." && pwd)/plugins"
CIBLE="${HOME}/.claude/skills"

mkdir -p "$CIBLE" || exit 0
for dossier in "$SOURCE"/*/; do
  [ -f "$dossier/.claude-plugin/plugin.json" ] || continue
  nom="$(basename "$dossier")"
  rm -rf "${CIBLE:?}/$nom"
  cp -r "$dossier" "$CIBLE/$nom" && rm -rf "$CIBLE/$nom/tests" && echo "mod installé : $nom"
done
exit 0
