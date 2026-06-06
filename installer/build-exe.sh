#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Agentic OS v2.0.0 — Linux/CI Installer Builder
# Prepares and compiles the NSIS .exe installer on Linux (for CI/CD)
# Works on Ubuntu 22.04+ and other Debian-based distros
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
APP_NAME="Agentic OS"
APP_VERSION="2.0.0"
SETUP_NAME="AgenticOS-Setup-${APP_VERSION}.exe"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STAGING_DIR="${SCRIPT_DIR}/stage"
OUTPUT_DIR="${PROJECT_ROOT}/dist"
SKIP_BUILD=false
SKIP_NSIS=false

# ─── Parse Arguments ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)   SKIP_BUILD=true;  shift ;;
        --skip-nsis)    SKIP_NSIS=true;   shift ;;
        --output-dir)   OUTPUT_DIR="$2";  shift 2 ;;
        --version)      APP_VERSION="$2"; shift 2 ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build      Skip the Next.js build step"
            echo "  --skip-nsis       Skip NSIS compilation (staging only)"
            echo "  --output-dir DIR  Output directory (default: ./dist)"
            echo "  --version VER     Override version (default: 2.0.0)"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ─── Helper Functions ─────────────────────────────────────────────────────────
step()   { echo -e "\n\033[36m>>> $1\033[0m"; }
ok()     { echo -e "    \033[32mOK:\033[0m $1"; }
warn()   { echo -e "    \033[33mWARNING:\033[0m $1"; }
err()    { echo -e "    \033[31mERROR:\033[0m $1"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo "  ══════════════════════════════════════════════"
echo "  Agentic OS v${APP_VERSION} — Linux Installer Builder"
echo "  ══════════════════════════════════════════════"
echo ""

step "Project root: ${PROJECT_ROOT}"
step "Staging dir:  ${STAGING_DIR}"
step "Output dir:   ${OUTPUT_DIR}"

# ─── Step 1: Build the Next.js App ───────────────────────────────────────────
if [[ "${SKIP_BUILD}" == "false" ]]; then
    step "Building Next.js application..."

    cd "${PROJECT_ROOT}"

    # Detect package manager
    PKG_MGR=""
    if command -v bun &>/dev/null; then
        PKG_MGR="bun"
    elif command -v npm &>/dev/null; then
        PKG_MGR="npm"
    else
        err "Neither bun nor npm found. Please install Node.js first."
        exit 1
    fi

    step "Using package manager: ${PKG_MGR}"

    # Install dependencies
    step "Installing dependencies..."
    if [[ "${PKG_MGR}" == "bun" ]]; then
        bun install
    else
        npm install
    fi
    ok "Dependencies installed"

    # Generate Prisma client
    step "Generating Prisma client..."
    if [[ "${PKG_MGR}" == "bun" ]]; then
        bunx prisma generate || warn "Prisma generate failed (non-fatal)"
    else
        npx prisma generate || warn "Prisma generate failed (non-fatal)"
    fi

    # Build Next.js
    step "Running Next.js build..."
    if [[ "${PKG_MGR}" == "bun" ]]; then
        bun run build
    else
        npm run build
    fi

    if [[ $? -ne 0 ]]; then
        err "Next.js build failed."
        exit 1
    fi
    ok "Next.js build completed"
else
    warn "Skipping build (--skip-build flag)"
fi

# ─── Step 2: Create Staging Directory ────────────────────────────────────────
step "Creating staging directory..."

rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}"

# Stage Next.js standalone output
STANDALONE_DIR="${PROJECT_ROOT}/.next/standalone"
if [[ ! -d "${STANDALONE_DIR}" ]]; then
    err "Standalone build not found at ${STANDALONE_DIR}"
    echo "    Make sure next.config.ts has 'output: standalone' and build succeeded."
    exit 1
fi

step "Staging .next/standalone/..."
mkdir -p "${STAGING_DIR}/.next/standalone"
cp -r "${STANDALONE_DIR}/." "${STAGING_DIR}/.next/standalone/"
ok "Standalone output staged"

