#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Agentic OS — One-Command Installation Script
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  🧠 Agentic OS — Installation${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Check Prerequisites ───
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}✗ $1 is not installed. Please install it first.${NC}"
    echo -e "  Install: $2"
    exit 1
  fi
  echo -e "${GREEN}✓ $1 found${NC}"
}

echo -e "${BOLD}Checking prerequisites...${NC}"
check_command "node" "https://nodejs.org — or: brew install node / apt install nodejs"
check_command "npm" "Comes with Node.js — https://nodejs.org"

# ─── Optional: Check for Bun (faster) ───
PKG_MANAGER="npm"
if command -v bun &> /dev/null; then
  echo -e "${GREEN}✓ bun found (will use for faster installs)${NC}"
  PKG_MANAGER="bun"
else
  echo -e "${YELLOW}⚠ bun not found — using npm (install bun for faster builds: curl -fsSL https://bun.sh/install | bash)${NC}"
fi

# ─── Check Git ───
if command -v git &> /dev/null; then
  echo -e "${GREEN}✓ git found${NC}"
else
  echo -e "${YELLOW}⚠ git not found — you'll need it for cloning${NC}"
fi

echo ""

# ─── Clone or Use Existing ───
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" == */Agentic-os* || -f "$SCRIPT_DIR/package.json" ]]; then
  INSTALL_DIR="$SCRIPT_DIR"
  echo -e "${GREEN}Running from existing Agentic OS directory: $INSTALL_DIR${NC}"
else
  REPO_URL="https://github.com/rachidSabah/Agentic-os.git"
  INSTALL_DIR="$HOME/Agentic-os"
  
  if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory $INSTALL_DIR already exists.${NC}"
    read -p "Remove and re-clone? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rm -rf "$INSTALL_DIR"
      git clone "$REPO_URL" "$INSTALL_DIR"
    fi
  else
    echo -e "${BOLD}Cloning Agentic OS...${NC}"
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
fi

cd "$INSTALL_DIR"

# ─── Install Dependencies ───
echo ""
echo -e "${BOLD}Installing dependencies...${NC}"
if [ "$PKG_MANAGER" = "bun" ]; then
  bun install
else
  npm install
fi

# ─── Build ───
echo ""
echo -e "${BOLD}Building Agentic OS...${NC}"
if [ "$PKG_MANAGER" = "bun" ]; then
  bun run build
else
  npm run build
fi

# ─── Start ───
echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ Agentic OS installed successfully!${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}To start the development server:${NC}"
echo -e "    cd $INSTALL_DIR"
echo -e "    npm run dev"
echo ""
echo -e "  ${BOLD}Or start on a specific port:${NC}"
echo -e "    npx next dev -p 3100 -H 0.0.0.0"
echo ""
echo -e "  ${BOLD}To build for production:${NC}"
echo -e "    npm run build && npm start"
echo ""
echo -e "  ${BOLD}To uninstall:${NC}"
echo -e "    bash $INSTALL_DIR/uninstall.sh"
echo ""
