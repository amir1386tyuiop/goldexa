$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$repos = @('frontend', 'backend', 'mobile', 'ai-service')

foreach ($repo in $repos) {
  $path = Join-Path $Root $repo
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path | Out-Null
  }

  if (-not (Test-Path (Join-Path $path '.git'))) {
    Push-Location $path
    git init
    Pop-Location
  }
}

Write-Host "Git repositories initialized for: $($repos -join ', ')"
