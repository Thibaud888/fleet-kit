# Vérification d'un script planifié Python : lint + tests + dry-run si disponible.
# Usage : pwsh scripts/verify.ps1  (la session Claude doit le lancer avant de conclure)
$ErrorActionPreference = "Stop"

if ((Test-Path "ruff.toml") -or (Select-String -Path "pyproject.toml" -Pattern "\[tool\.ruff\]" -Quiet -ErrorAction SilentlyContinue)) {
    Write-Host "$ ruff check ."
    ruff check .
    if ($LASTEXITCODE -ne 0) { Write-Error "VERIFY ÉCHEC : ruff" ; exit 1 }
}

if ((Test-Path "tests") -or (Get-ChildItem -Filter "test_*.py" -ErrorAction SilentlyContinue)) {
    Write-Host "$ pytest -q"
    pytest -q
    if ($LASTEXITCODE -ne 0) { Write-Error "VERIFY ÉCHEC : pytest" ; exit 1 }
}

# Convention flotte : le script principal accepte --dry-run (pas d'envoi de mail,
# pas de publication) pour pouvoir être vérifié sans effet de bord.
$main = @("main.py", "run.py") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($main) {
    Write-Host "$ python $main --dry-run"
    python $main --dry-run
    if ($LASTEXITCODE -ne 0) { Write-Error "VERIFY ÉCHEC : dry-run" ; exit 1 }
}

Write-Host "VERIFY OK." -ForegroundColor Green
