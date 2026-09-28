[CmdletBinding()]
param(
  [switch]$RepairDockerRuntime,
  [switch]$Build
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
$dockerRunPath = Join-Path $localAppData 'Docker\run'
$staleRuntimeEntries = @(
  (Join-Path $dockerRunPath 'dockerEthernetVfkit'),
  (Join-Path $dockerRunPath 'dockerInference'),
  (Join-Path $dockerRunPath 'sailor-ingest.sock'),
  (Join-Path $dockerRunPath 'userAnalyticsOtlpHttp.sock'),
  (Join-Path $localAppData 'docker-secrets-engine\engine.sock')
)

function Test-DockerEngine {
  try {
    $version = docker version --format '{{.Server.Version}}' 2>$null
    return -not [string]::IsNullOrWhiteSpace($version)
  } catch {
    return $false
  }
}

if ($RepairDockerRuntime -and -not (Test-DockerEngine)) {
  Write-Host 'Stopping stale Docker Desktop processes...' -ForegroundColor Yellow
  Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -match '^(Docker Desktop|com\.docker\.backend|docker-mcp)$' } |
    Stop-Process -Force -ErrorAction SilentlyContinue

  # Release WSL-held AF_UNIX sockets. This does not unregister a distro or
  # modify Docker's data VHDX.
  wsl.exe --shutdown 2>$null

  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  foreach ($runtimeEntry in $staleRuntimeEntries) {
    if (Test-Path -LiteralPath $runtimeEntry) {
      $backupPath = "$runtimeEntry.stale-$stamp"
      try {
        Move-Item -LiteralPath $runtimeEntry -Destination $backupPath -ErrorAction Stop
        Write-Host "Moved stale Docker runtime entry to $backupPath" -ForegroundColor Yellow
      } catch {
        # Windows may refuse to rename a stale AF_UNIX/reparse-point entry even
        # after Docker and WSL have stopped. These exact runtime entries do not
        # contain images, volumes, databases, or application data, so remove
        # only the entry itself (never recursively).
        try {
          Remove-Item -LiteralPath $runtimeEntry -Force -ErrorAction Stop
          Write-Host "Removed stale Docker runtime entry $runtimeEntry" -ForegroundColor Yellow
        } catch {
          throw "Docker runtime entry is still locked: $runtimeEntry. Close Docker Desktop completely and retry -RepairDockerRuntime."
        }
      }
    }
  }
}

if (-not (Test-Path -LiteralPath $dockerDesktop)) {
  throw "Docker Desktop executable was not found at $dockerDesktop"
}

if (-not (Test-DockerEngine)) {
  Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
  Write-Host 'Waiting for Docker Engine...' -ForegroundColor Cyan
  $ready = $false
  for ($attempt = 1; $attempt -le 24; $attempt++) {
    Start-Sleep -Seconds 5
    if (Test-DockerEngine) {
      $ready = $true
      break
    }
  }
  if (-not $ready) {
    throw 'Docker Engine did not become ready. Check Docker Desktop logs before retrying.'
  }
}

$composeArgs = @('compose', 'up', '-d')
if ($Build) { $composeArgs += '--build' }
Push-Location $projectRoot
try {
  & docker @composeArgs
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

Write-Host 'Goldexa Docker services are running.' -ForegroundColor Green
