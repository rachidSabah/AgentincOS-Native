# Hermes Agent — Full Documentation Extract

> **Source:** https://hermes-agent.nousresearch.com/docs/
> **GitHub:** https://github.com/NousResearch/hermes-agent
> **Extracted:** 2026-03-04

---

## Table of Contents

1. [Installation](#1-installation)
2. [Quickstart](#2-quickstart)
3. [Skills Hub](#3-skills-hub)
4. [Integrations](#4-integrations)
5. [Pages That Returned 404](#5-pages-that-returned-404)
6. [Key Findings Summary](#6-key-findings-summary)

---

## 1. Installation

**URL:** https://hermes-agent.nousresearch.com/docs/getting-started/installation

Get Hermes Agent up and running in under two minutes with the one-line installer.

### Quick Install

#### One-Line Installer (Linux / macOS / WSL2)

For a git-based install that tracks `main` and gives you the latest changes immediately:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

#### Windows (native, PowerShell) — Early Beta

> **Early BETA** — Native Windows support is early beta. It installs and works for the common paths, but hasn't been road-tested as broadly as the POSIX installers. For the most battle-tested setup on Windows today, use the Linux/macOS one-liner above inside WSL2 instead.

Open PowerShell and run:

```powershell
iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)
```

The installer handles **everything**: `uv`, Python 3.11, Node.js 22, `ripgrep`, `ffmpeg`, and a **portable Git Bash** (PortableGit). It clones the repo under `%LOCALAPPDATA%\hermes\hermes-agent`, creates a virtualenv, and adds `hermes` to your **User PATH**. Restart your terminal after the install so PATH picks up.

**How Git is handled:**
- If git is already on your PATH, the installer uses your existing install.
- Otherwise it downloads portable PortableGit (~50MB) and unpacks it to `%LOCALAPPDATA%\hermes\git`. No admin rights required.
- On 32-bit Windows it falls back to MinGit (bash-dependent features won't work).

A thin **GUI Desktop installer** is also available — it calls `install.ps1` under the hood.

#### Android / Termux

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

The installer detects Termux automatically and switches to a tested Android flow.

### Windows Feature Parity (Early Beta)

Everything except the browser-based dashboard chat terminal runs natively on Windows:
- CLI — native
- Gateway (Telegram, Discord, Slack, …) — native
- Cron scheduler — native
- Browser tool — native (Chromium via Node.js)
- MCP servers — native (stdio and HTTP transports both supported)
- Dashboard /chat terminal pane — WSL2 only (uses a POSIX PTY)

### What the Installer Does

The installer handles all dependencies (Python, Node.js, ripgrep, ffmpeg), the repo clone, virtual environment, global `hermes` command setup, and LLM provider configuration.

### Install Layout

| Installer | Code lives at | hermes binary | Data directory |
|-----------|--------------|---------------|----------------|
| `pip install` | Python site-packages | `~/.local/bin/hermes` (console_scripts) | `~/.hermes/` |
| Per-user (git installer) | `~/.hermes/hermes-agent/` | `~/.local/bin/hermes` (symlink) | `~/.hermes/` |
| Root-mode (`sudo`) | `/usr/local/lib/hermes-agent/` | `/usr/local/bin/hermes` | `/root/.hermes/` |

### After Installation

```bash
source ~/.bashrc   # or: source ~/.zshrc
hermes             # Start chatting!
```

Reconfiguration commands:

```bash
hermes model          # Choose your LLM provider and model
hermes tools          # Configure which tools are enabled
hermes gateway setup  # Set up messaging platforms
hermes config set     # Set individual config values
hermes setup          # Full setup wizard
```

**Fastest path: Nous Portal** — One subscription covers 300+ models plus the Tool Gateway:

```bash
hermes setup --portal
```

### Prerequisites

- **pip install:** No prerequisites beyond Python 3.11+.
- **Git installer:** Only Git is required. The installer automatically handles: uv, Python 3.11 (via uv), Node.js v22, ripgrep, ffmpeg.

### Non-Sudo / System Service User Installs

Supported. The installer detects whether sudo is available and gracefully degrades. To skip browser automation entirely:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s -- --skip-browser
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `hermes: command not found` | Reload your shell (`source ~/.bashrc`) or check PATH |
| API key not set | Run `hermes model` or `hermes config set OPENROUTER_API_KEY your_key` |
| Missing config after update | Run `hermes config check` then `hermes config migrate` |

For more diagnostics: `hermes doctor`

### Install Method Auto-Detection

Hermes auto-detects whether it was installed via pip, the git installer, Homebrew, or NixOS, and `hermes update` prints the matching update command for that path.

---

## 2. Quickstart

**URL:** https://hermes-agent.nousresearch.com/docs/getting-started/quickstart

This guide gets you from zero to a working Hermes setup that survives real use. Install, choose a provider, verify a working chat, and know exactly what to do when something breaks.

### Who This Is For

- Brand new and want the shortest path to a working setup
- Switching providers and don't want to lose time to config mistakes
- Setting up Hermes for a team, bot, or always-on workflow
- Tired of "it installed, but it still does nothing"

### The Fastest Path

| Goal | Do this first | Then do this |
|------|--------------|--------------|
| I just want Hermes working | `hermes setup` | Run a real chat and verify it responds |
| I already know my provider | `hermes model` | Save the config, then start chatting |
| I want a bot or always-on setup | `hermes gateway setup` after CLI works | Connect Telegram, Discord, Slack, etc. |
| I want a local or self-hosted model | `hermes model` → custom endpoint | Verify the endpoint, model name, and context length |
| I want multi-provider fallback | `hermes model` first | Add routing and fallback only after the base chat works |

**Rule of thumb:** if Hermes cannot complete a normal chat, do not add more features yet. Get one clean conversation working first, then layer on gateway, cron, skills, voice, or routing.

### Step 1: Install Hermes Agent

**Option A — pip (simplest):**

```bash
pip install hermes-agent
hermes postinstall     # optional: installs Node.js, browser, ripgrep, ffmpeg + runs setup
```

**Option B — git installer (tracks main branch):**

```bash
# Linux / macOS / WSL2 / Android (Termux)
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

After it finishes, reload your shell:

```bash
source ~/.bashrc   # or source ~/.zshrc
```

### Step 2: Choose a Provider

The single most important setup step. Use `hermes model` to walk through the choice interactively:

```bash
hermes model
```

**Supported Providers:**

| Provider | What it is | How to set up |
|----------|-----------|---------------|
| **Nous Portal** | Subscription-based, zero-config | OAuth login via `hermes model` |
| **OpenAI Codex** | ChatGPT OAuth, uses Codex models | Device code auth via `hermes model` |
| **Anthropic** | Claude models directly | OAuth login or API key |
| **OpenRouter** | Multi-provider routing across many models | Enter your API key |
| **Z.AI** | GLM / Zhipu-hosted models | Set `GLM_API_KEY` / `ZAI_API_KEY` |
| **Kimi / Moonshot** | Moonshot-hosted coding and chat models | Set `KIMI_API_KEY` |
| **Arcee AI** | Trinity models | Set `ARCEEAI_API_KEY` |
| **GMI Cloud** | Multi-model direct API | Set `GMI_API_KEY` |
| **MiniMax (OAuth)** | MiniMax-M2.7 via browser OAuth | `hermes model` → MiniMax (OAuth) |
| **Alibaba Cloud** | Qwen models via DashScope | Set `DASHSCOPE_API_KEY` |
| **Hugging Face** | 20+ open models via unified router | Set `HF_TOKEN` |
| **AWS Bedrock** | Claude, Nova, Llama, DeepSeek via native Converse API | IAM role or `aws configure` |
| **Kilo Code** | KiloCode-hosted models | Set `KILOCODE_API_KEY` |
| **DeepSeek** | Direct DeepSeek API access | Set `DEEPSEEK_API_KEY` |
| **NVIDIA NIM** | Nemotron models via build.nvidia.com | Set `NVIDIA_API_KEY` |
| **GitHub Copilot** | GPT-5.x, Claude, Gemini, etc. | OAuth via `hermes model` |
| **Vercel AI Gateway** | Vercel AI Gateway routing | Set `AI_GATEWAY_API_KEY` |
| **Custom Endpoint** | VLLM, SGLang, Ollama, or any OpenAI-compatible API | Set base URL + API key |

**Minimum context: 64K tokens** — Hermes Agent requires a model with at least 64,000 tokens of context. Most hosted models meet this easily. For local models, set context size to at least 64K.

**How settings are stored:**
- Secrets and tokens → `~/.hermes/.env`
- Non-secret settings → `~/.hermes/config.yaml`

Set values via CLI:

```bash
hermes config set model anthropic/claude-opus-4.6
hermes config set terminal.backend docker
hermes config set OPENROUTER_API_KEY sk-or-...
```

### Step 3: Run Your First Chat

```bash
hermes          # classic CLI
hermes --tui    # modern TUI (recommended)
```

Hermes ships with two terminal interfaces: the classic prompt_toolkit CLI and a newer TUI with modal overlays, mouse selection, and non-blocking input. Both share the same sessions, slash commands, and config.

### Step 4: Verify Sessions Work

```bash
hermes --continue    # Resume the most recent session
hermes -c            # Short form
```

### Step 5: Try Key Features

**Use the terminal:**
```
❯ What's my disk usage? Show the top 5 largest directories.
```

**Slash commands** — Type `/` to see an autocomplete dropdown:

| Command | What it does |
|---------|-------------|
| `/help` | Show all available commands |
| `/tools` | List available tools |
| `/model` | Switch models interactively |
| `/personality pirate` | Try a fun personality |
| `/save` | Save the conversation |

**Multi-line input** — Press Alt+Enter, Ctrl+J, or Shift+Enter to add a new line.

**Interrupt the agent** — Type a new message and press Enter to interrupt the current task. Ctrl+C also works.

### Step 6: Add the Next Layer

Only after the base chat works:

**Bot or shared assistant:**
```bash
hermes gateway setup   # Interactive platform configuration
```

**Automation and tools:**
```bash
hermes tools    # Tune tool access per platform
hermes skills   # Browse and install reusable workflows
```

**Sandboxed terminal:**
```bash
hermes config set terminal.backend docker   # Docker isolation
hermes config set terminal.backend ssh       # Remote server
```

**Voice mode:**
```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[voice]"
# Then in CLI: /voice on. Press Ctrl+B to record.
```

**Skills:**
```bash
hermes skills search kubernetes
hermes skills install openai/skills/k8s
```

**MCP servers:**
```yaml
# Add to ~/.hermes/config.yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxx"
```

**Editor integration (ACP):**
```bash
hermes acp
```

### Common Failure Modes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Empty or broken replies | Provider auth or model selection is wrong | Run `hermes model` again |
| Custom endpoint returns garbage | Wrong base URL or model name | Verify endpoint in a separate client |
| Gateway starts but nobody can message it | Bot token/allowlist incomplete | Re-run `hermes gateway setup` |
| `hermes --continue` can't find old session | Switched profiles or session never saved | Check `hermes sessions list` |

### Recovery Toolkit

When something feels off, use this order:
1. `hermes doctor`
2. `hermes model`
3. `hermes setup`
4. `hermes sessions list`
5. `hermes --continue`
6. `hermes gateway status`

### Quick Reference

| Command | Description |
|---------|-------------|
| `hermes` | Start chatting |
| `hermes model` | Choose your LLM provider and model |
| `hermes tools` | Configure which tools are enabled per platform |
| `hermes setup` | Full setup wizard (configures everything at once) |
| `hermes doctor` | Diagnose issues |
| `hermes update` | Update to latest version |
| `hermes gateway` | Start the messaging gateway |
| `hermes --continue` | Resume last session |

---

## 3. Skills Hub

**URL:** https://hermes-agent.nousresearch.com/docs/skills

### Overview

The Skills Hub is a catalog of **2,550 skills** across **11 registries**, refreshed twice daily.

| Type | Count |
|------|-------|
| Built-in | 90 |
| Optional | 84 |
| Community | 2,376 |
| **Categories** | **35** |

### Skill Registries (Sources)

| Registry | Count |
|----------|-------|
| skills.sh | 1,218 |
| LobeHub | 500 |
| browse.sh | 330 |
| ClawHub | 200 |
| OpenAI | 44 |
| gstack | 51 |
| HuggingFace | 15 |
| Anthropic | 17 |
| Marketplace | 1 |

### Skill Categories

| Category | Count | Category | Count |
|----------|-------|----------|-------|
| All Skills | 2,550 | Software Dev | 76 |
| Creative | 72 | Research | 52 |
| MLOps | 39 | Translation | 24 |
| Productivity | 19 | Real Estate | 17 |
| Finance | 15 | Ap2 | 15 |
| Social Media | 14 | Media | 12 |
| Health | 12 | Travel | 12 |
| Gaming | 11 | Government | 11 |
| Marketplace | 10 | GitHub | 9 |
| Ecommerce | 9 | Restaurants | 9 |
| AI Agents | 8 | Security | 8 |
| Healthcare | 8 | DevOps | 7 |
| Logistics | 6 | Shopping | 6 |
| Apple | 5 | Jobs | 5 |
| News | 5 | Weather | 5 |
| MCP | 4 | Automotive | 4 |
| Copywriting | 4 | Recipes | 4 |

### Built-in Skills (60 extracted)

#### Apple
- **apple-notes**: Manage Apple Notes via memo CLI: create, search, edit. (macOS)
- **apple-reminders**: Apple Reminders via remindctl: add, list, complete. (macOS)
- **findmy**: Track Apple devices/AirTags via FindMy.app on macOS. (macOS)
- **imessage**: Send and receive iMessages/SMS via the imsg CLI on macOS. (macOS)
- **macos-computer-use**: Drive the macOS desktop in the background — screenshots, mouse, keyboard, scroll, drag — without stealing the user's cursor, keyboard focus, or Space. (macOS)

#### AI Agents
- **claude-code**: Delegate coding to Claude Code CLI (features, PRs).
- **codex**: Delegate coding to OpenAI Codex CLI (features, PRs).
- **hermes-agent**: Configure, extend, or contribute to Hermes Agent.
- **kanban-codex-lane**: Run Codex CLI as an isolated implementation lane in Kanban workflow.
- **opencode**: Delegate coding to OpenCode CLI (features, PR review).

#### Creative
- **architecture-diagram**: Dark-themed SVG architecture/cloud/infra diagrams as HTML.
- **ascii-art**: ASCII art: pyfiglet, cowsay, boxes, image-to-ascii.
- **ascii-video**: Convert video/audio to colored ASCII MP4/GIF.
- **baoyu-article-illustrator**: Article illustrations: type × style × palette consistency.
- **baoyu-comic**: Knowledge comics: educational, biography, tutorial.
- **baoyu-infographic**: Infographics: 21 layouts x 21 styles.
- **claude-design**: Design one-off HTML artifacts (landing, deck, prototype).
- **comfyui**: Generate images, video, and audio with ComfyUI — install, launch, manage nodes/models, run workflows.
- **design-md**: Author/validate/export Google's DESIGN.md token spec files.
- **excalidraw**: Hand-drawn Excalidraw JSON diagrams (arch, flow, seq).
- **humanizer**: Humanize text: strip AI-isms and add real voice.
- **ideation**: Generate project ideas via creative constraints.
- **manim-video**: Manim CE animations: 3Blue1Brown math/algo videos.
- **p5js**: p5.js sketches: gen art, shaders, interactive, 3D.
- **pixel-art**: Pixel art w/ era palettes (NES, Game Boy, PICO-8).
- **popular-web-designs**: 54 real design systems (Stripe, Linear, Vercel) as HTML/CSS.
- **pretext**: DOM-free text layout for ASCII art, typographic flow, generative art.
- **sketch**: Throwaway HTML mockups: 2-3 design variants to compare.
- **songwriting-and-ai-music**: Songwriting craft and Suno AI music prompts.
- **touchdesigner-mcp**: Control a running TouchDesigner instance via twozero MCP.

#### DevOps
- **kanban-orchestrator**: Decomposition playbook for orchestrator profile routing work through Kanban.
- **kanban-worker**: Pitfalls, examples, and edge cases for Hermes Kanban workers.
- **webhook-subscriptions**: Event-driven agent runs.

#### Gaming
- **minecraft-modpack-server**: Host modded Minecraft servers (CurseForge, Modrinth).
- **pokemon-player**: Play Pokemon via headless emulator + RAM reads.

#### GitHub
- **codebase-inspection**: Inspect codebases w/ pygount: LOC, languages, ratios.
- **github-auth**: GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login.
- **github-code-review**: Review PRs: diffs, inline comments via gh or REST.
- **github-issues**: Create, triage, label, assign GitHub issues via gh or REST.
- **github-pr-workflow**: GitHub PR lifecycle: branch, commit, open, CI, merge.
- **github-repo-management**: Clone/create/fork repos; manage remotes, releases.

#### MCP
- **native-mcp**: MCP client: connect servers, register tools (stdio/HTTP).

#### Media
- **gif-search**: Search/download GIFs from Tenor.
- **heartmula**: HeartMuLa: Suno-like song generation from lyrics + tags.
- **songsee**: Audio spectrograms/features (mel, chroma, MFCC) via CLI.
- **spotify**: Spotify: play, search, queue, manage playlists and devices.
- **youtube-content**: YouTube transcripts to summaries, threads, blogs.

#### MLOps
- **audiocraft-audio-generation**: AudioCraft: MusicGen text-to-music, AudioGen text-to-sound.
- **dspy**: DSPy: declarative LM programs, auto-optimize prompts, RAG.
- **evaluating-llms-harness**: lm-eval-harness: benchmark LLMs (MMLU, GSM8K, etc.).
- **huggingface-hub**: HuggingFace hf CLI: search/download/upload models, datasets.
- **llama-cpp**: llama.cpp local GGUF inference + HF Hub model discovery.
- **obliteratus**: OBLITERATUS: abliterate LLM refusals (diff-in-means).
- **segment-anything-model**: SAM: zero-shot image segmentation via points, boxes, masks.
- **serving-llms-vllm**: vLLM: high-throughput LLM serving, OpenAI API, quantization.
- **weights-and-biases**: W&B: log ML experiments, sweeps, model registry, dashboards.

#### Productivity
- **airtable**: Airtable REST API via curl. Records CRUD, filters, upserts.
- **google-workspace**: Gmail, Calendar, Drive, Docs, Sheets via gws CLI or Python.
- **linear**: Linear: manage issues, projects, teams via GraphQL + curl.
- **maps**: Geocode, POIs, routes, timezones via OpenStreetMap/OSRM.

---

## 4. Integrations

**URL:** https://hermes-agent.nousresearch.com/docs/integrations

Hermes Agent connects to external systems for AI inference, tool servers, IDE workflows, programmatic access, and more.

### AI Providers & Routing

- **AI Providers** — OpenRouter, Anthropic, OpenAI, Google, and any OpenAI-compatible endpoint. Hermes auto-detects capabilities like vision, streaming, and tool use per provider.
- **Provider Routing** — Fine-grained control over which underlying providers handle your OpenRouter requests. Optimize for cost, speed, or quality with sorting, whitelists, blacklists, and explicit priority ordering.
- **Fallback Providers** — Automatic failover to backup LLM providers when your primary model encounters errors. Includes primary model fallback and independent auxiliary task fallback for vision, compression, and web extraction.

### Tool Servers (MCP)

- **MCP Servers** — Connect Hermes to external tool servers via Model Context Protocol. Access tools from GitHub, databases, file systems, browser stacks, internal APIs, and more. Supports both stdio and SSE transports, per-server tool filtering, and capability-aware resource/prompt registration.

### Web Search Backends

The `web_search` and `web_extract` tools support four backend providers:

| Backend | Env Var | Search | Extract | Crawl |
|---------|---------|--------|---------|-------|
| **Firecrawl** (default) | `FIRECRAWL_API_KEY` | ✔ | ✔ | ✔ |
| **Parallel** | `PARALLEL_API_KEY` | ✔ | ✔ | — |
| **Tavily** | `TAVILY_API_KEY` | ✔ | ✔ | ✔ |
| **Exa** | `EXA_API_KEY` | ✔ | ✔ | — |

Config example:
```yaml
web:
  backend: firecrawl  # firecrawl | parallel | tavily | exa
```

If `web.backend` is not set, the backend is auto-detected from whichever API key is available. Self-hosted Firecrawl is also supported via `FIRECRAWL_API_URL`.

### Browser Automation

Full browser automation with multiple backend options:

- **Browserbase** — Managed cloud browsers with anti-bot tooling, CAPTCHA solving, and residential proxies
- **Browser Use** — Alternative cloud browser provider
- **Local Chromium-family CDP** — Connect to running Chrome, Brave, Chromium, or Edge via `/browser connect`
- **Local Chromium** — Headless local browser via the agent-browser CLI

### Voice & TTS Providers

Text-to-speech and speech-to-text across all messaging platforms:

| Provider | Quality | Cost | API Key |
|----------|---------|------|---------|
| **Edge TTS** (default) | Good | Free | None needed |
| **ElevenLabs** | Excellent | Paid | `ELEVENLABS_API_KEY` |
| **OpenAI TTS** | Good | Paid | `VOICE_TOOLS_OPENAI_KEY` |
| **MiniMax** | Good | Paid | `MINIMAX_API_KEY` |
| **NeuTTS** | Good | Free | None needed |

Speech-to-text supports six providers: local faster-whisper (free, on-device), a local command wrapper, Groq, OpenAI Whisper API, Mistral, and xAI. Voice message transcription works across Telegram, Discord, WhatsApp, and other messaging platforms.

### IDE & Editor Integration

- **IDE Integration (ACP)** — Use Hermes Agent inside ACP-compatible editors such as VS Code, Zed, and JetBrains. Hermes runs as an ACP server, rendering chat messages, tool activity, file diffs, and terminal commands inside your editor.

### Programmatic Access

- **API Server** — Expose Hermes as an OpenAI-compatible HTTP endpoint. Any frontend that speaks the OpenAI format — Open WebUI, LobeChat, LibreChat, NextChat, ChatBox — can connect and use Hermes as a backend with its full toolset.

### Memory & Personalization

- **Built-in Memory** — Persistent, curated memory via `MEMORY.md` and `USER.md` files. The agent maintains bounded stores of personal notes and user profile data that survive across sessions.
- **Memory Providers** — Plug in external memory backends for deeper personalization. Eight providers supported: Honcho (dialectic reasoning), OpenViking (tiered retrieval), Mem0 (cloud extraction), Hindsight (knowledge graphs), Holographic (local SQLite), RetainDB (hybrid search), ByteRover (CLI-based), and Supermemory.

### Messaging Platforms

Hermes runs as a gateway bot on **19+ messaging platforms**, all configured through the same gateway subsystem:

Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email, SMS, DingTalk, Feishu/Lark, WeCom, WeCom Callback, Weixin, BlueBubbles, QQ Bot, Yuanbao, Home Assistant, Microsoft Teams, Webhooks

### Home Automation

- **Home Assistant** — Control smart home devices via four dedicated tools (`ha_list_entities`, `ha_get_state`, `ha_list_services`, `ha_call_service`). The toolset activates automatically when `HASS_TOKEN` is configured.

### Plugins

- **Plugin System** — Extend Hermes with custom tools, lifecycle hooks, and CLI commands without modifying core code. Plugins are discovered from `~/.hermes/plugins/`, project-local `.hermes/plugins/`, and pip-installed entry points.
- **Build a Plugin** — Step-by-step guide for creating Hermes plugins with tools, hooks, and CLI commands.

### Training & Evaluation

- **Batch Processing** — Run the agent across hundreds of prompts in parallel, generating structured ShareGPT-format trajectory data for training data generation or evaluation.

---

## 5. Pages That Returned 404

The following pages returned **404 Not Found** errors when fetched. These are likely client-side routed pages that require JavaScript to render (Docusaurus SPA):

| URL | Status |
|-----|--------|
| `https://hermes-agent.nousresearch.com/docs/features/overview` | 404 — Page not found |
| `https://hermes-agent.nousresearch.com/docs/reference/config` | 404 — Page not found |
| `https://hermes-agent.nousresearch.com/docs/using-hermes/chat` | 404 — Page not found |
| `https://hermes-agent.nousresearch.com/docs/integrations/overview` | 404 — Page not found |

**Note:** The integrations page was successfully fetched at the parent URL `/docs/integrations` (without `/overview`). The other three sections (Features, Using Hermes, Reference) are SPA client-side routes that the page reader cannot render without a full browser.

---

## 6. Key Findings Summary

### Architecture

Hermes Agent is a **multi-modal AI agent framework** built by Nous Research. It is:
- **Python-based** (Python 3.11+), installed via pip or a git-based one-line installer
- **Model-agnostic** — supports 20+ LLM providers (Nous Portal, OpenAI, Anthropic, OpenRouter, HuggingFace, AWS Bedrock, DeepSeek, Alibaba/Qwen, GitHub Copilot, custom endpoints, etc.)
- **Multi-platform** — runs on Linux, macOS, Windows (beta), WSL2, and Android (Termux)
- **Dual interface** — classic CLI and modern TUI with modal overlays
- **Config-driven** — secrets in `~/.hermes/.env`, settings in `~/.hermes/config.yaml`
- **Extensible via skills** — 2,550 skills across 11 registries (90 built-in, 84 optional, 2,376 community)
- **Minimum 64K context** required for the LLM model

### Core Features

1. **Terminal & File Operations** — Run commands, read/write files, search code
2. **Web Search & Extraction** — 4 backends (Firecrawl, Parallel, Tavily, Exa)
3. **Browser Automation** — Cloud (Browserbase, Browser Use) or local Chromium/CDP
4. **Voice & TTS** — 5 TTS providers + 6 STT providers (including free local whisper)
5. **MCP Server Support** — Connect external tool servers via Model Context Protocol
6. **Messaging Gateway** — 19+ platforms (Telegram, Discord, Slack, WhatsApp, Signal, etc.)
7. **Skills System** — Searchable, installable skill packages across 35 categories
8. **IDE Integration** — ACP protocol for VS Code, Zed, JetBrains
9. **API Server** — OpenAI-compatible HTTP endpoint for third-party frontends
10. **Memory** — Built-in (MEMORY.md/USER.md) + 8 external memory providers
11. **Home Automation** — Native Home Assistant integration
12. **Plugin System** — Custom tools, hooks, CLI commands
13. **Kanban/DevOps** — Orchestrator + worker patterns with Codex/Claude Code delegation
14. **Batch Processing** — Parallel agent runs for evaluation/training data

### CLI Commands (Key)

| Command | Purpose |
|---------|---------|
| `hermes` | Start chatting (classic CLI) |
| `hermes --tui` | Start with modern TUI |
| `hermes model` | Choose/switch LLM provider |
| `hermes setup` | Full setup wizard |
| `hermes setup --portal` | Quick setup with Nous Portal |
| `hermes tools` | Configure enabled tools |
| `hermes skills` | Browse and install skills |
| `hermes gateway setup` | Configure messaging platforms |
| `hermes doctor` | Diagnose configuration issues |
| `hermes acp` | Start ACP editor integration |
| `hermes config set` | Set individual config values |
| `hermes --continue` | Resume last session |
| `hermes update` | Update to latest version |

### Key Capabilities Noted

- **Computer Use** — Full macOS desktop automation (background screenshots, mouse, keyboard, scroll, drag)
- **Coding Delegation** — Delegate to Claude Code CLI, OpenAI Codex CLI, or OpenCode CLI
- **Creative Generation** — ComfyUI, Manim, p5.js, Excalidraw, pixel art, ASCII art, infographics
- **MLOps** — vLLM serving, llama.cpp inference, lm-eval-harness, W&B, DSPy, HuggingFace Hub
- **Productivity** — Google Workspace, Airtable, Linear, Spotify, YouTube content extraction
- **Finance** — Multiple finance-related community skills available
