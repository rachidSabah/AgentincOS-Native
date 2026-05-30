# ╔══════════════════════════════════════════════════════════════════════╗
# ║          AGENTIC OS — One-Command Install (Windows PowerShell)      ║
# ║                                                                      ║
# ║   Usage:                                                             ║
# ║     iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.ps1) ║
# ╚══════════════════════════════════════════════════════════════════════╝

$ErrorActionPreference = "Stop"

$InstallDir = "$env:LOCALAPPDATA\agentic-os"
$RepoUrl = "https://github.com/rachidSabah/Agentic-os.git"

function Write-Color($text, $color = "Cyan") {
    Write-Host $text -ForegroundColor $color
}

function Write-Banner {
    Write-Host ""
    Write-Color "╔══════════════════════════════════════════════════════════════╗" "Magenta"
    Write-Color "║                                                              ║" "Magenta"
    Write-Color "║     █████╗ ███████╗███████╗███████╗███╗   ██╗ ██████╗ ██╗    ║" "Cyan"
    Write-Color "║    ██╔══██╗╚══███╔╝██╔════╝██╔════╝████╗  ██║██╔════╝ ██║    ║" "Cyan"
    Write-Color "║    ███████║  ███╔╝ █████╗  ███████╗██╔██╗ ██║██║  ███╗██║    ║" "Cyan"
    Write-Color "║    ██╔══██║ ███╔╝  ██╔══╝  ╚════██║██║╚██╗██║██║   ██║██║    ║" "Cyan"
    Write-Color "║    ██║  ██║███████╗███████╗███████║██║ ╚████║╚██████╔╝███████║" "Cyan"
    Write-Color "║    ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝" "Cyan"
    Write-Color "║                                                              ║" "Magenta"
    Write-Color "║    7-Layer Agentic AI Stack Dashboard                        ║" "Magenta"
    Write-Color "║    Hermes Agent - Claude - OpenClaw - Self Vault             ║" "Magenta"
    Write-Color "║                                                              ║" "Magenta"
    Write-Color "╚══════════════════════════════════════════════════════════════╝" "Magenta"
    Write-Host ""
}

Write-Banner

# ─── Step 1: Check/Install Node.js ───
Write-Color "━━━ Step 1: Prerequisites ━━━" "Magenta"
Write-Host ""

$nodeInstalled = $false
try {
    $nodeVersion = node -v
    $major = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    if ($major -ge 18) {
        Write-Color "  [OK]    Node.js $nodeVersion found" "Green"
        $nodeInstalled = $true
    } else {
        Write-Color "  [WARN]  Node.js $nodeVersion found, but v18+ required" "Yellow"
    }
} catch {
    Write-Color "  [WARN]  Node.js not found" "Yellow"
}

if (-not $nodeInstalled) {
    Write-Color "  [INFO]  Installing Node.js LTS..." "Cyan"
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Color "  [OK]    Node.js installed via winget" "Green"
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Color "  [OK]    Node.js installed via Chocolatey" "Green"
    } else {
        Write-Color "  [WARN]  No package manager found. Please install Node.js from https://nodejs.org/" "Yellow"
        Write-Color "  [INFO]  Then re-run this script." "Cyan"
        exit 1
    }
}

# ─── Step 2: Clone / Update ───
Write-Host ""
Write-Color "━━━ Step 2: Download Agentic OS ━━━" "Magenta"
Write-Host ""

if (Test-Path $InstallDir) {
    Write-Color "  [INFO]  Existing installation found. Updating..." "Cyan"
    Set-Location $InstallDir
    git pull --ff-only 2>$null
} else {
    Write-Color "  [INFO]  Cloning Agentic OS repository..." "Cyan"
    git clone $RepoUrl $InstallDir
    Set-Location $InstallDir
}
Write-Color "  [OK]    Code ready at $InstallDir" "Green"

# ─── Step 3: Install dependencies ───
Write-Host ""
Write-Color "━━━ Step 3: Install Dependencies ━━━" "Magenta"
Write-Host ""

Write-Color "  [INFO]  Installing npm packages..." "Cyan"
npm install --frozen-lockfile 2>$null
if ($LASTEXITCODE -ne 0) { npm install }
Write-Color "  [OK]    Dependencies installed" "Green"

