#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║                    AGENTIC OS — One-Command Install                 ║
# ║   7-Layer Agentic AI Stack Dashboard + Hermes Agent Integration     ║
# ║                                                                      ║
# ║   Works on: Linux, macOS, WSL2, Windows (Git Bash/MSYS2)           ║
# ║                                                                      ║
# ║   Usage:                                                             ║
# ║     curl -fsSL https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.sh | bash   ║
# ║     — or —                                                           ║
# ║     git clone https://github.com/rachidSabah/Agentic-os.git         ║
# ║     cd Agentic-os && chmod +x install.sh && ./install.sh            ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -euo pipefail

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Config ───
INSTALL_DIR="$HOME/.agentic-os"
REPO_URL="https://github.com/rachidSabah/Agentic-os.git"
NODE_MIN="18"
NPM_CMD=""

# ─── Banner ───
banner() {
  echo ""
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║${NC}                                                              ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}   █████╗ ███████╗███████╗███████╗███╗   ██╗ ██████╗ ██╗     ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}  ██╔══██╗╚══███╔╝██╔════╝██╔════╝████╗  ██║██╔════╝ ██║     ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}  ███████║  ███╔╝ █████╗  ███████╗██╔██╗ ██║██║  ███╗██║     ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}  ██╔══██║ ███╔╝  ██╔══╝  ╚════██║██║╚██╗██║██║   ██║██║     ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}  ██║  ██║███████╗███████╗███████║██║ ╚████║╚██████╔╝███████╗${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}  ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}                                                              ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${BOLD}7-Layer Agentic AI Stack Dashboard${NC}                        ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}  ${YELLOW}Hermes Agent • Claude • OpenClaw • Self Vault${NC}            ${PURPLE}║${NC}"
  echo -e "${PURPLE}║${NC}                                                              ${PURPLE}║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ─── Helpers ───
info()  { echo -e "  ${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "  ${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "  ${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "  ${RED}[FAIL]${NC}  $1"; exit 1; }

detect_os() {
  local os_name=""
  case "$(uname -s)" in
    Linux*)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        os_name="wsl"
        info "Detected: ${BOLD}WSL2 on Windows${NC}"
      else
        os_name="linux"
        info "Detected: ${BOLD}Linux${NC}"
      fi
      ;;
    Darwin*)
      os_name="macos"
      info "Detected: ${BOLD}macOS${NC}"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      os_name="windows"
      info "Detected: ${BOLD}Windows (Git Bash)${NC}"
      ;;
    *)
      os_name="unknown"
      warn "Unknown OS: $(uname -s) — will try generic Linux flow"
      ;;
  esac
  echo "$os_name"
}

check_node() {
  if command -v node &>/dev/null; then
    local ver=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$ver" -ge "$NODE_MIN" ]; then
      ok "Node.js $(node -v) found"
      return 0
    else
      warn "Node.js $(node -v) found, but v${NODE_MIN}+ required"
      return 1
    fi
  else
    warn "Node.js not found"
    return 1
  fi
}

install_node() {
  info "Installing Node.js via ${BOLD}nvm${NC}..."

  # Install nvm if not present
  if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi

  # Source nvm
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  nvm install 22
  nvm use 22
  nvm alias default 22

  ok "Node.js $(node -v) installed via nvm"
}

install_node_windows() {
  info "Installing Node.js on Windows..."

  if command -v winget &>/dev/null; then
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    ok "Node.js installed via winget"
  elif command -v choco &>/dev/null; then
    choco install nodejs-lts -y
    ok "Node.js installed via Chocolatey"
  elif command -v scoop &>/dev/null; then
    scoop install nodejs-lts
    ok "Node.js installed via Scoop"
  else
    warn "No Windows package manager found (winget/choco/scoop)"
    info "Please install Node.js manually: https://nodejs.org/"
    info "Then re-run this script."
    return 1
  fi
}

check_npm() {
  if command -v npm &>/dev/null; then
    NPM_CMD="npm"
    ok "npm $(npm -v) found"
  elif command -v bun &>/dev/null; then
    NPM_CMD="bun"
    ok "bun $(bun -v) found"
  else
    warn "No package manager found (npm/bun)"
    return 1
  fi
}

install_hermes() {
  if command -v hermes &>/dev/null; then
    ok "Hermes Agent already installed: $(hermes --version 2>/dev/null || echo 'unknown version')"
    return 0
  fi

  info "Installing ${BOLD}Hermes Agent${NC}..."
  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

  # Reload PATH
  export PATH="$HOME/.local/bin:$PATH"
  if [ -f "$HOME/.bashrc" ]; then source "$HOME/.bashrc" 2>/dev/null || true; fi

  if command -v hermes &>/dev/null; then
    ok "Hermes Agent installed: $(hermes --version 2>/dev/null || echo 'OK')"
  else
    warn "Hermes Agent installation may require shell restart. Run: source ~/.bashrc"
  fi
}

