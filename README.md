<p align="center">
  <img src="https://img.shields.io/badge/version-5.0.2-cyan?style=for-the-badge&labelColor=0a0a1a" alt="version" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&labelColor=0a0a1a" alt="nextjs" />
  <img src="https://img.shields.io/badge/AI_Memory_OS-Premium-purple?style=for-the-badge&labelColor=0a0a1a" alt="memory-os" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge&labelColor=0a0a1a" alt="license" />
</p>

<h1 align="center">
  <img src="https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/public/logo.svg" width="48" alt="logo" />
  Agentic OS
</h1>

<h3 align="center">AI Memory Operating System — 7-Layer Agentic AI Stack Dashboard</h3>

<p align="center">
  <strong>Universal Memory Engine &middot; Agent Swarm Intelligence &middot; Hermes Integration &middot; Auto-Update from GitHub</strong>
</p>

<p align="center">
  <a href="#-one-command-install">Install</a> &middot;
  <a href="#-features">Features</a> &middot;
  <a href="#-architecture">Architecture</a> &middot;
  <a href="#-screenshots">Screenshots</a> &middot;
  <a href="#-api-routes">API</a> &middot;
  <a href="#-one-command-uninstall">Uninstall</a>
</p>

---

## One-Command Install

### Linux / macOS / WSL2

```bash
curl -fsSL https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.sh | bash
```

### Windows (PowerShell)

> **Note:** The `iex (irm ...)` pattern is blocked by Windows Defender (AMSI). Use the download-then-run method below instead.

```powershell
# Step 1: Download the installer
cd $env:USERPROFILE
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/install.ps1" -OutFile "install-agentic.ps1"

# Step 2: Run it
powershell -ExecutionPolicy Bypass -File ".\install-agentic.ps1"
```

**Or the simplest method — just clone and run:**
```powershell
cd $env:USERPROFILE
git clone https://github.com/rachidSabah/Agentic-os.git
cd Agentic-os
npm install
npm run build
npm start
```
Then open **http://localhost:3100** in your browser.

### After Install

```bash
# Navigate to your installation
cd $env:USERPROFILE\Agentic-os    # Windows
cd ~/Agentic-os                    # Linux/macOS

# Start the server
npm start              # Production mode on http://localhost:3100
npm run dev            # Development mode with hot reload

# Update to latest version
npm run update         # Pull latest from GitHub and rebuild

# Stop the server
npm run stop

# Rebuild
npm run build
```

---

## One-Command Uninstall

### Linux / macOS / WSL2

```bash
curl -fsSL https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/uninstall.sh | bash
```

### Windows (PowerShell)

```powershell
cd $env:USERPROFILE
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/rachidSabah/Agentic-os/main/uninstall.ps1" -OutFile "uninstall-agentic.ps1"
powershell -ExecutionPolicy Bypass -File ".\uninstall-agentic.ps1"
```

**Or just delete the folder:** `Remove-Item -Recurse -Force "$env:USERPROFILE\Agentic-os"`

---

## Features

### Core Platform

| Feature | Description |
|---------|-------------|
| **7-Layer Agentic AI Stack** | Interaction, Knowledge, Memory, Reasoning, Execution, Persistence, Governance |
| **Home Dashboard** | Real-time overview with agent status, memory growth, knowledge graph, analytics |
| **Command Palette** | `Cmd+K` universal search across all agents, memories, tasks, and settings |
| **Dark Cyberpunk UI** | Glassmorphism, neon glow, particle backgrounds, smooth Framer Motion animations |

### AI Agents

| Agent | Role | Layer |
|-------|------|-------|
| **Claude** | Interaction & Perception | L1 |
| **Hermes** | Knowledge Acquisition & Research | L2, L5 |
| **OpenClaw** | Orchestration & Routing | L7 |
| **Self Vault** | Memory Persistence & OMI | L6 |

### Universal Memory Engine (9 Memory Types)

- **Long-Term Memory** — Permanent knowledge store
- **Short-Term Memory** — Working context buffer
- **Episodic Memory** — Event-based recall with timestamps
- **Semantic Memory** — Concept-level understanding
- **Context Memory** — Conversation-aware state
- **Project Memory** — Workspace-specific knowledge
- **User Memory** — Personal preferences and patterns
- **Team Memory** — Shared team knowledge
- **Conversation Memory** — Dialog history and continuity

### Memory Features

- **Memory Graph** — Force-directed D3.js visualization of memory relationships
- **Auto Memory Extraction** — AI-powered extraction from conversations
- **Memory Timeline** — Chronological view of all memory events
- **Agent Memory Sharing** — Cross-agent memory access with permissions
- **Hybrid Memory Search** — Vector + Graph + Semantic + Keyword search
- **Memory Decay** — Automatic importance-based memory aging
- **Memory Conflict Resolution** — Detect and resolve contradictory memories
- **Knowledge Gap Detection** — Identify missing knowledge areas
- **Dream Mode** — Background memory consolidation (compress, reorganize, extract, strengthen)
- **Cross-Session Memory** — Persistent context across sessions

### Advanced Features

