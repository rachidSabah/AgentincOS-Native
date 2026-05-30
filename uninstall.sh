#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║                  AGENTIC OS — One-Command Uninstall                 ║
# ║                                                                      ║
# ║   Usage:                                                             ║
# ║     curl -fsSL https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/uninstall.sh | bash   ║
# ║     — or —                                                           ║
# ║     ~/.agentic-os/bin/agentic-os uninstall                           ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -euo pipefail

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

INSTALL_DIR="$HOME/.agentic-os"

info()  { echo -e "  ${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "  ${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "  ${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "  ${RED}[FAIL]${NC}  $1"; exit 1; }

echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
echo -e "${RED}║${NC}  ${BOLD}Agentic OS — Uninstall${NC}                                      ${RED}║${NC}"
echo -e "${RED}║${NC}                                                              ${RED}║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Confirm
echo -e "  ${YELLOW}This will remove:${NC}"
echo -e "    • Agentic OS application (${INSTALL_DIR})"
echo -e "    • agentic-os launcher command"
echo -e "    • node_modules and build artifacts"
echo ""
echo -e "  ${GREEN}This will NOT remove:${NC}"
echo -e "    • Hermes Agent (uninstall separately: ~/.hermes/)"
echo -e "    • Node.js / nvm"
echo -e "    • Your .env configuration (backed up)"
echo ""
read -rp "  Continue? [y/N] " confirm
if [[ "$confirm" != [yY] && "$confirm" != [yY][eE][sS] ]]; then
  info "Uninstall cancelled."
  exit 0
fi
echo ""

# Step 1: Stop any running instances
info "Stopping Agentic OS..."
pkill -f "next dev.*3000" 2>/dev/null || true
pkill -f "next start.*3000" 2>/dev/null || true
pkill -f "agentic-os" 2>/dev/null || true
ok "Stopped running instances"

# Step 2: Backup .env if it exists
if [ -f "$INSTALL_DIR/.env" ]; then
  BACKUP="$HOME/agentic-os-env-backup-$(date +%Y%m%d%H%M%S).env"
  cp "$INSTALL_DIR/.env" "$BACKUP"
  ok "Backed up .env to ${BACKUP}"
fi

# Step 3: Remove launcher symlink
info "Removing launcher command..."
rm -f "$HOME/.local/bin/agentic-os" 2>/dev/null || true
ok "Removed agentic-os command"

# Step 4: Remove application
info "Removing Agentic OS from ${INSTALL_DIR}..."
if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  ok "Removed ${INSTALL_DIR}"
else
  warn "Installation directory not found at ${INSTALL_DIR}"
fi

# Step 5: Clean up any temp files
rm -f /tmp/agentic-os-*.log 2>/dev/null || true
rm -f /tmp/hermes-voice-* 2>/dev/null || true
ok "Cleaned up temporary files"

# Done
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}Agentic OS has been uninstalled.${NC}                            ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}To reinstall:${NC}                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    curl -fsSL https://raw.githubusercontent.com/              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    rachidSabah/Agentic-os/main/install.sh | bash             ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${CYAN}Hermes Agent was NOT removed.${NC} To uninstall:${NC}             ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    rm -rf ~/.hermes ~/.local/bin/hermes                       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
