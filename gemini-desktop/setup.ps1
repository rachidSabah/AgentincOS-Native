#Requires -Version 5.1
<#
.SYNOPSIS
    ClawHub Desktop - One-Command Windows Setup
.DESCRIPTION
    Installs all dependencies and starts ClawHub Desktop.
    Run from PowerShell as Administrator (recommended).
.EXAMPLE
    irm https://raw.githubusercontent.com/rachidSabah/INFOHASCLAWHUB/main/setup.ps1 | iex
#>

$ErrorActionPreference = "Stop"
$ProgressPreference   = "SilentlyContinue"

# ── helpers ────────────────────────────────────────────────────────────────────
function Write-Step  { Write-Host "`n  🔹 $args" -ForegroundColor Cyan    }
function Write-Ok    { Write-Host "     ✅ $args" -ForegroundColor Green   }
function Write-Warn  { Write-Host "     ⚠️  $args" -ForegroundColor Yellow }
function Write-Fail  { Write-Host "     ❌ $args" -ForegroundColor Red; exit 1 }

function Ensure-Tool {
    param([string]$Name, [string]$WingetId, [string]$TestCmd = $Name)
    if (Get-Command $TestCmd -ErrorAction SilentlyContinue) {
        Write-Ok "$Name already installed"
        return
    }
    Write-Warn "$Name not found – installing via winget …"
    winget install --id $WingetId --silent --accept-package-agreements --accept-source-agreements
    # Refresh PATH without reopening shell
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    if (-not (Get-Command $TestCmd -ErrorAction SilentlyContinue)) {
        Write-Fail "$Name installation failed. Please install it manually: https://nodejs.org"
    }
    Write-Ok "$Name installed"
}

# ── banner ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ██████╗██╗      █████╗ ██╗    ██╗██╗  ██╗██╗   ██╗██████╗ " -ForegroundColor Magenta
Write-Host " ██╔════╝██║     ██╔══██╗██║    ██║██║  ██║██║   ██║██╔══██╗" -ForegroundColor Magenta
Write-Host " ██║     ██║     ███████║██║ █╗ ██║███████║██║   ██║██████╔╝" -ForegroundColor Magenta
Write-Host " ██║     ██║     ██╔══██║██║███╗██║██╔══██║██║   ██║██╔══██╗" -ForegroundColor Magenta
Write-Host " ╚██████╗███████╗██║  ██║╚███╔███╔╝██║  ██║╚██████╔╝██████╔╝" -ForegroundColor Magenta
Write-Host "  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ " -ForegroundColor Magenta
Write-Host ""
Write-Host "  ClawHub Desktop – One-Command Windows Installer" -ForegroundColor White
Write-Host "  ─────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── 1. check winget ────────────────────────────────────────────────────────────
Write-Step "Checking package manager …"
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Fail "winget not found. Please install it from the Microsoft Store (App Installer)."
}
Write-Ok "winget is available"

# ── 2. node.js ────────────────────────────────────────────────────────────────
Write-Step "Checking Node.js (v18+ required) …"
Ensure-Tool -Name "node" -WingetId "OpenJS.NodeJS.LTS" -TestCmd "node"

$nodeVer = [version]((node --version) -replace '^v','')
if ($nodeVer -lt [version]"18.0.0") {
    Write-Fail "Node.js v18+ is required (found $nodeVer). Please upgrade: https://nodejs.org"
}
Write-Ok "Node.js $nodeVer"

# ── 3. git ─────────────────────────────────────────────────────────────────────
Write-Step "Checking Git …"
Ensure-Tool -Name "git" -WingetId "Git.Git" -TestCmd "git"
Write-Ok "Git $(git --version)"

# ── 4. clone / update repo ────────────────────────────────────────────────────
Write-Step "Setting up project …"

$installDir = "$env:LOCALAPPDATA\clawhub-desktop"

if (Test-Path "$installDir\.git") {
    Write-Warn "Existing install found at $installDir – pulling latest updates …"
    Set-Location $installDir
    git pull --quiet
    Write-Ok "Updated to latest version"
} else {
    Write-Host "     📥 Cloning ClawHub Desktop to $installDir …" -ForegroundColor Cyan
    git clone https://github.com/rachidSabah/INFOHASCLAWHUB.git $installDir --quiet
    Set-Location $installDir
    Write-Ok "Project cloned"
}

# ── 5. install dependencies ───────────────────────────────────────────────────
Write-Step "Installing Node.js dependencies …"
npm install --silent
Write-Ok "Dependencies installed"

# ── 6. environment file ───────────────────────────────────────────────────────
Write-Step "Configuring environment …"

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Warn "Created .env from template – please add your GEMINI_API_KEY to .env before use"
    } else {
        # Create a minimal .env
        @"
# ClawHub Desktop – Environment Configuration
# Get your free Gemini API key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Additional AI Provider Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=

# Database (SQLite - no config needed)
DATABASE_URL="file:./db/clawhub.db"
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Warn "Created default .env – please add your GEMINI_API_KEY to .env before use"
    }
} else {
    Write-Ok ".env already exists"
}

# ── 7. database setup ─────────────────────────────────────────────────────────
Write-Step "Setting up database …"
if (-not (Test-Path "db")) { New-Item -ItemType Directory -Path "db" | Out-Null }
npx prisma generate --silent
npx prisma db push --skip-generate
Write-Ok "Database initialized"

# ── 8. check for API key ──────────────────────────────────────────────────────
$envContent = Get-Content ".env" -Raw
if ($envContent -match "GEMINI_API_KEY=your_gemini_api_key_here" -or
    $envContent -match "GEMINI_API_KEY=\s*$") {

    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "  ║  ⚠️  ACTION REQUIRED: Add your Gemini API key            ║" -ForegroundColor Yellow
    Write-Host "  ║                                                          ║" -ForegroundColor Yellow
    Write-Host "  ║  1. Get a free key at: https://aistudio.google.com      ║" -ForegroundColor Yellow
    Write-Host "  ║  2. Open: $installDir\.env" -ForegroundColor Yellow
    Write-Host "  ║  3. Replace 'your_gemini_api_key_here' with your key    ║" -ForegroundColor Yellow
    Write-Host "  ║  4. Re-run this script or: npm run dev                  ║" -ForegroundColor Yellow
    Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Opening .env for editing …" -ForegroundColor Cyan
    Start-Process notepad ".env"
    Read-Host "  Press ENTER after saving your API key to continue"
}

# ── 9. launch ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  ✅  ClawHub Desktop is ready!                          ║" -ForegroundColor Green
Write-Host "  ║                                                          ║" -ForegroundColor Green
Write-Host "  ║  🌐  Opening at: http://localhost:3000                   ║" -ForegroundColor Green
Write-Host "  ║                                                          ║" -ForegroundColor Green
Write-Host "  ║  Press Ctrl+C in this window to stop the server         ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Open browser after a short delay
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
} | Out-Null

npm run dev
