#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Agentic OS Ultimate Edition V5.0 — One-Command Installer
#  https://github.com/rachidSabah/Agentic-os
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}   🧠 Agentic OS Ultimate Edition V5.0 — Installer${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Step 0: Check Prerequisites ───
echo -e "${CYAN}[0/6]${NC} Checking prerequisites..."

command -v git >/dev/null 2>&1 || { echo -e "${RED}Error: git is not installed. Please install git first.${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+ first.${NC}"; exit 1; }

# Check for bun or npm
if command -v bun >/dev/null 2>&1; then
  PKG_MGR="bun"
elif command -v npm >/dev/null 2>&1; then
  PKG_MGR="npm"
else
  echo -e "${RED}Error: Neither bun nor npm is installed. Please install one first.${NC}"; exit 1
fi

echo -e "  ${GREEN}✓${NC} git: $(git --version | cut -d' ' -f3)"
echo -e "  ${GREEN}✓${NC} Node.js: $(node --version)"
echo -e "  ${GREEN}✓${NC} Package manager: $PKG_MGR"

# ─── Step 1: Clone Repository ───
INSTALL_DIR="${1:-$HOME/Agentic-os}"
echo ""
echo -e "${CYAN}[1/6]${NC} Cloning repository to ${INSTALL_DIR}..."

if [ -d "$INSTALL_DIR" ]; then
  echo -e "  ${YELLOW}⚠${NC} Directory already exists. Pulling latest changes..."
  cd "$INSTALL_DIR"
  git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
else
  git clone https://github.com/rachidSabah/Agentic-os.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

echo -e "  ${GREEN}✓${NC} Repository ready"

# ─── Step 2: Install Dependencies ───
echo ""
echo -e "${CYAN}[2/6]${NC} Installing dependencies with $PKG_MGR..."

if [ "$PKG_MGR" = "bun" ]; then
  bun install
else
  npm install
fi

echo -e "  ${GREEN}✓${NC} Dependencies installed"

# ─── Step 3: Build Project ───
echo ""
echo -e "${CYAN}[3/6]${NC} Building project..."

if [ "$PKG_MGR" = "bun" ]; then
  bun run build
else
  npm run build
fi

echo -e "  ${GREEN}✓${NC} Build complete"

# ─── Step 4: Configure Port ───
PORT="${AGENTIC_PORT:-3100}"
echo ""
echo -e "${CYAN}[4/6]${NC} Configuring port ${PORT}..."

# Update .env or package.json if needed
if [ ! -f .env.local ]; then
  echo "PORT=$PORT" > .env.local
fi

echo -e "  ${GREEN}✓${NC} Port configured: $PORT"

# ─── Step 5: Start Application ───
echo ""
echo -e "${CYAN}[5/6]${NC} Starting Agentic OS on port ${PORT}..."

if [ "$PKG_MGR" = "bun" ]; then
  nohup bun run start -- -p "$PORT" > agentic-os.log 2>&1 &
else
  nohup npm run start -- -p "$PORT" > agentic-os.log 2>&1 &
fi

PID=$!
echo "$PID" > .agentic-os.pid
sleep 3

# Verify it started
if kill -0 "$PID" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Agentic OS started (PID: $PID)"
else
  echo -e "  ${YELLOW}⚠${NC} Process may still be starting. Check agentic-os.log"
fi

# ─── Step 6: Display Summary ───
echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🚀 Agentic OS Ultimate Edition V5.0 Installed!${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Dashboard:${NC}  http://localhost:$PORT"
echo -e "  ${CYAN}Install dir:${NC} $INSTALL_DIR"
echo -e "  ${CYAN}PID:${NC}         $PID"
echo -e "  ${CYAN}Log:${NC}         $INSTALL_DIR/agentic-os.log"
echo ""
echo -e "  ${YELLOW}Commands:${NC}"
echo -e "    Stop:    ${PKG_MGR} run stop  OR  kill \$(cat .agentic-os.pid)"
echo -e "    Restart: ${PKG_MGR} run restart"
echo -e "    Uninstall: bash ${INSTALL_DIR}/uninstall.sh"
echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
