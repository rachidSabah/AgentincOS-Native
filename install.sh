#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Agentic OS — One-Command Installation Script
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
echo -e "${CYAN}   🧠 AGENTIC OS — Brain-First AI Operating System${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check for Bun (preferred) or Node.js
if command -v bun &> /dev/null; then
    RUNTIME="bun"
    echo -e "${GREEN}✓${NC} Bun detected: $(bun --version)"
elif command -v node &> /dev/null; then
    RUNTIME="node"
    echo -e "${YELLOW}⚠${NC} Node.js detected (Bun recommended): $(node --version)"
else
    echo -e "${RED}✗${NC} Neither Bun nor Node.js found. Please install Bun first:"
    echo -e "  ${CYAN}curl -fsSL https://bun.sh/install | bash${NC}"
    exit 1
fi

# Check for Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}✗${NC} Git not found. Please install Git first."
    exit 1
fi
echo -e "${GREEN}✓${NC} Git detected: $(git --version)"

# Clone if not already in the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    echo ""
    echo -e "${CYAN}→ Cloning Agentic OS...${NC}"
    git clone https://github.com/rachidSabah/Agentic-os.git "$SCRIPT_DIR/Agentic-os" 2>/dev/null || true
    cd "$SCRIPT_DIR/Agentic-os"
else
    cd "$SCRIPT_DIR"
fi

echo ""
echo -e "${CYAN}→ Installing dependencies...${NC}"
if [ "$RUNTIME" = "bun" ]; then
    bun install
else
    npm install
fi

echo ""
echo -e "${CYAN}→ Setting up environment...${NC}"
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Agentic OS Environment Configuration
# Add your API keys below to enable providers

# OpenAI
OPENAI_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Google AI
GOOGLE_AI_API_KEY=

# DeepSeek
DEEPSEEK_API_KEY=

# OpenRouter
OPENROUTER_API_KEY=

# Port
PORT=3100
EOF
    echo -e "${GREEN}✓${NC} Created .env file — add your API keys to enable providers"
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

echo ""
echo -e "${CYAN}→ Building project...${NC}"
if [ "$RUNTIME" = "bun" ]; then
    bun run build
else
    npm run build
fi

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Installation Complete!${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Start the dev server:"
echo -e "    ${CYAN}bun dev${NC}    or    ${CYAN}npm run dev${NC}"
echo ""
echo -e "  Start on port 3100:"
echo -e "    ${CYAN}bun dev --port 3100${NC}"
echo ""
echo -e "  Open in browser:"
echo -e "    ${CYAN}http://localhost:3100${NC}"
echo ""
echo -e "  To uninstall:"
echo -e "    ${CYAN}bash uninstall.sh${NC}"
echo ""
