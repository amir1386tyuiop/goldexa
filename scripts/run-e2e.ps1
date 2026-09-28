[CmdletBinding()]
param(
  [switch]$KeepStack,
  [switch]$Build
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$compose = @(
  'compose', '-p', 'goldexa-e2e',
  '-f', 'backend/test/docker-compose.e2e.yml',
  '-f', 'backend/test/docker-compose.e2e.override.yml'
)

function Invoke-DockerCompose([string[]]$Arguments) {
  & docker @compose @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed with exit code $LASTEXITCODE"
  }
}

Push-Location $projectRoot
try {
  Write-Host 'Resetting only the isolated Goldexa E2E stack...' -ForegroundColor Yellow
  Invoke-DockerCompose @('down', '-v', '--remove-orphans')

  $upArguments = @('up', '-d')
  if ($Build) { $upArguments += '--build' }
  Invoke-DockerCompose $upArguments

  $env:E2E_BASE_URL = 'http://localhost:3011'
  $env:AI_E2E_BASE_URL = 'http://localhost:58000'
  $env:E2E_ALLOW_DB_FIXTURES = '1'
  $env:DB_HOST = 'localhost'
  $env:DB_PORT = '55432'
  $env:DB_USERNAME = 'goldeksa_e2e'
  $env:DB_PASSWORD = 'goldeksa_e2e_only'
  $env:DB_DATABASE = 'goldeksa_e2e'

  Write-Host 'Running the full isolated E2E suite...' -ForegroundColor Cyan
  & npm run test:e2e --prefix backend
  if ($LASTEXITCODE -ne 0) {
    throw "E2E suite failed with exit code $LASTEXITCODE"
  }
} finally {
  if (-not $KeepStack) {
    Write-Host 'Tearing down the isolated E2E stack...' -ForegroundColor Yellow
    try { Invoke-DockerCompose @('down', '-v', '--remove-orphans') } catch { Write-Warning $_ }
  } else {
    Write-Host 'Keeping the isolated E2E stack running (-KeepStack).' -ForegroundColor Green
  }
  Pop-Location
}

