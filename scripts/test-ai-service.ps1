[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$requirements = Join-Path $repoRoot 'ai-service\requirements.txt'
$tempVenv = Join-Path ([IO.Path]::GetTempPath()) "goldexa-ai-test-$PID"

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  throw 'uv is required to run the isolated AI service test environment.'
}

try {
  # 3.11.15 has compatible wheels for the pinned Pydantic stack; the bundled
  # portable 3.11.9 on some Windows hosts is not a complete uv environment.
  & uv venv $tempVenv --python 3.11.15
  if ($LASTEXITCODE -ne 0) { throw "uv venv failed with exit code $LASTEXITCODE" }

  $python = Join-Path $tempVenv 'Scripts\python.exe'
  & uv pip install --python $python -r $requirements
  if ($LASTEXITCODE -ne 0) { throw "uv pip install failed with exit code $LASTEXITCODE" }

  Push-Location (Join-Path $repoRoot 'ai-service')
  try {
    & $python -m unittest discover -s . -p 'test_*.py' -v
    if ($LASTEXITCODE -ne 0) { throw "AI service tests failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
} finally {
  if (Test-Path -LiteralPath $tempVenv) {
    Remove-Item -LiteralPath $tempVenv -Recurse -Force -ErrorAction SilentlyContinue
  }
}
