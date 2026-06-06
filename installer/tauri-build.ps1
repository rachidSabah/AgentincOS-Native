# ═══════════════════════════════════════════════════════════════════════════════
# Agentic OS v2.0.0 — Tauri v2 Native Build Script (PowerShell)
# Builds the native Tauri .exe and .msi installers (requires Rust toolchain)
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [string]$OutputDir    = ".\dist",
    [string]$AppVersion   = "2.0.0",
    [switch]$Debug        = $false,
    [switch]$SkipFrontend = $false,
    [switch]$Verbose      = $false
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
Write-Host "  Agentic OS v$AppVersion — Tauri v2 Native Builder" -ForegroundColor Magenta
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# ─── Resolve Paths ────────────────────────────────────────────────────────────
$ScriptDir   = $PSScriptRoot
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$TauriDir    = Join-Path $ProjectRoot "src-tauri"
$OutputDir   = Join-Path $ProjectRoot $OutputDir

Write-Step "Project root: $ProjectRoot"
Write-Step "Tauri dir:    $TauriDir"
Write-Step "Output dir:   $OutputDir"

# ─── Step 1: Check for Rust Toolchain ────────────────────────────────────────
Write-Step "Checking for Rust toolchain..."

if (Test-Command "rustup") {
    $RustVersion = rustc --version
    Write-Success "Rust found: $RustVersion"
} else {
    Write-Warning "Rust not found. Attempting to install via rustup..."

    # Install rustup
    $RustupInstaller = "$env:TEMP\rustup-init.exe"
    Write-Step "Downloading rustup-init.exe..."
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $RustupInstaller -UseBasicParsing

    Write-Step "Running rustup installer (default installation)..."
    & $RustupInstaller -y
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorStep "rustup installation failed."
        Write-Host "    Please install Rust manually from https://rustup.rs"
        exit 1
    }

    # Refresh PATH
    $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

    # Verify
    if (Test-Command "rustc") {
        $RustVersion = rustc --version
        Write-Success "Rust installed: $RustVersion"
    } else {
        Write-ErrorStep "Rust installation verification failed."
        Write-Host "    Please restart your terminal and run this script again."
        exit 1
    }
}

# ─── Step 2: Add Windows MSVC Target ─────────────────────────────────────────
Write-Step "Configuring Windows target..."

rustup target add x86_64-pc-windows-msvc
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to add x86_64-pc-windows-msvc target (may already be installed)"
} else {
    Write-Success "Target x86_64-pc-windows-msvc ready"
}

# ─── Step 3: Check for Visual Studio Build Tools ─────────────────────────────
Write-Step "Checking for MSVC build tools..."

$VsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$HasMSVC = $false

if (Test-Path $VsWhere) {
    $VsPath = & $VsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($VsPath) {
        $HasMSVC = $true
        Write-Success "Visual Studio found: $VsPath"
    }
}

if (-not $HasMSVC) {
    # Check for Build Tools
    $BuildTools = & $VsWhere -latest -products Microsoft.VisualStudio.Product.BuildTools -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($BuildTools) {
        $HasMSVC = $true
        Write-Success "Build Tools found: $BuildTools"
    }
}

if (-not $HasMSVC) {
    Write-Warning "MSVC build tools not found."
    Write-Host "    Tauri requires the Visual Studio Build Tools with the C++ workload."
    Write-Host "    Install from: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    Write-Host "    Or run: winget install Microsoft.VisualStudio.2022.BuildTools"
    Write-Host ""
    Write-Host "    Select the 'Desktop development with C++' workload during installation."

    $InstallChoice = Read-Host "    Install Build Tools now? (y/n)"
    if ($InstallChoice -eq "y" -or $InstallChoice -eq "Y") {
        if (Test-Command "winget") {
            winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --includeRecommended"
        } else {
            Write-Host "    Please install manually and re-run this script."
            exit 1
        }
    } else {
        Write-ErrorStep "Cannot build Tauri without MSVC. Exiting."
        exit 1
    }
}

# ─── Step 4: Install WebView2 (if needed) ─────────────────────────────────────
Write-Step "Checking for WebView2 runtime..."
$WebView2Path = "${env:ProgramFiles(x86)}\Microsoft\EdgeCore"
if (Test-Path $WebView2Path) {
    Write-Success "WebView2 runtime found (via Edge)"
} else {
    Write-Warning "WebView2 runtime not found. Tauri requires it."
    Write-Host "    Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
}

# ─── Step 5: Install tauri-cli ────────────────────────────────────────────────
Write-Step "Checking for tauri-cli..."

