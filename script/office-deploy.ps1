$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$branch = "main"
$port = if ($env:PORT) { [int]$env:PORT } else { 5000 }
$deployLog = Join-Path $repoRoot "office-deploy.log"

function Write-DeployLog {
  param([string]$Message)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $deployLog -Value $line
  Write-Host $line
}

Set-Location $repoRoot

Write-DeployLog "Checking GitHub for updates..."
git fetch origin $branch

$localHead = (git rev-parse HEAD).Trim()
$remoteHead = (git rev-parse "origin/$branch").Trim()

$serverListening = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" }

if ($localHead -eq $remoteHead) {
  Write-DeployLog "No code update found."
  if (-not $serverListening) {
    Write-DeployLog "Server is not running. Starting it now."
    powershell.exe -ExecutionPolicy Bypass -File (Join-Path $repoRoot "script\office-start.ps1")
  }
  exit 0
}

Write-DeployLog "Update found. Pulling latest code..."
git pull --ff-only origin $branch

Write-DeployLog "Installing dependencies..."
npm install

Write-DeployLog "Checking TypeScript..."
npm run check

Write-DeployLog "Building production app..."
npm run build

Write-DeployLog "Syncing database schema..."
npm run db:push

Write-DeployLog "Restarting local server..."
powershell.exe -ExecutionPolicy Bypass -File (Join-Path $repoRoot "script\office-start.ps1")

Write-DeployLog "Deployment complete."
