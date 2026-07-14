$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$port = if ($env:PORT) { [int]$env:PORT } else { 5000 }
$logPath = Join-Path $repoRoot "office-server.log"
$errPath = Join-Path $repoRoot "office-server.err.log"

$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
$processIds = $connections |
  Where-Object { $_.OwningProcess -gt 0 } |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

$env:NODE_ENV = "production"
Start-Process `
  -FilePath "node.exe" `
  -ArgumentList "dist/index.cjs" `
  -WorkingDirectory $repoRoot `
  -RedirectStandardOutput $logPath `
  -RedirectStandardError $errPath `
  -WindowStyle Hidden

Start-Sleep -Seconds 4

try {
  $status = (Invoke-WebRequest -Uri "http://127.0.0.1:$port" -UseBasicParsing -TimeoutSec 8).StatusCode
  Write-Host "Criticare IPD is running on http://127.0.0.1:$port with status $status"
} catch {
  Write-Host "Criticare IPD started, but health check failed: $($_.Exception.Message)"
  if (Test-Path $errPath) {
    Get-Content $errPath -Tail 20
  }
  exit 1
}
