# =================================================================
#  Agentic OS Ultimate Edition V5.0 - Windows PowerShell Updater
#  https://github.com/rachidSabah/Agentic-os
#
#  Usage:
#    iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/update.ps1)
# =================================================================

param(
    [string]$InstallDir = "$env:USERPROFILE\Agentic-os"
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
    Write-Host ""
    Write-Host "  $message" -ForegroundColor Cyan
}

function Write-OK($message) {
    Write-Host "  OK $message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "  WARN $message" -ForegroundColor Yellow
}

function Write-Fail($message) {
    Write-Host "  ERROR $message" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Magenta
Write-Host "   Agentic OS V5.0 - Updater" -ForegroundColor Magenta
Write-Host "===============================================================" -ForegroundColor Magenta

# Find the installation directory
$Dir = $InstallDir

# Try common locations if default doesn't exist
if (-not (Test-Path $Dir)) {
    $candidates = @(
        "$env:USERPROFILE\Agentic-os",
        "$env:USERPROFILE\Documents\Agentic-os",
        "$env:USERPROFILE\Documents\gemini-projects\Agentic-os",
        "$env:USERPROFILE\Documents\gemini-projects\agentic-os"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $Dir = $c
            break
        }
    }
}

# Try to find it by searching for package.json with name "agentic-os"
if (-not (Test-Path $Dir)) {
    Write-Step "Searching for Agentic OS installation..."
    $found = Get-ChildItem -Path $env:USERPROFILE -Filter "package.json" -Recurse -Depth 4 -ErrorAction SilentlyContinue |
        Where-Object { (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match '"name":\s*"agentic-os"' } |
        Select-Object -First 1

    if ($found) {
        $Dir = Split-Path $found.FullName
        Write-OK "Found at: $Dir"
    }
}

if (-not (Test-Path $Dir)) {
    Write-Fail "Could not find Agentic OS installation."
    Write-Host ""
    Write-Host "  Please specify the install directory:" -ForegroundColor Yellow
    Write-Host '  iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/update.ps1) -InstallDir "C:\path\to\Agentic-os"'
    Write-Host ""
    Write-Host "  Or install fresh:" -ForegroundColor Yellow
    Write-Host "  iex (irm https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.ps1)"
    Write-Host ""
    exit 1
}

# Verify it's actually an Agentic OS installation
$pkgJson = Join-Path $Dir "package.json"
if (-not (Test-Path $pkgJson)) {
    Write-Fail "No package.json found at: $Dir"
    Write-Fail "This does not appear to be an Agentic OS installation."
    exit 1
}

$pkgContent = Get-Content $pkgJson -Raw
if ($pkgContent -notmatch '"agentic-os"') {
    Write-Fail "The directory $Dir does not appear to be Agentic OS."
    exit 1
}

Write-OK "Found Agentic OS at: $Dir"
Push-Location $Dir

# Step 1: Check for git
Write-Step "Checking git..."
try {
    $null = Get-Command git -ErrorAction Stop
    Write-OK "Git available"
} catch {
    Write-Fail "Git is not installed. Install it from https://git-scm.com"
    Pop-Location
    exit 1
}

# Step 2: Check current version
Write-Step "Reading current version..."
$currentVersion = "unknown"
try {
    $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
    $currentVersion = $pkg.version
    Write-OK "Current version: $currentVersion"
} catch {
    Write-Warn "Could not read version from package.json"
}

# Step 3: Get current branch
Write-Step "Checking git status..."
$currentBranch = "main"
try {
    $currentBranch = (git branch --show-current 2>$null).Trim()
    if ([string]::IsNullOrWhiteSpace($currentBranch)) {
        $currentBranch = "main"
    }
    Write-OK "Current branch: $currentBranch"
} catch {
    Write-Warn "Could not determine branch, defaulting to main"
}

# Check for uncommitted changes
$hasChanges = $false
try {
    $status = git status --porcelain 2>$null
    if ($status -and $status.Trim().Length -gt 0) {
        $hasChanges = $true
        Write-Warn "You have uncommitted changes. Stashing before update..."
        git stash 2>$null
    }
} catch {
    # Not critical
}

# Step 4: Fetch from GitHub
Write-Step "Fetching latest from GitHub..."
try {
    git fetch origin 2>$null
    Write-OK "Fetched latest refs"
} catch {
    Write-Fail "Could not fetch from GitHub. Check your internet connection."
    Pop-Location
    exit 1
}

# Step 5: Check what's new
Write-Step "Checking for new commits..."
$behind = 0
try {
    $aheadBehind = git rev-list --left-right --count "HEAD...origin/$currentBranch" 2>$null
    if ($aheadBehind) {
        $parts = $aheadBehind.Trim() -split '\s+'
        $behind = [int]$parts[1]
    }
} catch {
    # Can't determine — proceed with pull anyway
}

if ($behind -gt 0) {
    Write-OK "Found $behind new commit(s) available"
} else {
    Write-OK "Already up to date with remote"
}

# Step 6: Pull updates
Write-Step "Pulling updates..."
try {
    git reset --hard "origin/$currentBranch" 2>$null
    Write-OK "Updated to latest from origin/$currentBranch"
} catch {
    Write-Warn "Reset failed, trying pull instead..."
    try {
        git pull --rebase origin $currentBranch 2>$null
        Write-OK "Pulled latest changes"
    } catch {
        Write-Fail "Could not pull updates. Try manually: git pull origin main"
        Pop-Location
        exit 1
    }
}

# Restore stashed changes
if ($hasChanges) {
    try {
        git stash pop 2>$null
        Write-OK "Restored your local changes"
    } catch {
        Write-Warn "Could not restore stashed changes. Check git stash list."
    }
}

# Step 7: Install dependencies (if package.json changed)
Write-Step "Checking dependencies..."
$depsUpdated = $false
try {
    $diffResult = git diff HEAD~1 --name-only package.json 2>$null
    if ($diffResult -and $diffResult.Contains("package.json")) {
        Write-Host "  package.json changed, updating dependencies..." -ForegroundColor Yellow
        if (Get-Command bun -ErrorAction SilentlyContinue) {
            bun install
        } else {
            npm install
        }
        $depsUpdated = $true
        Write-OK "Dependencies updated"
    } else {
        Write-OK "No dependency changes needed"
    }
} catch {
    # Not critical — install anyway to be safe
    Write-Host "  Ensuring dependencies are up to date..." -ForegroundColor Yellow
    try {
        if (Get-Command bun -ErrorAction SilentlyContinue) {
            bun install
        } else {
            npm install
        }
        $depsUpdated = $true
        Write-OK "Dependencies verified"
    } catch {
        Write-Warn "Could not update dependencies. Run 'npm install' manually."
    }
}

# Step 8: Rebuild
Write-Step "Rebuilding project..."
try {
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        bun run build
    } else {
        npm run build
    }
    Write-OK "Build complete"
} catch {
    Write-Warn "Build failed. You can still use dev mode: npm run dev"
}

# Step 9: Read new version
$newVersion = $currentVersion
try {
    $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
    $newVersion = $pkg.version
} catch {
    # Keep current version
}

# Step 10: Clear .next cache
try {
    $nextDir = Join-Path $Dir ".next"
    if (Test-Path $nextDir) {
        Remove-Item -Path $nextDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-OK "Cleared build cache"
    }
} catch {
    # Not critical
}

Pop-Location

# Summary
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Magenta
if ($newVersion -ne $currentVersion) {
    Write-Host "   Updated: $currentVersion -> $newVersion" -ForegroundColor Green
} else {
    Write-Host "   Agentic OS is up to date: v$newVersion" -ForegroundColor Green
}
Write-Host "===============================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Restart Agentic OS to apply changes:" -ForegroundColor Yellow
Write-Host "    cd $Dir"
Write-Host "    npm start"
Write-Host ""
Write-Host "  Or double-click: $Dir\start-agentic-os.bat" -ForegroundColor Yellow
Write-Host ""
