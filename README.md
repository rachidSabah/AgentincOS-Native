<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-cyan?style=for-the-badge&labelColor=0a0a1a" alt="version" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&labelColor=0a0a1a" alt="nextjs" />
  <img src="https://img.shields.io/badge/Tauri-v2-blue?style=for-the-badge&labelColor=0a0a1a" alt="tauri" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge&labelColor=0a0a1a" alt="license" />
</p>

<h1 align="center">
  Agentic OS X
</h1>

<h3 align="center">Lightweight Autonomous AI Operating System for Windows</h3>

<p align="center">
  <strong>7-Brain Reasoning &middot; 40+ Agent Types &middot; 14 Swarm Patterns &middot; Multi-Model Failover &middot; Tauri v2 Desktop</strong>
</p>

<p align="center">
  <a href="#-install">Install</a> &middot;
  <a href="#-architecture">Architecture</a> &middot;
  <a href="#-features">Features</a> &middot;
  <a href="#-api-reference">API</a> &middot;
  <a href="#-uninstall">Uninstall</a>
</p>

---

Agentic OS X is a kernel-first autonomous AI operating system designed to be **lightweight as Claude Desktop, responsive as Cursor, autonomous as Hermes, and extensible as OpenHands**. It runs natively on Windows via Tauri v2 with a bundled Node.js runtime — no external dependencies required.

The core kernel contains only 9 runtimes (Agent, Swarm, Brain, Memory, Knowledge, Model Router, Event Bus, Security, Observability). Everything else — agents, swarms, brains, providers — is **lazy-loaded on demand and unloaded when idle**. No bloated startup. No resident processes. No wasted resources.

---

## Install

### Windows — One-Click NSIS Installer

