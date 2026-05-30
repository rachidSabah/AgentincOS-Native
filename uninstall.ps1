# ╔══════════════════════════════════════════════════════════════════════╗
# ║            AGENTIC OS — One-Command Uninstall (PowerShell)          ║
# ╚══════════════════════════════════════════════════════════════════════╝

$ErrorActionPreference = "Stop"
$InstallDir = "$env:LOCALAPPDATA\agentic-os"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║                                                              ║" -ForegroundColor Red
Write-Host "║  Agentic OS — Uninstall                                      ║" -ForegroundColor Red
Write-Host "║                                                              ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

Write-Host "  This will remove:" -ForegroundColor Yellow
Write-Host "    * Agentic OS application ($InstallDir)"
Write-Host "    * agentic-os launcher command"
Write-Host "    * node_modules and build artifacts"
Write-Host ""
Write-Host "  This will NOT remove:" -ForegroundColor Green
Write-Host "    * Hermes Agent (uninstall separately)"
Write-Host "    * Node.js"
Write-Host "    * Your .env configuration (backed up)"
Write-Host ""

$confirm = Read-Host "  Continue? [y/N]"
if ($confirm -notmatch '^[yY]') {
    Write-Host "  Uninstall cancelled." -ForegroundColor Cyan
    exit 0
}
Write-Host ""

# Stop running instances
Write-Host "  [INFO]  Stopping Agentic OS..." -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*agentic-os*" -or $_.CommandLine -like "*next*3000*" } | Stop-Process -ErrorAction SilentlyContinue
Write-Host "  [OK]    Stopped running instances" -ForegroundColor Green

# Backup .env
if (Test-Path "$InstallDir\.env") {
    $backupPath = "$env:USERPROFILE\agentic-os-env-backup-$(Get-Date -Format 'yyyyMMddHHmmss').env"
    Copy-Item "$InstallDir\.env" $backupPath
    Write-Host "  [OK]    Backed up .env to $backupPath" -ForegroundColor Green
}

# Remove from PATH
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -like "*$InstallDir*") {
    $newPath = ($userPath -split ';' | Where-Object { $_ -ne $InstallDir -and $_ -ne '' }) -join ';'
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "  [OK]    Removed from user PATH" -ForegroundColor Green
}

# Remove installation directory
if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir
    Write-Host "  [OK]    Removed $InstallDir" -ForegroundColor Green
} else {
    Write-Host "  [WARN]  Installation directory not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  Agentic OS has been uninstalled.                            ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  To reinstall:                                               ║" -ForegroundColor Green
Write-Host "║    iex (irm https://raw.githubusercontent.com/               ║" -ForegroundColor Green
Write-Host "║    rachidSabah/Agentic-os/main/install.ps1)                 ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