# ─── Step 4: Build ───
Write-Host ""
Write-Color "━━━ Step 4: Build ━━━" "Magenta"
Write-Host ""

Write-Color "  [INFO]  Building Agentic OS..." "Cyan"
npm run build
Write-Color "  [OK]    Build complete" "Green"

# ─── Step 5: Create launcher ───
Write-Host ""
Write-Color "━━━ Step 5: Create Launcher ━━━" "Magenta"
Write-Host ""

$launcherPath = "$InstallDir\agentic-os.ps1"
$launcherContent = @'
param([string]$Command = "dev")

switch ($Command) {
    "dev"    { Write-Host "Starting Agentic OS (development)..."; Set-Location "$PSScriptRoot"; npm run dev }
    "prod"   { Write-Host "Starting Agentic OS (production)..."; Set-Location "$PSScriptRoot"; npm run start }
    "build"  { Write-Host "Building Agentic OS..."; Set-Location "$PSScriptRoot"; npm run build }
    "stop"   { Write-Host "Stopping Agentic OS..."; Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process; Write-Host "Stopped." }
    "update" { Write-Host "Updating Agentic OS..."; Set-Location "$PSScriptRoot"; git pull --ff-only; npm install; npm run build; Write-Host "Updated." }
    default  { Write-Host "Agentic OS - 7-Layer Agentic AI Stack Dashboard"; Write-Host ""; Write-Host "Usage: agentic-os [dev|prod|build|stop|update]" }
}
'@

Set-Content -Path $launcherPath -Value $launcherContent -Encoding UTF8

# Create .bat wrapper for CMD
$batPath = "$InstallDir\agentic-os.bat"
$batContent = "@echo off`npowershell -ExecutionPolicy Bypass -File `"%~dp0agentic-os.ps1`" %*"
Set-Content -Path $batPath -Value $batContent -Encoding ASCII

# Add to PATH (user level)
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$InstallDir*") {
    [System.Environment]::SetEnvironmentVariable("Path", "$userPath;$InstallDir", "User")
    $env:Path += ";$InstallDir"
    Write-Color "  [OK]    Added to user PATH" "Green"
}

Write-Color "  [OK]    Created launcher: agentic-os command available" "Green"

# ─── Step 6: Create .env ───
if (-not (Test-Path "$InstallDir\.env")) {
    $envContent = @"
# Agentic OS Configuration
# Hermes API endpoint (auto-detected if not set)
# HERMES_API_URL=http://localhost:8000

# Add your LLM provider keys below
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# OPENROUTER_API_KEY=
"@
    Set-Content -Path "$InstallDir\.env" -Value $envContent -Encoding UTF8
    Write-Color "  [OK]    Created .env configuration file" "Green"
}

# ─── Success ───
Write-Host ""
Write-Color "╔══════════════════════════════════════════════════════════════╗" "Green"
Write-Color "║                                                              ║" "Green"
Write-Color "║  Agentic OS installed successfully!                          ║" "Green"
Write-Color "║                                                              ║" "Green"
Write-Color "║  To start:                                                   ║" "Green"
Write-Color "║    agentic-os dev       -> Development mode (port 3000)      ║" "Green"
Write-Color "║    agentic-os prod      -> Production mode                   ║" "Green"
Write-Color "║                                                              ║" "Green"
Write-Color "║  Then open:                                                  ║" "Green"
Write-Color "║    http://localhost:3000                                      ║" "Green"
Write-Color "║                                                              ║" "Green"
Write-Color "║  Other commands:                                             ║" "Green"
Write-Color "║    agentic-os stop      -> Stop the server                   ║" "Green"
Write-Color "║    agentic-os update    -> Update to latest version           ║" "Green"
Write-Color "║    agentic-os build     -> Rebuild the application            ║" "Green"
Write-Color "║                                                              ║" "Green"
Write-Color "║  To install Hermes Agent on Windows:                         ║" "Green"
Write-Color "║    iex (irm https://raw.githubusercontent.com/               ║" "Green"
Write-Color "║    NousResearch/hermes-agent/main/scripts/install.ps1)       ║" "Green"
Write-Color "║                                                              ║" "Green"
Write-Color "╚══════════════════════════════════════════════════════════════╝" "Green"
Write-Host ""