- **Agent Swarm Intelligence** — Decentralized coordination with stigmergy and emergent behavior
- **Agent Consensus Mode** — Multi-agent debate, voting, and delegation strategies
- **Agent Handoff Protocol** — Seamless task transfer with full context
- **RAG Engine** — Retrieval-Augmented Generation with multi-vector database support
- **MCP Registry** — Model Context Protocol server management
- **Hermes SEO Silo** — AI-powered SEO audit, keywords, content, competitors, serp, schema
- **Voice Interface** — Wake word detection, agent routing, real-time transcription
- **Focus Mode** — Distraction-free deep work with agent silencing
- **Sandbox Execution** — Isolated code execution environment
- **Permission Scopes** — Fine-grained agent access control
- **Audit Trail** — Complete activity logging and compliance

### Enterprise Features

- **Agent Observability Dashboard** — Traces, metrics, logs, spans
- **Cost Tracker** — Real-time spend monitoring across agents and models
- **Multi-Model Router** — Automatic model selection based on task type
- **Security Scanner & Webhooks** — Threat detection and event-driven integrations
- **Workflow Builder** — Visual DAG-based automation with plugin system
- **Prompt Library** — Versioned prompt templates with A/B testing
- **Kanban Board** — Task management with agent assignment
- **Reports Engine** — Automated report generation and scheduling
- **Productivity Heatmap** — Activity patterns and peak hours analysis
- **Agent Leaderboard** — Performance comparison across agents

### Auto-Update System

- **Updates Tab** — Built-in update manager with auto-pull from GitHub
- **Automatic Check** — Configurable interval for checking new updates
- **One-Click Install** — Install individual or all updates from the UI
- **Rollback Support** — Revert any update if something breaks
- **Update History** — Full log of installed and rolled-back updates
- **Changelog Viewer** — Read update details before installing

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   L7 — GOVERNANCE & DEPLOYMENT           │
│   OpenClaw · RBAC · Audit · Session Coordination        │
├─────────────────────────────────────────────────────────┤
│                   L6 — PERSISTENCE & MEMORY              │
│   Self Vault · OMI · Obsidian · 9 Memory Types          │
├─────────────────────────────────────────────────────────┤
│                   L5 — EXECUTION & ACTION                │
│   Hermes · Skills · Browser · SEO Silo · Kanban         │
├─────────────────────────────────────────────────────────┤
│                   L4 — COGNITIVE REASONING               │
│   Claude · RAG · Agent Consensus · Handoff Protocol     │
├─────────────────────────────────────────────────────────┤
│                   L3 — CONTEXT & STATE                   │
│   Context Engine · Dream Mode · Cross-Session Memory    │
├─────────────────────────────────────────────────────────┤
│                   L2 — KNOWLEDGE ACQUISITION             │
│   Hermes · Web Search · Research · MCP Registry          │
├─────────────────────────────────────────────────────────┤
│                   L1 — INTERACTION & PERCEPTION          │
│   Claude · Voice · Text · Image · Video Input            │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + Glassmorphism |
| Animation | Framer Motion |
| State | Zustand |
| UI Components | shadcn/ui + Radix |
| Charts | Recharts |
| Database | Prisma ORM |
| AI SDK | z-ai-web-dev-sdk |
| Agent | Hermes Agent (auto-detected) |

---

## API Routes

The Agentic OS exposes 30+ API routes for full agent control:

| Route | Purpose |
|-------|---------|
| `/api/hermes/chat` | Chat with Hermes agent |
| `/api/hermes/execute` | Execute Hermes skills |
| `/api/hermes/seo` | SEO Silo (audit, keywords, content, competitors, serp, schema) |
| `/api/hermes/skills` | List & manage Hermes skills |
| `/api/hermes/browser` | Browser automation |
| `/api/hermes/swarm` | Agent swarm coordination |
| `/api/hermes/memory` | Memory operations |
| `/api/hermes/mcp` | MCP server management |
| `/api/hermes/workflows` | Workflow automation |
| `/api/hermes/security` | Security scanning |
| `/api/hermes/webhooks` | Webhook management |
| `/api/hermes/cost` | Cost tracking |
| `/api/hermes/reports` | Report generation |
| `/api/hermes/voice` | Voice interface |
| `/api/hermes/kanban` | Task management |
| `/api/hermes/prompts` | Prompt library |
| `/api/hermes/plugins` | Plugin system |
| `/api/hermes/model-router` | Multi-model routing |
| `/api/hermes/message-bus` | Inter-agent messaging |
| `/api/hermes/sessions` | Session management |
| `/api/hermes/telemetry` | Telemetry & observability |
| `/api/hermes/stream` | Streaming responses |
| `/api/hermes/gateway` | API gateway |
| `/api/hermes/detect` | Auto-detect Hermes |
| `/api/hermes/status` | System status |
| `/api/hermes/system` | System operations |
| `/api/hermes/command` | Command execution |
| `/api/hermes/cron` | Scheduled tasks |
| `/api/hermes/process` | Process management |
| `/api/hermes/web` | Web operations |
| `/api/memory` | Universal Memory Engine API |
| `/api/updates` | Auto-update system API |

