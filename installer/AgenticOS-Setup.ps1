
# Agentic OS v2.0.0 — One-Click Installer (PowerShell)
# Self-contained: Bundles Node.js runtime — NO external dependencies required

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Agentic OS Installer"

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "   Agentic OS v2.0.0 — One-Click Installer" -ForegroundColor Yellow
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

$InstallDir = Join-Path $env:LOCALAPPDATA "Agentic OS"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "  Installing to: $InstallDir" -ForegroundColor White
Write-Host ""

# Create directories
$dirs = @("", "runtime", "server", "db", "prisma", "data", "logs")
foreach ($d in $dirs) {
    $path = Join-Path $InstallDir $d
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

# Copy files from script directory
Write-Host "  [1/5] Extracting application files..." -ForegroundColor Green

if (Test-Path (Join-Path $ScriptDir "server")) {
    Copy-Item -Path (Join-Path $ScriptDir "server\*") -Destination (Join-Path $InstallDir "server") -Recurse -Force
}
if (Test-Path (Join-Path $ScriptDir "runtime")) {
    Copy-Item -Path (Join-Path $ScriptDir "runtime\*") -Destination (Join-Path $InstallDir "runtime") -Recurse -Force
}
if (Test-Path (Join-Path $ScriptDir "db")) {
    Copy-Item -Path (Join-Path $ScriptDir "db\*") -Destination (Join-Path $InstallDir "db") -Recurse -Force
}
if (Test-Path (Join-Path $ScriptDir "prisma")) {
    Copy-Item -Path (Join-Path $ScriptDir "prisma\*") -Destination (Join-Path $InstallDir "prisma") -Recurse -Force
}
if (Test-Path (Join-Path $ScriptDir "node_modules")) {
    Copy-Item -Path (Join-Path $ScriptDir "node_modules\*") -Destination (Join-Path $InstallDir "server\node_modules") -Recurse -Force
}

# Copy launcher files
Copy-Item -Path (Join-Path $ScriptDir "start.bat") -Destination $InstallDir -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $ScriptDir "stop.bat") -Destination $InstallDir -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $ScriptDir "icon.ico") -Destination $InstallDir -Force -ErrorAction SilentlyContinue

Write-Host "  [2/5] Creating shortcuts..." -ForegroundColor Green

# Desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath("Desktop") + "\Agentic OS.lnk")
$Shortcut.TargetPath = Join-Path $InstallDir "start.bat"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = Join-Path $InstallDir "icon.ico"
$Shortcut.Description = "Agentic OS - Autonomous AI Operating System"
$Shortcut.Save()

# Start Menu shortcut
$StartMenuPath = [Environment]::GetFolderPath("StartMenu")
$Shortcut2 = $WshShell.CreateShortcut("$StartMenuPath\Programs\Agentic OS.lnk")
$Shortcut2.TargetPath = Join-Path $InstallDir "start.bat"
$Shortcut2.WorkingDirectory = $InstallDir
$Shortcut2.IconLocation = Join-Path $InstallDir "icon.ico"
$Shortcut2.Description = "Agentic OS - Autonomous AI Operating System"
$Shortcut2.Save()

Write-Host "  [3/5] Initializing database..." -ForegroundColor Green

$nodeExe = Join-Path $InstallDir "runtime\node.exe"
$prismaCLI = Join-Path $InstallDir "server\node_modules\prisma\build\index.js"
$schemaPath = Join-Path $InstallDir "prisma\schema.prisma"

if ((Test-Path $nodeExe) -and (Test-Path $prismaCLI) -and (Test-Path $schemaPath)) {
    & $nodeExe $prismaCLI db push --schema=$schemaPath 2>$null
    Write-Host "  Database initialized." -ForegroundColor DarkGreen
} else {
    Write-Host "  Database will be initialized on first launch." -ForegroundColor DarkYellow
}

Write-Host "  [4/5] Creating environment configuration..." -ForegroundColor Green

$envContent = @"
# Agentic OS Environment Configuration
DATABASE_URL=file:../db/agentic.db
PORT=3000
HOSTNAME=127.0.0.1
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
"@
Set-Content -Path (Join-Path $InstallDir ".env") -Value $envContent -Force

Write-Host "  [5/5] Registering application..." -ForegroundColor Green

# Register uninstaller
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "DisplayName" /t REG_SZ /d "Agentic OS" /f | Out-Null
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "DisplayVersion" /t REG_SZ /d "2.0.0" /f | Out-Null
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "Publisher" /t REG_SZ /d "AgenticOS Team" /f | Out-Null
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "URLInfoAbout" /t REG_SZ /d "https://github.com/rachidSabah/AgentincOS-Native" /f | Out-Null
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "UninstallString" /t REG_SZ /d "$InstallDir\uninstall.bat" /f | Out-Null
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "InstallLocation" /t REG_SZ /d $InstallDir /f | Out-Null

# Create uninstaller
$uninstallContent = @"
@echo off
title Uninstall Agentic OS
echo Uninstalling Agentic OS...
call "$InstallDir\stop.bat" 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /f 2>nul
del "%USERPROFILE%\Desktop\Agentic OS.lnk" 2>nul
rd /s /q "$InstallDir" 2>nul
echo Agentic OS has been uninstalled.
pause
"@
Set-Content -Path (Join-Path $InstallDir "uninstall.bat") -Value $uninstallContent -Force

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "   Installation Complete!" -ForegroundColor Green
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Agentic OS has been installed to:" -ForegroundColor White
Write-Host "  $InstallDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Launch from:" -ForegroundColor White
Write-Host "    - Desktop shortcut" -ForegroundColor Gray
Write-Host "    - Start Menu" -ForegroundColor Gray
Write-Host "    - Or run: $InstallDir\start.bat" -ForegroundColor Gray
Write-Host ""

# Ask to launch
$response = Read-Host "  Launch Agentic OS now? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "  Starting Agentic OS..." -ForegroundColor Green
    Start-Process -FilePath (Join-Path $InstallDir "start.bat") -WorkingDirectory $InstallDir
    Start-Sleep -Seconds 4
    Start-Process "http://127.0.0.1:3000"
}

Write-Host ""
Write-Host "  Thank you for installing Agentic OS!" -ForegroundColor Cyan
Start-Sleep -Seconds 3
