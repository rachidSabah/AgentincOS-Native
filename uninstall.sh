#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Agentic OS — Uninstallation Script
# ═══════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo -e "${RED}   🧠 AGENTIC OS — Uninstallation${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ask for confirmation
echo -e "${YELLOW}⚠ This will remove:${NC}"
echo "  • node_modules/"
echo "  • .next/ (build cache)"
echo "  • .env (your API keys)"
echo "  • dev.db (local database)"
echo ""
read -p "Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}Uninstallation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}→ Removing node_modules...${NC}"
rm -rf node_modules 2>/dev/null && echo -e "${GREEN}✓${NC} Removed node_modules" || echo -e "${YELLOW}—${NC} node_modules not found"

echo -e "${CYAN}→ Removing build cache...${NC}"
rm -rf .next 2>/dev/null && echo -e "${GREEN}✓${NC} Removed .next" || echo -e "${YELLOW}—${NC} .next not found"

echo -e "${CYAN}→ Removing environment config...${NC}"
rm -f .env 2>/dev/null && echo -e "${GREEN}✓${NC} Removed .env" || echo -e "${YELLOW}—${NC} .env not found"

echo -e "${CYAN}→ Removing local database...${NC}"
rm -f dev.db 2>/dev/null && echo -e "${GREEN}✓${NC} Removed dev.db" || echo -e "${YELLOW}—${NC} dev.db not found"

echo -e "${CYAN}→ Removing Prisma migrations...${NC}"
rm -rf prisma/migrations 2>/dev/null && echo -e "${GREEN}✓${NC} Removed migrations" || echo -e "${YELLOW}—${NC} migrations not found"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Agentic OS uninstalled.${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  To reinstall:"
echo -e "    ${CYAN}bash install.sh${NC}"
echo ""
echo -e "  To completely remove the project:"
echo -e "    ${RED}rm -rf $(pwd)${NC}"
echo ""
