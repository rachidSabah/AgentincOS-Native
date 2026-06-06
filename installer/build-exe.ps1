# ═══════════════════════════════════════════════════════════════════════════════
# Agentic OS v2.0.0 — Windows Installer Builder (PowerShell)
# Builds the NSIS-based .exe installer on Windows 10/11
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [string]$OutputDir   = ".\dist",
    [string]$AppName     = "Agentic OS",
    [string]$AppVersion  = "2.0.0",
    [string]$SetupName   = "AgenticOS-Setup-2.0.0.exe",
    [switch]$SkipBuild   = $false,
    [switch]$SkipNSIS    = $false,
    [switch]$Verbose     = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

# ─── Helper Functions ─────────────────────────────────────────────────────────
function Write-Step {
    param([string]$Message)
    Write-Host "`n>>> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "    OK: $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "    WARNING: $Message" -ForegroundColor Yellow
}

function Write-ErrorStep {
    param([string]$Message)
    Write-Host "    ERROR: $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Name)
    try {
        Get-Command $Name -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# ─── Banner ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  Agentic OS v$AppVersion — Installer Builder" -ForegroundColor Magenta
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# ─── Resolve Paths ────────────────────────────────────────────────────────────
$ScriptDir   = $PSScriptRoot
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$StagingDir  = Join-Path $ScriptDir "stage"
$OutputDir   = Join-Path $ProjectRoot $OutputDir

Write-Step "Project root: $ProjectRoot"
Write-Step "Staging dir:  $StagingDir"
Write-Step "Output dir:   $OutputDir"

# ─── Step 1: Check / Install NSIS ────────────────────────────────────────────
Write-Step "Checking for NSIS (makensis)..."

$NSISPath = $null
if (Test-Command "makensis") {
    $NSISPath = "makensis"
    Write-Success "makensis found in PATH"
} elseif (Test-Path "C:\Program Files (x86)\NSIS\makensis.exe") {
    $NSISPath = "C:\Program Files (x86)\NSIS\makensis.exe"
    Write-Success "NSIS found at default install location"
} elseif (Test-Path "C:\Program Files\NSIS\makensis.exe") {
    $NSISPath = "C:\Program Files\NSIS\makensis.exe"
    Write-Success "NSIS found at default install location"
} else {
    Write-Warning "NSIS not found. Attempting to install..."

    # Try winget first
    if (Test-Command "winget") {
        Write-Step "Installing NSIS via winget..."
        winget install --id NSIS.NSIS --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) {
            $NSISPath = "C:\Program Files (x86)\NSIS\makensis.exe"
            Write-Success "NSIS installed via winget"
        }
    }

    # Fallback to chocolatey
    if (-not $NSISPath -and (Test-Command "choco")) {
        Write-Step "Installing NSIS via Chocolatey..."
        choco install nsis -y
        if ($LASTEXITCODE -eq 0) {
            $NSISPath = "C:\Program Files (x86)\NSIS\makensis.exe"
            Write-Success "NSIS installed via Chocolatey"
        }
    }

    if (-not $NSISPath) {
        Write-ErrorStep "Could not install NSIS automatically."
        Write-Host "    Please install NSIS manually from https://nsis.sourceforge.io/Download"
        Write-Host "    Or run: winget install NSIS.NSIS"
        if (-not $SkipNSIS) {
            exit 1
        }
    }
}

# ─── Step 2: Build the Next.js App ───────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step "Building Next.js application..."

    Push-Location $ProjectRoot

    # Check for npm/bun
    $PackageManager = $null
    if (Test-Command "bun") {
        $PackageManager = "bun"
    } elseif (Test-Command "npm") {
        $PackageManager = "npm"
    } else {
        Write-ErrorStep "Neither bun nor npm found. Please install Node.js first."
        Pop-Location
        exit 1
    }

    Write-Step "Using package manager: $PackageManager"

    # Install dependencies
    Write-Step "Installing dependencies..."
    if ($PackageManager -eq "bun") {
        bun install
    } else {
        npm install
    }
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorStep "Dependency installation failed."
        Pop-Location
        exit 1
    }
    Write-Success "Dependencies installed"

    # Generate Prisma client
    Write-Step "Generating Prisma client..."
    if ($PackageManager -eq "bun") {
        bunx prisma generate
    } else {
        npx prisma generate
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Prisma generate failed (non-fatal, will continue)"
    }

    # Build Next.js
    Write-Step "Running Next.js build..."
    if ($PackageManager -eq "bun") {
        bun run build
    } else {
        npm run build
    }
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorStep "Next.js build failed."
        Pop-Location
        exit 1
    }
    Write-Success "Next.js build completed"

    Pop-Location
} else {
    Write-Warning "Skipping build (--SkipBuild flag)"
}

# ─── Step 3: Create Staging Directory ────────────────────────────────────────
Write-Step "Creating staging directory..."

