# =================================================================
#  Agentic OS Ultimate Edition V5.0 - Windows PowerShell Installer
#  https://github.com/rachidSabah/Agentic-os
#
#  Usage:
#    iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.ps1)
#
#  Or with custom install directory:
#    iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.ps1)
#    Install-AgenticOS -InstallDir "C:\Users\you\Agentic-os"
# =================================================================

param(
    [string]$InstallDir = "$env:USERPROFILE\Agentic-os",
    [int]$Port = 3100
)

$ErrorActionPreference = "Stop"

# --- Helper Functions ---

function Write-Step($step, $total, $message) {
    Write-Host ""
    Write-Host "[$step/$total] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "  OK $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "  WARN $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "  ERROR $message" -ForegroundColor Red
}

function Test-Command($name) {
    try {
        Get-Command $name -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# --- Main Install ---

function Install-AgenticOS {
    param(
        [string]$Dir = $InstallDir,
        [int]$AppPort = $Port
    )

    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Magenta
    Write-Host "   Agentic OS Ultimate Edition V5.0 - Windows Installer" -ForegroundColor Magenta
    Write-Host "===============================================================" -ForegroundColor Magenta
    Write-Host ""

    # Step 1: Check prerequisites
    Write-Step 1 6 "Checking prerequisites..."

    if (-not (Test-Command "git")) {
        Write-Error "Git is not installed. Install it from https://git-scm.com"
        Write-Host "  You can also run: winget install Git.Git" -ForegroundColor Yellow
        exit 1
    }
    $gitVer = (git --version) -replace "git version ", ""
    Write-Success "Git: $gitVer"

    if (-not (Test-Command "node")) {
        Write-Warning "Node.js is not installed. Attempting to install via winget..."
        if (Test-Command "winget") {
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            Refresh-Path
        } elseif (Test-Command "choco") {
            choco install nodejs-lts -y
            Refresh-Path
        } else {
            Write-Error "Node.js is required. Install it from https://nodejs.org"
            exit 1
        }
    }

    if (Test-Command "node") {
        $nodeVer = (node --version)
        Write-Success "Node.js: $nodeVer"
    } else {
        Write-Error "Node.js installation failed. Please install manually from https://nodejs.org"
        exit 1
    }

    if (Test-Command "npm") {
        $npmVer = (npm --version)
        Write-Success "npm: $npmVer"
    } else {
        Write-Error "npm not found. It should come with Node.js."
        exit 1
    }

    # Step 2: Clone or update repository
    Write-Step 2 6 "Setting up repository..."

    if (Test-Path $Dir) {
        Write-Warning "Directory exists: $Dir"
        Write-Host "  Pulling latest changes..." -ForegroundColor Yellow
        Push-Location $Dir
        try {
            git fetch origin 2>$null
            git reset --hard origin/main 2>$null
            Write-Success "Repository updated to latest"
        } catch {
            Write-Warning "Could not pull updates. Continuing with existing version."
        }
        Pop-Location
    } else {
        Write-Host "  Cloning to $Dir..."
        git clone https://github.com/rachidSabah/Agentic-os.git $Dir
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Git clone failed. Check your internet connection."
            exit 1
        }
        Write-Success "Repository cloned"
    }

    # Step 3: Install dependencies
    Write-Step 3 6 "Installing dependencies..."
    Push-Location $Dir

    # Check for bun first
    if (Test-Command "bun") {
        Write-Host "  Using bun..."
        bun install
        $pkgMgr = "bun"
    } else {
        Write-Host "  Using npm..."
        npm install
        $pkgMgr = "npm"
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Dependency installation failed."
        Pop-Location
        exit 1
    }
    Write-Success "Dependencies installed"

    # Step 4: Build the project
    Write-Step 4 6 "Building Agentic OS..."

    if ($pkgMgr -eq "bun") {
        bun run build
    } else {
        npm run build
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Build failed. You can still use dev mode with: npm run dev"
    } else {
        Write-Success "Build complete"
    }

    # Step 5: Configure environment
    Write-Step 5 6 "Configuring environment..."

    $envFile = Join-Path $Dir ".env.local"
    if (-not (Test-Path $envFile)) {
        "PORT=$AppPort" | Out-File -FilePath $envFile -Encoding utf8
        Write-Success "Created .env.local with PORT=$AppPort"
    } else {
        Write-Success ".env.local already exists"
    }

    # Create a convenient launcher script
    $launcherContent = @"
@echo off
cd /d "$Dir"
npm start -- -p $AppPort
"@
    $launcherPath = Join-Path $Dir "start-agentic-os.bat"
    $launcherContent | Out-File -FilePath $launcherPath -Encoding ascii
    Write-Success "Created launcher: $launcherPath"

    # Create an update script
    $updateContent = @"
@echo off
echo Updating Agentic OS...
cd /d "$Dir"
git fetch origin
git reset --hard origin/main
npm install
npm run build
echo.
echo Update complete! Restart Agentic OS to apply changes.
pause
"@
    $updatePath = Join-Path $Dir "update-agentic-os.bat"
    $updateContent | Out-File -FilePath $updatePath -Encoding ascii
    Write-Success "Created updater: $updatePath"

    Pop-Location

    # Step 6: Display summary
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Magenta
    Write-Host "   Agentic OS Ultimate Edition V5.0 Installed!" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  Dashboard:   http://localhost:$AppPort" -ForegroundColor Cyan
    Write-Host "  Install dir: $Dir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Quick Start:" -ForegroundColor Yellow
    Write-Host "    cd $Dir"
    Write-Host "    npm start          (Production - port $AppPort)"
    Write-Host "    npm run dev        (Development with hot reload)"
    Write-Host ""
    Write-Host "  Launcher:" -ForegroundColor Yellow
    Write-Host "    Double-click: $launcherPath"
    Write-Host ""
    Write-Host "  Update:" -ForegroundColor Yellow
    Write-Host "    Double-click: $updatePath"
    Write-Host "    Or run:        iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/update.ps1)"
    Write-Host ""
    Write-Host "  Uninstall:" -ForegroundColor Yellow
    Write-Host "    iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/uninstall.ps1)"
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Magenta
}

# Refresh PATH after installing Node.js
function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# Run the installer
Install-AgenticOS -Dir $InstallDir -AppPort $Port