if (Test-Command "cargo-tauri") {
    $TauriVersion = cargo tauri --version
    Write-Success "tauri-cli found: $TauriVersion"
} else {
    Write-Step "Installing tauri-cli via cargo..."
    cargo install tauri-cli
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorStep "Failed to install tauri-cli."
        exit 1
    }
    Write-Success "tauri-cli installed"
}

# ─── Step 6: Build Next.js Frontend ──────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Step "Building Next.js frontend..."

    Push-Location $ProjectRoot

    # Detect package manager
    $PackageManager = $null
    if (Test-Command "bun") {
        $PackageManager = "bun"
    } elseif (Test-Command "npm") {
        $PackageManager = "npm"
    }

    if ($PackageManager) {
        Write-Step "Using package manager: $PackageManager"

        # Install dependencies
        if ($PackageManager -eq "bun") {
            bun install
        } else {
            npm install
        }

        # Generate Prisma client
        if ($PackageManager -eq "bun") {
            bunx prisma generate 2>$null
        } else {
            npx prisma generate 2>$null
        }

        # Build
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
    } else {
        Write-ErrorStep "No package manager found (bun or npm required)."
        Pop-Location
        exit 1
    }

    Pop-Location
} else {
    Write-Warning "Skipping frontend build (--SkipFrontend flag)"
}

# ─── Step 7: Build Tauri Application ─────────────────────────────────────────
Write-Step "Building Tauri application..."

Push-Location $ProjectRoot

if ($Debug) {
    Write-Step "Building in DEBUG mode..."
    cargo tauri build --debug
} else {
    Write-Step "Building in RELEASE mode..."
    cargo tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-ErrorStep "Tauri build failed."
    Pop-Location
    exit 1
}

Write-Success "Tauri build completed"
Pop-Location

# ─── Step 8: Collect Output Artifacts ─────────────────────────────────────────
Write-Step "Collecting build artifacts..."

mkdir -Force $OutputDir | Out-Null

# NSIS installer
$NsisExe = Join-Path $TauriDir "target\release\bundle\nsis\AgenticOS_${AppVersion}_x64-setup.exe"
if (Test-Path $NsisExe) {
    Copy-Item $NsisExe $OutputDir -Force
    Write-Success "NSIS installer: $NsisExe"
} else {
    Write-Warning "NSIS installer not found at expected path"
    # Try alternate naming
    $AltNsis = Get-ChildItem (Join-Path $TauriDir "target\release\bundle\nsis") -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($AltNsis) {
        Copy-Item $AltNsis.FullName $OutputDir -Force
        Write-Success "NSIS installer found: $($AltNsis.Name)"
    }
}

# MSI installer
$MsiFile = Join-Path $TauriDir "target\release\bundle\msi\AgenticOS_${AppVersion}_x64_en-US.msi"
if (Test-Path $MsiFile) {
    Copy-Item $MsiFile $OutputDir -Force
    Write-Success "MSI installer: $MsiFile"
} else {
    Write-Warning "MSI installer not found at expected path"
    $AltMsi = Get-ChildItem (Join-Path $TauriDir "target\release\bundle\msi") -Filter "*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($AltMsi) {
        Copy-Item $AltMsi.FullName $OutputDir -Force
        Write-Success "MSI installer found: $($AltMsi.Name)"
    }
}

# ─── Step 9: Generate SHA256 Checksums ────────────────────────────────────────
Write-Step "Generating SHA256 checksums..."

$Artifacts = Get-ChildItem $OutputDir -Filter "AgenticOS*" | Where-Object {
    $_.Extension -in ".exe", ".msi"
}

foreach ($Artifact in $Artifacts) {
    $Hash = Get-FileHash -Path $Artifact.FullName -Algorithm SHA256
    $HashFile = Join-Path $OutputDir "$($Artifact.Name).sha256"
    "$($Hash.Hash.ToLower())  $($Artifact.Name)" | Set-Content -Path $HashFile -Encoding UTF8
    Write-Success "SHA256 ($($Artifact.Name)): $($Hash.Hash.ToLower())"

    $SizeMB = [math]::Round($Artifact.Length / 1MB, 2)
    Write-Success "Size: $SizeMB MB"
}

# ─── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Tauri Build Complete!" -ForegroundColor Green
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

foreach ($Artifact in $Artifacts) {
    $SizeMB = [math]::Round($Artifact.Length / 1MB, 2)
    Write-Host "  $($Artifact.Name) ($SizeMB MB)" -ForegroundColor White
    Write-Host "  -> $($Artifact.FullName)" -ForegroundColor DarkGray
    Write-Host "  -> $($Artifact.FullName).sha256" -ForegroundColor DarkGray
    Write-Host ""
}

exit 0