# ─── Main Install ───
main() {
  banner

  local os
  os=$(detect_os)

  # Step 1: Prerequisites
  echo ""
  echo -e "${BOLD}${PURPLE}━━━ Step 1: Prerequisites ━━━${NC}"
  echo ""

  if ! check_node; then
    case "$os" in
      wsl|linux|macos) install_node ;;
      windows) install_node_windows ;;
      *) warn "Please install Node.js v${NODE_MIN}+ manually and re-run"; exit 1 ;;
    esac
  fi

  check_npm || fail "No package manager available after Node.js install"

  # Step 2: Clone / Update
  echo ""
  echo -e "${BOLD}${PURPLE}━━━ Step 2: Download Agentic OS ━━━${NC}"
  echo ""

  if [ -d "$INSTALL_DIR" ]; then
    info "Existing installation found at ${INSTALL_DIR}"
    info "Updating..."
    cd "$INSTALL_DIR"
    git pull --ff-only 2>/dev/null || warn "Could not git pull — continuing with existing code"
  else
    info "Cloning Agentic OS repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi

  ok "Code ready at ${INSTALL_DIR}"

  # Step 3: Install dependencies
  echo ""
  echo -e "${BOLD}${PURPLE}━━━ Step 3: Install Dependencies ━━━${NC}"
  echo ""

  info "Installing npm packages..."
  $NPM_CMD install --frozen-lockfile 2>/dev/null || $NPM_CMD install
  ok "Dependencies installed"

  # Step 4: Build
  echo ""
  echo -e "${BOLD}${PURPLE}━━━ Step 4: Build ━━━${NC}"
  echo ""

  info "Building Agentic OS..."
  $NPM_CMD run build
  ok "Build complete"

  # Step 5: Install Hermes Agent
  echo ""
  echo -e "${BOLD}${PURPLE}━━━ Step 5: Hermes Agent ━━━${NC}"
  echo ""

  case "$os" in
    wsl|linux|macos)
      install_hermes
      ;;
    windows)
      if command -v hermes &>/dev/null; then
        ok "Hermes Agent already installed"
      else
        info "To install Hermes on Windows, open PowerShell and run:"
        info "  iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)"
        info "Or install via WSL2 for the full experience."
      fi
      ;;
  esac

  # Step 6: Configure
  echo ""
  echo -e "${BOLD}${PURPLE}━━━ Step 6: Configuration ━━━${NC}"
  echo ""

  # Create .env if not exists
  if [ ! -f "$INSTALL_DIR/.env" ]; then
    cat > "$INSTALL_DIR/.env" << 'ENVEOF'
# Agentic OS Configuration
# ─────────────────────────────
# Hermes API endpoint (auto-detected if not set)
# HERMES_API_URL=http://localhost:8000

# Add your LLM provider keys below
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# OPENROUTER_API_KEY=
ENVEOF
    ok "Created .env configuration file"
  else
    ok "Existing .env file preserved"
  fi

  # Step 7: Create launcher
  echo ""
  echo -e "${BOLD}${PURPLE}━━━ Step 7: Create Launcher ━━━${NC}"
  echo ""

  # Create bin/agentic-os script
  mkdir -p "$INSTALL_DIR/bin"

  cat > "$INSTALL_DIR/bin/agentic-os" << LAUNCHER
#!/usr/bin/env bash
# Agentic OS Launcher
cd "$INSTALL_DIR"

case "\${1:-dev}" in
  dev|start)
    echo "Starting Agentic OS (development)..."
    $NPM_CMD run dev
    ;;
  prod|production)
    echo "Starting Agentic OS (production)..."
    $NPM_CMD run start
    ;;
  build)
    echo "Building Agentic OS..."
    $NPM_CMD run build
    ;;
  stop)
    echo "Stopping Agentic OS..."
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    echo "Stopped."
    ;;
  update)
    echo "Updating Agentic OS..."
    git pull --ff-only
    $NPM_CMD install
    $NPM_CMD run build
    echo "Updated."
    ;;
  *)
    echo "Agentic OS — 7-Layer Agentic AI Stack Dashboard"
    echo ""
    echo "Usage: agentic-os [command]"
    echo ""
    echo "Commands:"
    echo "  dev       Start in development mode (default)"
    echo "  prod      Start in production mode"
    echo "  build     Build the application"
    echo "  stop      Stop the running server"
    echo "  update    Update to latest version"
    ;;
esac
LAUNCHER

  chmod +x "$INSTALL_DIR/bin/agentic-os"

  # Symlink to user bin
  mkdir -p "$HOME/.local/bin"
  ln -sf "$INSTALL_DIR/bin/agentic-os" "$HOME/.local/bin/agentic-os" 2>/dev/null || true

  ok "Created launcher: ${BOLD}agentic-os${NC} command available"

  # Windows: create .bat launcher
  if [ "$os" = "windows" ] || [ "$os" = "wsl" ]; then
    cat > "$INSTALL_DIR/bin/agentic-os.bat" << 'BATEOF'
@echo off
echo Starting Agentic OS...
cd /d "%~dp0\.."
call npx next dev -p 3000
BATEOF
    ok "Created Windows launcher: bin/agentic-os.bat"
  fi

  # ─── Success ───
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${BOLD}Agentic OS installed successfully!${NC}                          ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${CYAN}To start:${NC}                                                  ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}agentic-os dev${NC}       → Development mode (port 3000)    ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}agentic-os prod${NC}      → Production mode              ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${CYAN}Then open:${NC}                                                 ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}http://localhost:3000${NC}                                   ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${CYAN}If Hermes is installed, it auto-detects on launch.${NC}        ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${CYAN}To install Hermes:${NC}                                        ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}curl -fsSL https://raw.githubusercontent.com/${NC}             ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}NousResearch/hermes-agent/main/scripts/install.sh | bash${NC}   ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${CYAN}Other commands:${NC}                                            ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}agentic-os stop${NC}      → Stop the server                  ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}agentic-os update${NC}    → Update to latest version          ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}    ${BOLD}agentic-os build${NC}     → Rebuild the application           ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

main "$@"
