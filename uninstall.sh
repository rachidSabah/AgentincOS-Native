#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Agentic OS — One-Command Uninstallation Script
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

BOLD='\033[1m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
NC='\033[0m'

echo -e "${RED}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}${BOLD}  🧠 Agentic OS — Uninstallation${NC}"
echo -e "${RED}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Stop Running Processes ───
echo -e "${BOLD}Checking for running Agentic OS processes...${NC}"

# Kill any next dev processes on port 3100
if lsof -ti:3100 &> /dev/null; then
  echo -e "${YELLOW}Stopping processes on port 3100...${NC}"
  lsof -ti:3100 | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ Stopped${NC}"
else
  echo -e "${GREEN}✓ No processes on port 3100${NC}"
fi

# Kill any next build processes
pkill -f "next build" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo ""
echo -e "${YELLOW}${BOLD}⚠ This will remove Agentic OS completely!${NC}"
echo -e "${YELLOW}  Directory: ${SCRIPT_DIR}${NC}"
echo ""
read -p "Are you sure you want to uninstall Agentic OS? [y/N]: " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}Uninstall cancelled.${NC}"
  exit 0
fi

# ─── Remove Build Artifacts ───
echo ""
echo -e "${BOLD}Removing build artifacts...${NC}"
rm -rf "$SCRIPT_DIR/.next" 2>/dev/null && echo -e "${GREEN}✓ Removed .next/${NC}" || echo -e "${GREEN}✓ .next/ not found${NC}"
rm -rf "$SCRIPT_DIR/node_modules" 2>/dev/null && echo -e "${GREEN}✓ Removed node_modules/${NC}" || echo -e "${GREEN}✓ node_modules/ not found${NC}"
rm -rf "$SCRIPT_DIR/out" 2>/dev/null && echo -e "${GREEN}✓ Removed out/${NC}" || true

# ─── Remove Local Storage ───
echo ""
echo -e "${BOLD}Note: Browser localStorage data (Agentic OS state) will persist in your browser.${NC}"
echo -e "  To clear it: Open DevTools → Application → Local Storage → Clear"

# ─── Optionally Remove Entire Directory ───
echo ""
read -p "Remove the entire Agentic OS directory ($SCRIPT_DIR)? [y/N]: " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Navigate out before removing
  cd /tmp
  rm -rf "$SCRIPT_DIR"
  echo -e "${GREEN}✓ Removed $SCRIPT_DIR${NC}"
else
  echo -e "${YELLOW}Directory kept. Only build artifacts were removed.${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ Agentic OS uninstalled successfully!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  To reinstall: bash install.sh"
echo ""