# Stage .next/static (needed alongside standalone)
STATIC_DIR="${PROJECT_ROOT}/.next/static"
if [[ -d "${STATIC_DIR}" ]]; then
    step "Staging .next/static/..."
    mkdir -p "${STAGING_DIR}/.next/static"
    cp -r "${STATIC_DIR}/." "${STAGING_DIR}/.next/static/"
    ok "Static files staged"
fi

# Stage public directory
PUBLIC_DIR="${PROJECT_ROOT}/public"
if [[ -d "${PUBLIC_DIR}" ]]; then
    step "Staging public/..."
    cp -r "${PUBLIC_DIR}" "${STAGING_DIR}/public"
    ok "Public assets staged"
fi

# Stage database directory
DB_DIR="${PROJECT_ROOT}/db"
if [[ -d "${DB_DIR}" ]]; then
    step "Staging db/..."
    cp -r "${DB_DIR}" "${STAGING_DIR}/db"
    ok "Database directory staged"
else
    warn "No db/ directory found, creating empty one"
    mkdir -p "${STAGING_DIR}/db"
fi

# Stage prisma directory
PRISMA_DIR="${PROJECT_ROOT}/prisma"
if [[ -d "${PRISMA_DIR}" ]]; then
    step "Staging prisma/..."
    cp -r "${PRISMA_DIR}" "${STAGING_DIR}/prisma"
    ok "Prisma schema staged"
fi

# Stage essential node_modules
NODE_MODULES_DIR="${PROJECT_ROOT}/node_modules"
if [[ -d "${NODE_MODULES_DIR}" ]]; then
    step "Staging essential node_modules/..."
    mkdir -p "${STAGING_DIR}/node_modules"
    for pkg in .prisma @prisma prisma; do
        if [[ -d "${NODE_MODULES_DIR}/${pkg}" ]]; then
            cp -r "${NODE_MODULES_DIR}/${pkg}" "${STAGING_DIR}/node_modules/"
        fi
    done
    ok "Essential node_modules staged"
fi

# Create license file if not present
LICENSE_FILE="${SCRIPT_DIR}/LICENSE.txt"
if [[ ! -f "${LICENSE_FILE}" ]]; then
    cat > "${LICENSE_FILE}" << 'LICENSEEOF'
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
LICENSEEOF
    ok "Created default LICENSE.txt"
fi

# Copy icon if available
ICON_SRC="${PROJECT_ROOT}/src-tauri/icons/icon.ico"
ICON_DST="${SCRIPT_DIR}/icon.ico"
if [[ -f "${ICON_SRC}" ]]; then
    cp "${ICON_SRC}" "${ICON_DST}"
    ok "Icon file staged"
else
    warn "No icon.ico found in src-tauri/icons/"
fi

ok "Staging directory ready"

# ─── Step 3: Install NSIS (if available) ─────────────────────────────────────
MAKENSIS=""
if command -v makensis &>/dev/null; then
    MAKENSIS="makensis"
    ok "makensis found in PATH"
else
    step "Installing NSIS..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq nsis
        if command -v makensis &>/dev/null; then
            MAKENSIS="makensis"
            ok "NSIS installed via apt"
        fi
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y nsis
        if command -v makensis &>/dev/null; then
            MAKENSIS="makensis"
            ok "NSIS installed via dnf"
        fi
    elif command -v brew &>/dev/null; then
        brew install nsis
        if command -v makensis &>/dev/null; then
            MAKENSIS="makensis"
            ok "NSIS installed via Homebrew"
        fi
    fi
fi

# ─── Step 4: Compile NSIS Installer ──────────────────────────────────────────
if [[ "${SKIP_NSIS}" == "false" && -n "${MAKENSIS}" ]]; then
    step "Compiling NSIS installer..."

    cd "${SCRIPT_DIR}"

    "${MAKENSIS}" /V2 /DAPP_NAME="${APP_NAME}" /DAPP_VERSION="${APP_VERSION}" installer.nsi

    if [[ $? -ne 0 ]]; then
        err "NSIS compilation failed."
        exit 1
    fi
    ok "NSIS installer compiled"
elif [[ "${SKIP_NSIS}" == "true" ]]; then
    warn "Skipping NSIS compilation (--skip-nsis flag)"