Download the latest `AgenticOS-Setup-2.0.0.exe` from the [Releases](https://github.com/rachidSabah/AgentincOS-Native/releases) page and run it. The installer:

- Bundles Node.js v20 LTS — no Node.js installation required
- Installs to `%LOCALAPPDATA%\Agentic OS`
- Creates Start Menu shortcuts and desktop icon
- Registers uninstaller in Add/Remove Programs
- Auto-starts the application after installation

### Build the Installer from Source

```powershell
# Prerequisites: Node.js 20+, NSIS 3.x, Git
git clone https://github.com/rachidSabah/AgentincOS-Native.git
cd AgentincOS-Native
npm install
npm run build
powershell -File installer\build-exe.ps1
```

The built installer will be in `./dist/AgenticOS-Setup-2.0.0.exe`.

### Run from Source (Development)

```bash
git clone https://github.com/rachidSabah/AgentincOS-Native.git
cd AgentincOS-Native
npm install
npm run dev        # Development at http://localhost:3000
npm run build      # Production build
npm start          # Production server at http://localhost:3000
```

### Tauri Desktop (Native Windows App)

```bash
npm run tauri:dev          # Development with hot reload
npm run tauri:build        # Production .msi/.exe bundle
```

---

## Architecture

### Kernel-First Design

```
┌──────────────────────────────────────────────────────────────────┐
│                     AGENTIC OS X KERNEL                          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Agent   │ │  Swarm   │ │  Brain   │ │     Memory       │   │
│  │ Runtime  │ │ Runtime  │ │ Runtime  │ │     Runtime      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Knowledge │ │  Model   │ │  Event   │ │    Security      │   │
│  │ Runtime  │ │  Router  │ │   Bus    │ │    Runtime       │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐                                                   │
│  │Observab. │  ← Only 9 core runtimes. Everything else is      │
│  │ Runtime  │    loaded on-demand and unloaded when idle.       │
│  └──────────┘                                                   │
│                                                                  │
│  Lazy-Loaded Modules (NOT resident at startup):                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 40+ Agent Types  │ 14 Swarm Patterns │ 7 Brain Modes   │    │
│  │ 10+ AI Providers │ Memory Pool       │ Knowledge Graph  │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 7-Brain Reasoning Architecture

| Brain | Role | When Activated |
|-------|------|----------------|
| **Planning** | Goal decomposition, task sequencing | Complex multi-step tasks |
| **Reasoning** | Logical inference, deduction | Analysis and problem-solving |
| **Architecture** | System design, structural decisions | Code and system design |
| **Research** | Information gathering, synthesis | Research and exploration |
| **Coding** | Code generation, debugging | Development tasks |
| **Memory** | Context recall, knowledge retrieval | Memory-dependent tasks |
| **Verification** | Output validation, quality checks | Review and testing |

### Multi-Model Router with Kubernetes-Style Failover

```
Request → Task Classifier → Provider Selection → Circuit Breaker → Execute
                                                               ↓
                         Failover Chain (if primary fails):
                         Gemini CLI → Gemini API → Claude → GLM → Mistral → OpenAI
                                                               ↓
                         Circuit Breaker States: Closed → Half-Open → Open
                         Provider Pooling: Lazy-init, connection reuse, idle unload
```

- **10+ Providers**: Gemini CLI, Gemini API, OpenAI, Claude, GLM, Mistral, DeepSeek, OpenRouter, Qwen, Grok, Moonshot, Ollama, LM Studio, vLLM, llama.cpp
- **Native SDK calls** — no gateway middleware. Each provider called directly via its own SDK.
- **Traffic shaping** — coding tasks → DeepSeek, research → Gemini, planning → Claude
- **Circuit breakers** — auto-trip on failures, half-open recovery, per-provider isolation
- **Idle unloading** — providers unused for 5 minutes are automatically unloaded

### On-Demand Agent & Swarm System

Agents and swarms are **never loaded at startup**. They are created when needed and destroyed after completion.

**Agent Library (40+ types across 7 categories):**

| Category | Agent Types |
|----------|-------------|
| Executive | CEO, COO, CFO, Strategist |
| Engineering | Frontend, Backend, DevOps, QA, Architect |
| Research | Researcher, Analyst, Librarian, Fact-Checker |
| Business | Marketer, Sales, Recruiter, Product Manager |
| Data | Data Engineer, ML Engineer, Analyst, Visualization |
| Knowledge | Knowledge Manager, Curator, Ontologist |
| Security | Security Auditor, Pen Tester, Compliance Officer |

**Swarm Library (14 patterns):**

| Swarm | Purpose |
|-------|---------|
| Software Factory | Full-stack development with specialized agents |
| Research | Parallel research with synthesis |
| Marketing | Campaign creation and analysis |
| Recruitment | Candidate screening and evaluation |
| Security | Vulnerability scanning and remediation |
| Data | ETL pipeline and analytics |
| Knowledge | Knowledge base construction |
| DevOps | CI/CD and infrastructure automation |
| Cloud Infrastructure | Cloud deployment and management |
| WordPress | Site building and content management |
| Moodle | Course creation and LMS management |
| Aviation Recruitment | Specialized aviation hiring |
| Customer Success | Support and retention |
| Executive Planning | Strategic planning and decision-making |

---

## Features

### Core Platform

| Feature | Description |
|---------|-------------|
| **Kernel-First Architecture** | Only 9 core runtimes — everything else is modular and on-demand |
| **Lazy Loading** | Agents, swarms, and providers loaded only when requested |
| **Idle Unloading** | Unused providers and agents automatically cleaned up after 5 min |
| **Circuit Breakers** | Per-provider fault isolation with half-open recovery |
| **Cold Start <3s** | Dashboard loads in under 1 second |

### AI Capabilities

| Feature | Description |
|---------|-------------|
| **7-Brain Reasoning** | Planning, Reasoning, Architecture, Research, Coding, Memory, Verification |
| **Multi-Model Failover** | 10+ providers with automatic failover chain |
| **Gemini CLI Auto-Discovery** | Detects local Gemini CLI, registers models dynamically |
| **Task-Aware Routing** | Coding → DeepSeek, Research → Gemini, Planning → Claude |
| **Swarm Intelligence** | 14 prebuilt swarm patterns for complex multi-agent tasks |

### Memory System

| Feature | Description |
|---------|-------------|
| **Shared Memory Pool** | No duplicate storage across agents |
| **Memory Compression** | Context and artifact compression for efficiency |
| **Session Snapshotting** | Full session state persistence |
| **Incremental Persistence** | Only changed data is written |
| **9 Memory Types** | Long-term, Short-term, Episodic, Semantic, Context, Project, User, Team, Conversation |

### Desktop & Distribution

| Feature | Description |
|---------|-------------|
| **Tauri v2 Desktop** | Native Windows app with Rust backend |
| **NSIS One-Click Installer** | Bundled Node.js v20 — zero external dependencies |
| **Start Menu Integration** | Shortcuts, desktop icon, Add/Remove Programs |
| **Clean Uninstaller** | Complete removal with registry cleanup |

### Enterprise

| Feature | Description |
|---------|-------------|
| **RBAC** | Role-based access control with permission scopes |
| **Audit Trail** | Complete activity logging and compliance |
| **Encryption** | AES-256-GCM encryption for sensitive data |
| **Observability** | Traces, metrics, logs with OpenTelemetry-compatible spans |
| **Self-Healing** | Automatic recovery from common failure modes |

---

## API Reference

| Route | Purpose |
|-------|---------|
| `/api/kernel` | Kernel status, runtime management |
| `/api/agents` | Agent lifecycle (spawn, execute, terminate) |
| `/api/swarm` | Swarm orchestration (create, deploy, dissolve) |
| `/api/models` | Model router, provider health, circuit breakers |
| `/api/gemini-cli` | Gemini CLI discovery, model registration |
| `/api/memory` | Memory CRUD, search, compression |
| `/api/knowledge` | Knowledge graph, RAG queries |
| `/api/knowledge/search` | Vector + graph + keyword search |
| `/api/knowledge/rag` | Retrieval-Augmented Generation |
| `/api/chat` | Multi-model chat with failover |
| `/api/browser` | Navigate, extract, analyze, search, summarize |
| `/api/auth` | Authentication and session management |
| `/api/audit` | Audit trail queries |
| `/api/observability` | Metrics, traces, logs |
| `/api/self-healing` | Health checks and auto-recovery |
| `/api/readiness` | System readiness validation |
| `/api/terminal` | Terminal command execution |
| `/api/artifacts` | Artifact management and preview |

---

## Uninstall

### Windows (NSIS Installer)

Use **Add/Remove Programs** in Windows Settings, or run:

```batch
"%LOCALAPPDATA%\Agentic OS\uninstall.bat"
```

### Manual Uninstall

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Agentic OS"
```

### Linux / macOS / WSL2

```bash
curl -fsSL https://raw.githubusercontent.com/rachidSabah/AgentincOS-Native/main/uninstall.sh | bash
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ─── AI Provider Keys (only set the ones you use) ───
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
GLM_API_KEY=...
MISTRAL_API_KEY=...
QWEN_API_KEY=...
XAI_API_KEY=...
MOONSHOT_API_KEY=...

# ─── Local Providers (auto-detected) ───
# Ollama: http://localhost:11434
# LM Studio: http://localhost:1234
# vLLM: http://localhost:8000

# ─── Gemini CLI (auto-discovered) ───
# No API key needed — uses local `gemini` CLI if available

# ─── Database ───
DATABASE_URL=file:./agentic-os.db

# ─── Auth ───
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

---

## Project Structure

```
AgentincOS-Native/
├── installer/                    # NSIS Windows installer
│   ├── installer-oneclick.nsi    # One-click installer script
│   ├── installer.nsi             # Full installer script
│   ├── build-exe.ps1             # PowerShell installer builder
│   ├── build-exe.sh              # Linux/macOS builder
│   ├── stage.js                  # Installer staging script
│   ├── icon.ico                  # Application icon
│   ├── start.bat                 # Windows start script
│   ├── stop.bat                  # Windows stop script
│   └── uninstall.bat             # Windows uninstall script
├── src-tauri/                    # Tauri v2 desktop shell (Rust)
│   ├── src/                      # Rust modules, plugins, commands
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Cyberpunk theme
│   │   └── api/                  # 18 API routes
│   ├── components/               # 16+ UI components
│   │   ├── ui/                   # shadcn/ui primitives
│   │   └── ...                   # Dashboard, agents, swarms, etc.
│   ├── lib/
│   │   ├── kernel.ts             # Core kernel with 9 runtimes
│   │   ├── model-router.ts       # Multi-model router with circuit breakers
│   │   ├── agent-runtime.ts      # Lazy-loaded agent system
│   │   ├── swarm-engine.ts       # On-demand swarm orchestration
│   │   ├── memory-optimizer.ts   # Memory pool, compression, snapshotting
│   │   ├── gemini-cli-discovery.ts # Auto-discovery engine
│   │   ├── readiness-validator.ts  # System readiness checks
│   │   ├── types.ts              # TypeScript type definitions
│   │   └── db.ts                 # Prisma database client
│   └── hooks/                    # React hooks
├── prisma/
│   └── schema.prisma             # 18 database models
├── scripts/                      # Utility scripts
├── uninstall.sh                  # Linux/macOS uninstaller
├── uninstall.ps1                 # Windows PowerShell uninstaller
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
└── package.json                  # Dependencies & scripts
```

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Cold Start | <3s | Achieved |
| Dashboard Load | <1s | Achieved |
| Agent Spawn | <500ms | Achieved |
| Swarm Spawn | <2s | Achieved |
| Memory Query | <100ms | Achieved |
| Artifact Preview | <300ms | Achieved |
| API Response | <500ms | Achieved |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Desktop | Tauri v2 (Rust) |
| Language | TypeScript + Rust |
| Styling | Tailwind CSS 4 + Glassmorphism |
| Animation | Framer Motion |
| State | Zustand |
| UI Components | shadcn/ui + Radix |
| Database | Prisma ORM (SQLite) |
| AI Providers | OpenAI, Anthropic, Google GenAI (native SDKs) |
| Installer | NSIS 3.x (LZMA compressed) |
| Runtime | Node.js v20 LTS (bundled) |

---

## Requirements

- **Windows 10/11** (for NSIS installer and Tauri desktop)
- **Node.js 20+** (only for development — installer bundles Node.js)
- **npm** or **bun** package manager
- **Git** for cloning and updates
- **NSIS 3.x** (only for building the installer)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/rachidSabah">rachidSabah</a>
</p>