---

## Manual Install (Alternative)

If you prefer manual setup:

```bash
# Clone the repository
git clone https://github.com/rachidSabah/Agentic-os.git
cd Agentic-os

# Install dependencies
npm install

# Build the application
npm run build

# Start development server
npm run dev

# Or start production server
npm run start
```

Open [http://localhost:3100](http://localhost:3100) in your browser.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Hermes API endpoint (auto-detected if not set)
# HERMES_API_URL=http://localhost:8000

# LLM Provider Keys
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# OPENROUTER_API_KEY=

# GitHub Auto-Update (for pulling updates)
# GITHUB_TOKEN=
# GITHUB_REPO=rachidSabah/Agentic-os
```

---

## Hermes Agent Integration

Agentic OS auto-detects Hermes Agent on launch. To install Hermes separately:

**Linux / macOS / WSL2:**
```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1" -OutFile "install-hermes.ps1"
powershell -ExecutionPolicy Bypass -File ".\install-hermes.ps1"
```

Once Hermes is running, Agentic OS will:
- Auto-detect the Hermes API at `http://localhost:8000`
- Enable real-time chat and skill execution
- Power the SEO Silo with 6 actions (audit, keywords, content, competitors, serp, schema)
- Enable browser automation, web research, and task execution
- Stream responses in real-time

---

## Project Structure

```
Agentic-os/
├── install.sh              # One-command install (Linux/macOS/WSL)
├── install.ps1             # Windows installer (download-then-run)
├── update.ps1              # Windows updater (download-then-run)
├── uninstall.sh            # One-command uninstall (Linux/macOS/WSL)
├── uninstall.ps1           # Windows uninstaller (download-then-run)
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main entry — Mission Control
│   │   ├── layout.tsx      # Root layout with SEO
│   │   ├── globals.css     # Cyberpunk theme styles
│   │   └── api/            # 30+ API routes
│   │       ├── hermes/     # Hermes agent APIs (25+ routes)
│   │       ├── memory/     # Universal Memory Engine API
│   │       └── updates/    # Auto-update API
│   ├── components/
│   │   ├── dashboard.tsx           # Main dashboard shell
│   │   ├── home-dashboard.tsx      # Home with stats & widgets
│   │   ├── mission-control.tsx     # Agent control center
│   │   ├── memory-engine.tsx       # Universal Memory Engine UI
│   │   ├── dream-mode.tsx          # Memory consolidation
│   │   ├── agent-consensus.tsx     # Multi-agent voting
│   │   ├── agent-handoff.tsx       # Task transfer protocol
│   │   ├── agent-observability.tsx # Traces, metrics, logs
│   │   ├── swarm-intelligence.tsx  # Decentralized coordination
│   │   ├── rag-engine.tsx          # RAG pipeline
│   │   ├── voice-interface.tsx     # Voice command system
│   │   ├── focus-mode.tsx          # Deep work mode
│   │   ├── cost-tracker.tsx        # Spend monitoring
│   │   ├── updates-tab.tsx         # Auto-update manager
│   │   ├── hermes-seo-silo.tsx     # SEO Silo dashboard
│   │   ├── hermes-power-panel.tsx  # Hermes capabilities
│   │   ├── mcp-registry.tsx        # MCP server management
│   │   ├── workflow-plugin-prompt.tsx # Automation builder
│   │   ├── productivity-heatmap.tsx   # Activity patterns
│   │   ├── permission-scopes.tsx      # Access control
│   │   ├── sandbox-execution.tsx      # Code sandbox
│   │   ├── security-webhook-reports.tsx # Security & webhooks
│   │   ├── audit-trail.tsx            # Activity logging
│   │   ├── agent-leaderboard.tsx      # Agent performance
│   │   ├── memory-decay.tsx           # Memory aging
│   │   ├── memory-conflict.tsx        # Conflict resolution
│   │   ├── knowledge-gap.tsx          # Gap detection
│   │   ├── cross-session-memory.tsx   # Session persistence
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── store.ts         # Zustand global state
│   │   ├── hermes.ts        # Hermes client with pooling
│   │   ├── memory-store.ts  # Memory state management
│   │   ├── update-store.ts  # Update state management
│   │   ├── db.ts            # Prisma database client
│   │   └── utils.ts         # Utility functions
│   └── hooks/
│       ├── use-mobile.ts    # Mobile detection
│       └── use-toast.ts     # Toast notifications
├── prisma/
│   └── schema.prisma        # Database schema
├── public/
│   ├── logo.svg             # Agentic OS logo
│   └── robots.txt           # SEO robots
├── tailwind.config.ts       # Tailwind configuration
├── next.config.ts           # Next.js configuration
└── package.json             # Dependencies & scripts
```

---

## Requirements

- **Node.js** 18+ (v22 recommended)
- **npm** or **bun** package manager
- **Git** for cloning and auto-updates
- **Hermes Agent** (optional — auto-detected when running)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤ by <a href="https://github.com/rachidSabah">rachidSabah</a>
</p>
