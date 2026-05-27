import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import {
  isHermesInstalled,
  findHermesBinary,
  getHermesApiEndpoint,
  isHermesRunning,
  type HermesSkill,
} from "@/lib/hermes";

// ---------------------------------------------------------------------------
// Fallback skill list (used when Hermes CLI is not available)
// ---------------------------------------------------------------------------

const FALLBACK_SKILLS: HermesSkill[] = [
  { name: "apple-notes", description: "Manage Apple Notes via memo CLI: create, search, edit.", category: "Apple", source: "Built-in", platforms: ["macOS"] },
  { name: "apple-reminders", description: "Apple Reminders via remindctl: add, list, complete.", category: "Apple", source: "Built-in", platforms: ["macOS"] },
  { name: "findmy", description: "Track Apple devices/AirTags via FindMy.app on macOS.", category: "Apple", source: "Built-in", platforms: ["macOS"] },
  { name: "imessage", description: "Send and receive iMessages/SMS via the imsg CLI on macOS.", category: "Apple", source: "Built-in", platforms: ["macOS"] },
  { name: "macos-computer-use", description: "Drive the macOS desktop in the background — screenshots, mouse, keyboard, scroll, drag.", category: "Apple", source: "Built-in", platforms: ["macOS"] },
  { name: "claude-code", description: "Delegate coding to Claude Code CLI (features, PRs).", category: "AI Agents", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "codex", description: "Delegate coding to OpenAI Codex CLI (features, PRs).", category: "AI Agents", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "hermes-agent", description: "Configure, extend, or contribute to Hermes Agent.", category: "AI Agents", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "kanban-codex-lane", description: "Run Codex CLI as an isolated implementation lane in Kanban workflow.", category: "AI Agents", source: "Built-in" },
  { name: "opencode", description: "Delegate coding to OpenCode CLI (features, PR review).", category: "AI Agents", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "architecture-diagram", description: "Dark-themed SVG architecture/cloud/infra diagrams as HTML.", category: "Creative", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "ascii-art", description: "ASCII art: pyfiglet, cowsay, boxes, image-to-ascii.", category: "Creative", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "excalidraw", description: "Hand-drawn Excalidraw JSON diagrams (arch, flow, seq).", category: "Creative", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "comfyui", description: "Generate images, video, and audio with ComfyUI.", category: "Creative", source: "Built-in", platforms: ["macOS", "Linux", "Windows"] },
  { name: "claude-design", description: "Design one-off HTML artifacts (landing, deck, prototype).", category: "Creative", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "manim-video", description: "Manim CE animations: 3Blue1Brown math/algo videos.", category: "Creative", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "p5js", description: "p5.js sketches: gen art, shaders, interactive, 3D.", category: "Creative", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "pixel-art", description: "Pixel art w/ era palettes (NES, Game Boy, PICO-8).", category: "Creative", source: "Built-in", platforms: ["Linux", "macOS", "Windows"] },
  { name: "github-auth", description: "GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login.", category: "GitHub", source: "Built-in" },
  { name: "github-code-review", description: "Review PRs: diffs, inline comments via gh or REST.", category: "GitHub", source: "Built-in" },
  { name: "github-issues", description: "Create, triage, label, assign GitHub issues via gh or REST.", category: "GitHub", source: "Built-in" },
  { name: "github-pr-workflow", description: "GitHub PR lifecycle: branch, commit, open, CI, merge.", category: "GitHub", source: "Built-in" },
  { name: "github-repo-management", description: "Clone/create/fork repos; manage remotes, releases.", category: "GitHub", source: "Built-in" },
  { name: "codebase-inspection", description: "Inspect codebases w/ pygount: LOC, languages, ratios.", category: "GitHub", source: "Built-in" },
  { name: "kanban-orchestrator", description: "Decomposition playbook for orchestrator profile routing work through Kanban.", category: "DevOps", source: "Built-in" },
  { name: "kanban-worker", description: "Pitfalls, examples, and edge cases for Hermes Kanban workers.", category: "DevOps", source: "Built-in" },
  { name: "webhook-subscriptions", description: "Event-driven agent runs.", category: "DevOps", source: "Built-in" },
  { name: "native-mcp", description: "MCP client: connect servers, register tools (stdio/HTTP).", category: "MCP", source: "Built-in" },
  { name: "gif-search", description: "Search/download GIFs from Tenor.", category: "Media", source: "Built-in" },
  { name: "spotify", description: "Spotify: play, search, queue, manage playlists and devices.", category: "Media", source: "Built-in" },
  { name: "youtube-content", description: "YouTube transcripts to summaries, threads, blogs.", category: "Media", source: "Built-in" },
  { name: "dspy", description: "DSPy: declarative LM programs, auto-optimize prompts, RAG.", category: "MLOps", source: "Built-in" },
  { name: "huggingface-hub", description: "HuggingFace hf CLI: search/download/upload models, datasets.", category: "MLOps", source: "Built-in" },
  { name: "llama-cpp", description: "llama.cpp local GGUF inference + HF Hub model discovery.", category: "MLOps", source: "Built-in" },
  { name: "serving-llms-vllm", description: "vLLM: high-throughput LLM serving, OpenAI API, quantization.", category: "MLOps", source: "Built-in" },
  { name: "weights-and-biases", description: "W&B: log ML experiments, sweeps, model registry, dashboards.", category: "MLOps", source: "Built-in" },
  { name: "evaluating-llms-harness", description: "lm-eval-harness: benchmark LLMs (MMLU, GSM8K, etc.).", category: "MLOps", source: "Built-in" },
  { name: "airtable", description: "Airtable REST API via curl. Records CRUD, filters, upserts.", category: "Productivity", source: "Built-in" },
  { name: "google-workspace", description: "Gmail, Calendar, Drive, Docs, Sheets via gws CLI or Python.", category: "Productivity", source: "Built-in" },
  { name: "linear", description: "Linear: manage issues, projects, teams via GraphQL + curl.", category: "Productivity", source: "Built-in" },
  { name: "maps", description: "Geocode, POIs, routes, timezones via OpenStreetMap/OSRM.", category: "Productivity", source: "Built-in" },
  { name: "minecraft-modpack-server", description: "Host modded Minecraft servers (CurseForge, Modrinth).", category: "Gaming", source: "Built-in" },
  { name: "pokemon-player", description: "Play Pokemon via headless emulator + RAM reads.", category: "Gaming", source: "Built-in" },
];

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const source = searchParams.get("source") ?? undefined;

  const bin = findHermesBinary();
  const apiEndpoint = getHermesApiEndpoint();
  const running = await isHermesRunning(apiEndpoint);

  let skills: HermesSkill[] = [];
  let fromHermes = false;

  // Strategy 1: Try `hermes skills list --json` via CLI
  if (bin) {
    try {
      const cmd = `${bin} skills list --json 2>/dev/null`;
      const output = execSync(cmd, {
        encoding: "utf-8",
        timeout: 15000,
      }).trim();

      if (output) {
        const parsed = JSON.parse(output);
        // Hermes CLI may return an array or an object with a skills/items key
        if (Array.isArray(parsed)) {
          skills = parsed;
        } else if (Array.isArray(parsed.skills)) {
          skills = parsed.skills;
        } else if (Array.isArray(parsed.items)) {
          skills = parsed.items;
        } else {
          // Try to extract skill-like objects from the top-level keys
          skills = Object.values(parsed).filter(
            (v): v is HermesSkill =>
              typeof v === "object" && v !== null && "name" in v,
          );
        }
        fromHermes = true;
      }
    } catch {
      // CLI failed — fall through to API or fallback
    }
  }

  // Strategy 2: Try the Hermes API server for skills
  if (!fromHermes && running) {
    try {
      const res = await fetch(`${apiEndpoint}/v1/skills`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          skills = data;
        } else if (Array.isArray(data.skills)) {
          skills = data.skills;
        } else if (Array.isArray(data.items)) {
          skills = data.items;
        }
        fromHermes = true;
      }
    } catch {
      // API failed — fall through to fallback
    }
  }

  // Strategy 3: Use the hardcoded fallback list
  if (!fromHermes) {
    skills = FALLBACK_SKILLS;
  }

  // Apply filters
  let filtered = skills;

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }

  if (category) {
    const cat = category.toLowerCase();
    filtered = filtered.filter(
      (s) => s.category?.toLowerCase() === cat,
    );
  }

  if (source) {
    const src = source.toLowerCase();
    filtered = filtered.filter(
      (s) => s.source?.toLowerCase() === src,
    );
  }

  return NextResponse.json({
    skills: filtered,
    total: filtered.length,
    source: fromHermes ? "hermes" : "fallback",
    hermesAvailable: isHermesInstalled(),
    hermesRunning: running,
  });
}
