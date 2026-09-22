[CmdletBinding()]
param(
  [switch]$RepairDockerRuntime,
  [switch]$Build
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
$runtimePaths = @(
  (Join-Path $localAppData 'Docker\run'),
  (Join-Path $localAppData 'docker-secrets-engine')
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

  foreach ($runtimePath in $runtimePaths) {
    if (Test-Path -LiteralPath $runtimePath) {
      $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
      $backupPath = "$runtimePath.stale-$stamp"
      Move-Item -LiteralPath $runtimePath -Destination $backupPath
      Write-Host "Moved stale runtime directory to $backupPath" -ForegroundColor Yellow
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
