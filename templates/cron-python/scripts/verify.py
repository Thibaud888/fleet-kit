#!/usr/bin/env python3
"""Vérification d'un script planifié Python : lint + tests + dry-run si disponible.

Usage : python scripts/verify.py  (la session Claude doit le lancer avant de conclure)

Convention flotte : le script principal accepte --dry-run (pas d'envoi de mail,
pas de publication) pour pouvoir être vérifié sans effet de bord.
"""
import glob
import os
import subprocess
import sys

def run(cmd: list[str]) -> None:
    print(f"$ {' '.join(cmd)}")
    if subprocess.run(cmd).returncode != 0:
        print(f"VERIFY ÉCHEC : {cmd[0]}", file=sys.stderr)
        sys.exit(1)

def has_ruff_config() -> bool:
    if os.path.exists("ruff.toml"):
        return True
    try:
        with open("pyproject.toml", encoding="utf8") as f:
            return "[tool.ruff]" in f.read()
    except OSError:
        return False

if has_ruff_config():
    run([sys.executable, "-m", "ruff", "check", "."])

if os.path.isdir("tests") or glob.glob("test_*.py"):
    run([sys.executable, "-m", "pytest", "-q"])

main_script = next((m for m in ("main.py", "run.py") if os.path.exists(m)), None)
if main_script:
    run([sys.executable, main_script, "--dry-run"])

print("VERIFY OK.")