else
    warn "NSIS not available. Creating self-extracting archive as fallback..."

    # ─── Fallback: Create a self-extracting archive ──────────────────────────
    step "Creating self-extracting .7z archive..."

    if command -v 7z &>/dev/null; then
        mkdir -p "${OUTPUT_DIR}"
        cd "${STAGING_DIR}"

        # Create a 7z SFX archive
        7z a -sfx7z.sfx "${OUTPUT_DIR}/AgenticOS-Portable-${APP_VERSION}.exe" . 2>/dev/null || true

        if [[ $? -eq 0 ]]; then
            ok "Self-extracting archive created"
        else
            # If 7z SFX fails, just create a regular .tar.gz
            warn "7z SFX creation failed, creating .tar.gz instead..."
            tar -czf "${OUTPUT_DIR}/AgenticOS-${APP_VERSION}.tar.gz" .
            ok "Archive created: ${OUTPUT_DIR}/AgenticOS-${APP_VERSION}.tar.gz"
        fi
    elif command -v tar &>/dev/null; then
        mkdir -p "${OUTPUT_DIR}"
        cd "${STAGING_DIR}"
        tar -czf "${OUTPUT_DIR}/AgenticOS-${APP_VERSION}.tar.gz" .
        ok "Archive created: ${OUTPUT_DIR}/AgenticOS-${APP_VERSION}.tar.gz"
    else
        err "Neither 7z nor tar available for archive creation."
    fi
fi

# ─── Step 5: Move Output & Generate Checksum ─────────────────────────────────
step "Finalizing output..."

mkdir -p "${OUTPUT_DIR}"

# Check for the NSIS-built installer
INSTALLER_EXE="${SCRIPT_DIR}/${SETUP_NAME}"
OUTPUT_EXE="${OUTPUT_DIR}/${SETUP_NAME}"

if [[ -f "${INSTALLER_EXE}" ]]; then
    mv "${INSTALLER_EXE}" "${OUTPUT_EXE}"
    ok "Installer moved to: ${OUTPUT_EXE}"

    # Generate SHA256 checksum
    step "Generating SHA256 checksum..."
    if command -v sha256sum &>/dev/null; then
        cd "${OUTPUT_DIR}"
        sha256sum "${SETUP_NAME}" > "${SETUP_NAME}.sha256"
        HASH=$(cat "${SETUP_NAME}.sha256" | cut -d' ' -f1)
        ok "SHA256: ${HASH}"
    elif command -v shasum &>/dev/null; then
        cd "${OUTPUT_DIR}"
        shasum -a 256 "${SETUP_NAME}" > "${SETUP_NAME}.sha256"
        HASH=$(cat "${SETUP_NAME}.sha256" | cut -d' ' -f1)
        ok "SHA256: ${HASH}"
    fi

    # Get file size
    if [[ -f "${OUTPUT_EXE}" ]]; then
        SIZE_BYTES=$(stat -c%s "${OUTPUT_EXE}" 2>/dev/null || stat -f%z "${OUTPUT_EXE}" 2>/dev/null || echo "unknown")
        if [[ "${SIZE_BYTES}" != "unknown" ]]; then
            SIZE_MB=$(echo "scale=2; ${SIZE_BYTES} / 1048576" | bc 2>/dev/null || echo "${SIZE_BYTES} bytes")
            ok "File size: ${SIZE_MB} MB"
        fi
    fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "  ══════════════════════════════════════════════"
echo -e "  \033[32mBuild Complete!\033[0m"
echo "  ══════════════════════════════════════════════"
echo ""
echo "  App:           ${APP_NAME} v${APP_VERSION}"
if [[ -f "${OUTPUT_EXE}" ]]; then
    echo "  Installer:     ${OUTPUT_EXE}"
    echo "  Checksum:      ${OUTPUT_DIR}/${SETUP_NAME}.sha256"
else
    echo "  Archive:       ${OUTPUT_DIR}/AgenticOS-${APP_VERSION}.tar.gz"
fi
echo ""

# ─── Cleanup ──────────────────────────────────────────────────────────────────
warn "Staging directory preserved at: ${STAGING_DIR}"
echo "  (Delete manually if not needed, or re-run to overwrite)"

exit 0
