#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Agentic OS Ultimate Edition V5.0 — One-Command Uninstaller
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
echo -e "${PURPLE}   🧠 Agentic OS Ultimate Edition V5.0 — Uninstaller${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Find install directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${1:-$SCRIPT_DIR}"

if [ ! -d "$INSTALL_DIR" ]; then
  echo -e "${RED}Error: Directory $INSTALL_DIR does not exist.${NC}"
  exit 1
fi

cd "$INSTALL_DIR"

# ─── Step 1: Stop Running Process ───
echo -e "${CYAN}[1/4]${NC} Stopping Agentic OS..."

if [ -f .agentic-os.pid ]; then
  PID=$(cat .agentic-os.pid)
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Stopped process (PID: $PID)"
  else
    echo -e "  ${YELLOW}⚠${NC} Process $PID is not running"
  fi
  rm -f .agentic-os.pid
else
  # Try to find by port
  PORT=$(grep -oP 'PORT=\K\d+' .env.local 2>/dev/null || echo "3100")
  LSOF_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$LSOFF_PID" ]; then
    kill "$LSOF_PID" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Killed process on port $PORT (PID: $LSOF_PID)"
  else
    echo -e "  ${YELLOW}⚠${NC} No running process found"
  fi
fi

# ─── Step 2: Remove node_modules ───
echo ""
echo -e "${CYAN}[2/4]${NC} Removing node_modules..."

if [ -d node_modules ]; then
  rm -rf node_modules
  echo -e "  ${GREEN}✓${NC} node_modules removed"
else
  echo -e "  ${YELLOW}⚠${NC} node_modules not found"
fi

# ─── Step 3: Remove build artifacts ───
echo ""
echo -e "${CYAN}[3/4]${NC} Removing build artifacts..."

rm -rf .next
rm -f agentic-os.log
rm -f .env.local

echo -e "  ${GREEN}✓${NC} Build artifacts removed"

# ─── Step 4: Ask about full removal ───
echo ""
echo -e "${CYAN}[4/4]${NC} Full removal..."

read -p "Do you want to completely remove the Agentic OS directory ($INSTALL_DIR)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd /
  rm -rf "$INSTALL_DIR"
  echo -e "  ${GREEN}✓${NC} Directory $INSTALL_DIR completely removed"
else
  echo -e "  ${YELLOW}⚠${NC} Directory kept. You can manually remove it later: rm -rf $INSTALL_DIR"
fi

# ─── Summary ───
echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🧹 Agentic OS Uninstalled${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  To reinstall: bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.sh)\""
echo ""
