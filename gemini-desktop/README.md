# 🦀 ClawHub Desktop

> **ClawHub** is a Claude Desktop-style AI chat dashboard that runs locally on Windows. It is powered by Gemini CLI and supports multiple AI providers — DeepSeek, BigModel/GLM, OpenAI, Proxima, Anthropic and more — all from a single beautiful interface.

---

## ⚡ One-Command Setup (Windows)

Open **PowerShell** (or Windows Terminal) and paste this single command:

```powershell
irm https://raw.githubusercontent.com/rachidSabah/INFOHASCLAWHUB/main/setup.ps1 | iex
```

> This script will automatically: install Node.js (if missing), clone this repo, install dependencies, set up the database, and start the app at **http://localhost:3000**.

Or do it step by step manually (see [Manual Install](#manual-install) below).

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-Provider AI** | Gemini CLI, DeepSeek, BigModel/GLM, OpenAI, Anthropic, Proxima |
| 💬 **Persistent Chat History** | SQLite database — all conversations saved locally |
| 📂 **Multi-Tab Chat** | Open and switch between multiple conversations like browser tabs |
| ⭐ **Favorites & Rename** | Star conversations, rename them, search & filter |
| 🗂️ **Smart Sidebar** | Grouped by Today/Yesterday/Date with DropdownMenu actions |
| 🤖 **Custom Agents** | Create AI personas with custom system prompts and skills |
| 🔧 **Skills System** | Modular skill files for specialized AI behaviors |
| 📎 **File Attachments** | Attach files to any message |
| 🖥️ **Built-in Terminal** | Run shell commands directly from the sidebar |
| 🌐 **Proxima Gateway** | Local browser-level AI gateway (Claude, ChatGPT, Gemini, Perplexity) |
| 🎨 **Dark / Light Mode** | System-aware theme with toggle |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+N`, `Ctrl+B`, `Ctrl+,` |
| 📡 **Real-time Streaming** | SSE streaming with typing indicators |
| 📝 **Markdown Rendering** | Full GFM markdown in assistant responses |
| 🔌 **MCP Support** | Model Context Protocol server integration |

---

## 🖥️ Manual Install

### Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org/en/download/)
- **Gemini CLI** — `npm install -g @google/gemini-cli`
- *(Optional)* Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Step-by-Step

```powershell
# 1. Clone the repository
git clone https://github.com/rachidSabah/INFOHASCLAWHUB.git
cd INFOHASCLAWHUB

# 2. Install dependencies
npm install

# 3. Set up the database
node push-db.js

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

---

## 🔑 Environment Variables

Create a `.env` file in the project root (already included with defaults):

```env
DATABASE_URL="file:./db/clawhub.db"
```

---

## 🤖 Adding AI Providers

### Gemini CLI (default — no setup needed)
Just install the CLI and log in:
```powershell
npm install -g @google/gemini-cli
gemini  # Follow the Google OAuth login
```

### DeepSeek
1. Get an API key from [platform.deepseek.com](https://platform.deepseek.com)
2. Go to **Settings → Providers → Add Provider**
3. Name: `DeepSeek`, Base URL: `https://api.deepseek.com`, paste your API key

### BigModel / GLM (Chinese)
1. Get an API key from [open.bigmodel.cn](https://open.bigmodel.cn)
2. Go to **Settings → Providers → Add Provider**
3. Name: `BigModel`, Base URL: `https://open.bigmodel.cn/api/paas/v4`

### Proxima (Local Browser Gateway)
1. Install and start Proxima locally on port `3210`
2. It's automatically detected — no key needed

---

## 🏗️ Architecture

```
INFOHASCLAWHUB/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── gemini/chat/route.ts      # Streaming AI chat (CLI + providers)
│   │   │   ├── conversations/route.ts    # List / Create conversations
│   │   │   ├── conversations/[id]/
│   │   │   │   ├── route.ts              # GET messages, PATCH, DELETE conversation
│   │   │   │   └── messages/route.ts     # GET / POST messages
│   │   │   ├── agents/route.ts           # Agent CRUD
│   │   │   ├── skills/route.ts           # Skill CRUD
│   │   │   ├── providers/route.ts        # Provider management
│   │   │   ├── settings/route.ts         # App settings
│   │   │   ├── local/cmd/route.ts        # Local shell command executor
│   │   │   └── upload/route.ts           # File upload handler
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                      # Main dashboard
│   ├── components/
│   │   ├── ChatSidebar.tsx               # Sidebar (chats, agents, skills, terminal)
│   │   ├── ChatWindow.tsx                # Message feed
│   │   ├── ChatInput.tsx                 # Input bar with file attach
│   │   ├── TopBar.tsx                    # Model selector, theme, settings
│   │   ├── SettingsPanel.tsx             # Full settings dialog
│   │   ├── OnboardingWizard.tsx          # First-run setup wizard
│   │   └── ui/                           # shadcn/ui components
│   └── lib/
│       ├── db.ts                         # Prisma client
│       ├── stores.ts                     # Zustand state (chat, UI, settings)
│       ├── types.ts                      # TypeScript types & model list
│       └── utils.ts                      # Utilities
├── prisma/
│   └── schema.prisma                     # SQLite database schema
├── skills/                               # Skill SKILL.md files
├── db/                                   # SQLite database (auto-created)
├── .env                                  # Environment config
└── setup.ps1                             # One-command Windows setup script
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Ctrl+N` | New chat |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+,` | Open settings |
| `Escape` | Close dialogs |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Database | Prisma ORM (SQLite) |
| State | Zustand |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |

---

## 🐛 Troubleshooting

### "gemini is not recognized"
```powershell
npm install -g @google/gemini-cli
# Restart your terminal, then:
gemini --version
```

### Database errors
```powershell
node push-db.js
```

### Port 3000 already in use
```powershell
# Find and kill the process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm run dev
```

---

## 📄 License

MIT — free for personal and commercial use.