# Clean previous staging
if (Test-Path $StagingDir) {
    Remove-Item $StagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

# Stage Next.js standalone output
$StandaloneDir = Join-Path $ProjectRoot ".next\standalone"
if (-not (Test-Path $StandaloneDir)) {
    Write-ErrorStep "Standalone build not found at $StandaloneDir"
    Write-Host "    Make sure next.config.ts has 'output: standalone' and build succeeded."
    exit 1
}

Write-Step "Staging .next/standalone/..."
Copy-Item -Path $StandaloneDir -Destination (Join-Path $StagingDir ".next\standalone") -Recurse -Force
Write-Success "Standalone output staged"

# Stage .next/static (needed alongside standalone)
$StaticDir = Join-Path $ProjectRoot ".next\static"
if (Test-Path $StaticDir) {
    Write-Step "Staging .next/static/..."
    New-Item -ItemType Directory -Path (Join-Path $StagingDir ".next\static") -Force | Out-Null
    Copy-Item -Path "$StaticDir\*" -Destination (Join-Path $StagingDir ".next\static") -Recurse -Force
    Write-Success "Static files staged"
}

# Stage public directory
$PublicDir = Join-Path $ProjectRoot "public"
if (Test-Path $PublicDir) {
    Write-Step "Staging public/..."
    Copy-Item -Path $PublicDir -Destination (Join-Path $StagingDir "public") -Recurse -Force
    Write-Success "Public assets staged"
}

# Stage database directory
$DbDir = Join-Path $ProjectRoot "db"
if (Test-Path $DbDir) {
    Write-Step "Staging db/..."
    Copy-Item -Path $DbDir -Destination (Join-Path $StagingDir "db") -Recurse -Force
    Write-Success "Database directory staged"
} else {
    Write-Warning "No db/ directory found, creating empty one"
    New-Item -ItemType Directory -Path (Join-Path $StagingDir "db") -Force | Out-Null
}

# Stage prisma directory
$PrismaDir = Join-Path $ProjectRoot "prisma"
if (Test-Path $PrismaDir) {
    Write-Step "Staging prisma/..."
    Copy-Item -Path $PrismaDir -Destination (Join-Path $StagingDir "prisma") -Recurse -Force
    Write-Success "Prisma schema staged"
}

# Stage node_modules (for prisma CLI etc.)
$NodeModulesDir = Join-Path $ProjectRoot "node_modules"
if (Test-Path $NodeModulesDir) {
    Write-Step "Staging node_modules/ (this may take a moment)..."
    # Only copy essential packages, not everything
    New-Item -ItemType Directory -Path (Join-Path $StagingDir "node_modules") -Force | Out-Null
    $essentialPackages = @(".prisma", "@prisma", "prisma")
    foreach ($pkg in $essentialPackages) {
        $pkgPath = Join-Path $NodeModulesDir $pkg
        if (Test-Path $pkgPath) {
            Copy-Item -Path $pkgPath -Destination (Join-Path $StagingDir "node_modules\$pkg") -Recurse -Force
        }
    }
    Write-Success "Essential node_modules staged"
}

# Copy license file
$LicenseFile = Join-Path $ProjectRoot "LICENSE.txt"
if (-not (Test-Path $LicenseFile)) {
    # Create a default license file
    $LicenseContent = @"
Agentic OS v2.0.0
Copyright (c) 2024 AgenticOS Team

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"@
    Set-Content -Path (Join-Path $ScriptDir "LICENSE.txt") -Value $LicenseContent -Encoding UTF8
    Write-Success "Created default LICENSE.txt"
}

# Copy icon
$IconSrc = Join-Path $ProjectRoot "src-tauri\icons\icon.ico"
$IconDst = Join-Path $ScriptDir "icon.ico"
if (Test-Path $IconSrc) {
    Copy-Item -Path $IconSrc -Destination $IconDst -Force
    Write-Success "Icon file staged"
} else {
    Write-Warning "No icon.ico found in src-tauri/icons/"
}

Write-Success "Staging directory ready"

# ─── Step 4: Compile NSIS Installer ──────────────────────────────────────────
if (-not $SkipNSIS -and $NSISPath) {
    Write-Step "Compiling NSIS installer..."

    Push-Location $ScriptDir

    $NsisArgs = @(
        "/V2",
        "/DAPP_NAME=`"$AppName`"",
        "/DAPP_VERSION=`"$AppVersion`"",
        "installer.nsi"
    )

    & $NSISPath @NsisArgs

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorStep "NSIS compilation failed."
        Pop-Location
        exit 1
    }

    Pop-Location
    Write-Success "NSIS installer compiled"
} else {
    Write-Warning "Skipping NSIS compilation (--SkipNSIS or NSIS not available)"
}

# ─── Step 5: Move Output & Generate Checksum ─────────────────────────────────
Write-Step "Finalizing output..."

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Move the installer exe to the output directory
$InstallerExe = Join-Path $ScriptDir $SetupName
$OutputExe    = Join-Path $OutputDir $SetupName

if (Test-Path $InstallerExe) {
    Move-Item -Path $InstallerExe -Destination $OutputExe -Force
    Write-Success "Installer moved to: $OutputExe"

    # Generate SHA256 checksum
    Write-Step "Generating SHA256 checksum..."
    $Hash = Get-FileHash -Path $OutputExe -Algorithm SHA256
    $HashFile = Join-Path $OutputDir "$SetupName.sha256"
    "$($Hash.Hash.ToLower())  $SetupName" | Set-Content -Path $HashFile -Encoding UTF8
    Write-Success "SHA256: $($Hash.Hash.ToLower())"

    # Get file size
    $FileInfo = Get-Item $OutputExe
    $SizeMB = [math]::Round($FileInfo.Length / 1MB, 2)
    Write-Success "File size: $SizeMB MB"
} else {
    Write-Warning "Installer .exe not found at $InstallerExe"
    Write-Warning "The NSIS compilation may have produced a different filename."
}

# ─── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Installer:     $OutputExe" -ForegroundColor White
Write-Host "  Checksum:      $OutputDir\$SetupName.sha256" -ForegroundColor White
Write-Host "  App:           $AppName v$AppVersion" -ForegroundColor White
Write-Host ""

# ─── Cleanup Staging ─────────────────────────────────────────────────────────
Write-Step "Cleaning up staging directory..."
# Uncomment the next line to auto-clean:
# Remove-Item $StagingDir -Recurse -Force
Write-Warning "Staging directory preserved at: $StagingDir"
Write-Host "  (Delete manually if not needed, or re-run to overwrite)" -ForegroundColor DarkGray

exit 0
