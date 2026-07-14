$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$deployScript = Join-Path $repoRoot "script\office-deploy.ps1"
$startScript = Join-Path $repoRoot "script\office-start.ps1"

$deployAction = "powershell.exe -ExecutionPolicy Bypass -File `"$deployScript`""
$startAction = "powershell.exe -ExecutionPolicy Bypass -File `"$startScript`""

schtasks /Create /TN "Criticare IPD Auto Deploy" /TR $deployAction /SC MINUTE /MO 2 /F
schtasks /Create /TN "Criticare IPD Start On Boot" /TR $startAction /SC ONSTART /F

Write-Host "Installed scheduled tasks:"
Write-Host "- Criticare IPD Auto Deploy: checks GitHub every 2 minutes"
Write-Host "- Criticare IPD Start On Boot: starts site when the office PC turns on"
