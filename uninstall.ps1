# =================================================================
#  Agentic OS Ultimate Edition V5.0 - Windows PowerShell Uninstaller
#  https://github.com/rachidSabah/Agentic-os
#
#  Usage:
#    iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/uninstall.ps1)
# =================================================================

param(
    [string]$InstallDir = "$env:USERPROFILE\Agentic-os"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Magenta
Write-Host "   Agentic OS V5.0 - Uninstaller" -ForegroundColor Magenta
Write-Host "===============================================================" -ForegroundColor Magenta
Write-Host ""

# Find the installation directory
$Dir = $InstallDir

if (-not (Test-Path $Dir)) {
    $candidates = @(
        "$env:USERPROFILE\Agentic-os",
        "$env:USERPROFILE\Documents\Agentic-os",
        "$env:USERPROFILE\Documents\gemini-projects\Agentic-os"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $Dir = $c
            break
        }
    }
}

if (-not (Test-Path $Dir)) {
    Write-Host "  Agentic OS installation not found at: $Dir" -ForegroundColor Yellow
    Write-Host "  Nothing to uninstall." -ForegroundColor Yellow
    exit 0
}

Write-Host "  Found installation at: $Dir" -ForegroundColor Cyan

# Ask for confirmation
Write-Host ""
$confirm = Read-Host "  Are you sure you want to uninstall Agentic OS? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "  Uninstall cancelled." -ForegroundColor Yellow
    exit 0
}

# Step 1: Stop the server if running
Write-Host ""
Write-Host "  [1/3] Stopping Agentic OS..." -ForegroundColor Cyan
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -like "*$Dir*" }
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "  OK Stopped running processes" -ForegroundColor Green
    } else {
        Write-Host "  OK No running processes found" -ForegroundColor Green
    }
} catch {
    Write-Host "  WARN Could not check for running processes" -ForegroundColor Yellow
}

# Also check for processes on port 3100
try {
    $portUser = Get-NetTCPConnection -LocalPort 3100 -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    if ($portUser) {
        $portUser | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        Write-Host "  OK Freed port 3100" -ForegroundColor Green
    }
} catch {
    # Not critical
}

# Step 2: Remove build artifacts
Write-Host "  [2/3] Removing build artifacts..." -ForegroundColor Cyan
try {
    $nextDir = Join-Path $Dir ".next"
    $nodeModules = Join-Path $Dir "node_modules"
    $pidFile = Join-Path $Dir ".agentic-os.pid"

    if (Test-Path $nextDir) { Remove-Item -Path $nextDir -Recurse -Force }
    if (Test-Path $nodeModules) { Remove-Item -Path $nodeModules -Recurse -Force }
    if (Test-Path $pidFile) { Remove-Item -Path $pidFile -Force }
    Write-Host "  OK Removed .next, node_modules, and PID file" -ForegroundColor Green
} catch {
    Write-Host "  WARN Some files could not be removed (they may be in use)" -ForegroundColor Yellow
}

# Step 3: Ask about full removal
Write-Host "  [3/3] Full removal..." -ForegroundColor Cyan
$fullRemove = Read-Host "  Remove the entire Agentic OS directory? This deletes all your data. (yes/no)"
if ($fullRemove -eq "yes") {
    try {
        # Go up one level before removing
        Push-Location (Split-Path $Dir)
        Remove-Item -Path $Dir -Recurse -Force
        Pop-Location
        Write-Host "  OK Removed entire directory: $Dir" -ForegroundColor Green
    } catch {
        Write-Host "  WARN Could not fully remove. Some files may be in use." -ForegroundColor Yellow
        Write-Host "  Try closing all terminals and deleting manually: $Dir" -ForegroundColor Yellow
    }
} else {
    Write-Host "  OK Kept source files at: $Dir" -ForegroundColor Green
    Write-Host "  Reinstall with: npm install && npm run build" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Magenta
Write-Host "   Agentic OS has been uninstalled" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Magenta
Write-Host ""
