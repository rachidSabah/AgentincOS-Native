import { execFile, exec } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Gemini CLI data directory. */
export const GEMINI_DATA_DIR = join(homedir(), ".gemini");

/** Path to the Gemini config file. */
export const GEMINI_CONFIG_PATH = join(GEMINI_DATA_DIR, "config.json");

/** Path to the Gemini auth file. */
export const GEMINI_AUTH_PATH = join(GEMINI_DATA_DIR, "auth.json");

/** Whether we're running on Windows */
const IS_WIN = platform() === "win32";

/** Possible binary names for the Gemini CLI (platform-aware). */
export const GEMINI_BIN_NAMES: string[] = IS_WIN
  ? ["gemini.cmd", "gemini.exe", "gemini.ps1", "gemini", "gemini-cli.cmd", "gemini-cli"]
  : ["gemini", "gemini-cli"];

/** Common binary locations for the Gemini CLI (platform-aware). */
export const GEMINI_BIN_CANDIDATES: string[] = IS_WIN
  ? [
      join(homedir(), "AppData", "Roaming", "npm", "gemini.cmd"),
      join(homedir(), "AppData", "Roaming", "npm", "gemini-cli.cmd"),
      join(homedir(), "AppData", "Local", "npm", "gemini.cmd"),
    ]
  : [
      join(homedir(), ".local", "bin", "gemini"),
      join(homedir(), ".local", "bin", "gemini-cli"),
      "/usr/local/bin/gemini",
      "/usr/local/bin/gemini-cli",
      "/usr/bin/gemini",
      "/usr/bin/gemini-cli",
    ];

/** Possible npm package names for the Gemini CLI. */
export const GEMINI_NPM_PACKAGES = [
  "@anthropic-ai/gemini-cli",
  "gemini-cli",
  "@google/gemini-cli",
];

/** Default model for Gemini CLI. */
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-pro";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeminiStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  path: string | null;
  health: "healthy" | "degraded" | "offline";
  model: string;
  message?: string;
}

export interface GeminiConfig {
  model?: string;
  api_key?: string;
  sandbox?: boolean;
  [key: string]: unknown;
}

export interface GeminiAuthStatus {
  authenticated: boolean;
  method: string;
  apiKeySet: boolean;
  oauthConnected: boolean;
}

export interface GeminiHealthCheck {
  healthy: boolean;
  latency: number;
  lastCheck: number;
  details: string;
  cliInstalled: boolean;
  cliResponsive: boolean;
  apiConnection: boolean;
}

export type GeminiAction =
  | "chat"
  | "generate"
  | "review"
  | "refactor"
  | "plan"
  | "research"
  | "reason"
  | "analyze"
  | "execute";

export interface GeminiRequest {
  action: GeminiAction;
  message: string;
  model?: string;
  context?: string;
  stream?: boolean;
}

// ---------------------------------------------------------------------------
// CLI Detection & Binary Resolution
// ---------------------------------------------------------------------------

/** Execute a binary with the correct shell options for the current platform */
async function execBin(binPath: string, args: string[], opts?: { timeout?: number }) {
  const baseOpts: { timeout: number; shell?: boolean } = { timeout: opts?.timeout ?? 5000 };
  // On Windows, .cmd/.bat files MUST be executed with shell: true
  if (IS_WIN || binPath.endsWith(".cmd") || binPath.endsWith(".bat") || binPath.endsWith(".ps1")) {
    baseOpts.shell = true;
  }
  return execFileAsync(binPath, args, baseOpts);
}

/**
 * Finds the Gemini CLI binary path asynchronously, or returns `null` if not found.
 */
export async function findGeminiBinaryAsync(): Promise<string | null> {
  // 1. Try `which` (Unix) or `where` (Windows) for each possible binary name
  const locateCmd = IS_WIN ? "where" : "which";
  for (const binName of GEMINI_BIN_NAMES) {
    try {
      const { stdout } = await execFileAsync(locateCmd, [binName], {
        timeout: 3000,
        ...(IS_WIN ? { shell: true } : {}),
      });
      const paths = stdout.trim().split(/\r?\n/);
      for (const path of paths) {
        const located = path.trim();
        if (located && existsSync(located)) return located;
      }
    } catch {
      // not on PATH — try next name
    }
  }

  // 2. Check well-known candidate locations
  const candidates = [...GEMINI_BIN_CANDIDATES];
  if (IS_WIN && process.env.APPDATA) {
    candidates.push(join(process.env.APPDATA, "npm", "gemini.cmd"));
    candidates.push(join(process.env.APPDATA, "npm", "gemini"));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  // 3. Check npx global bin locations (platform-aware)
  const npmGlobalBin = IS_WIN
    ? join(homedir(), "AppData", "Roaming", "npm")
    : join(homedir(), ".npm-global", "bin");
  for (const binName of GEMINI_BIN_NAMES) {
    const path = join(npmGlobalBin, binName);
    if (existsSync(path)) return path;
  }

  return null;
}

/**
 * Returns `true` if the Gemini CLI binary is installed on this machine.
 */
export async function isGeminiInstalledAsync(): Promise<boolean> {
  return (await findGeminiBinaryAsync()) !== null;
}

/**
 * Returns the Gemini CLI version string, or `null` if unavailable.
 */
export async function getGeminiVersionAsync(): Promise<string | null> {
  const bin = await findGeminiBinaryAsync();
  if (!bin) return null;

  try {
    const { stdout } = await execBin(bin, ["--version"], { timeout: 5000 });
    const out = stdout.trim();
    const match = out.match(/(\d+\.\d+\.\d+[^\s]*)/);
    return match ? match[1] : out.split("\n")[0] || null;
  } catch {
    return null;
  }
}

/**
 * Returns the model name configured for Gemini, or the default.
 */
export async function getGeminiModelAsync(): Promise<string> {
  const config = getGeminiConfig();
  if (config?.model) return String(config.model);
  return GEMINI_DEFAULT_MODEL;
}

// ---------------------------------------------------------------------------
// Process Detection (Cross-Platform)
// ---------------------------------------------------------------------------

/**
 * Checks if the Gemini process is running, asynchronously.
 * Works on Windows (tasklist), macOS, and Linux (pgrep/ps).
 */
export async function isGeminiProcessRunningAsync(): Promise<boolean> {
  if (IS_WIN) {
    // Windows: use tasklist to find node processes that might be Gemini
    try {
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH 2>NUL',
        { timeout: 5000, windowsHide: true }
      );
      // Check if any node process has gemini in its command line
      // Since tasklist doesn't show command-line args easily, also try WMIC
      try {
        const { stdout: wmicOut } = await execAsync(
          'wmic process where "name=\'node.exe\'" get commandline /format:list 2>NUL',
          { timeout: 5000, windowsHide: true }
        );
        if (/gemini/i.test(wmicOut)) return true;
      } catch {
        // WMIC not available — fall back to PowerShell
        try {
          const { stdout: psOut } = await execAsync(
            'powershell.exe -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -match \'gemini\' -or $_.CommandLine -match \'gemini\' } | Select-Object -First 1"',
            { timeout: 5000, windowsHide: true }
          );
          if (psOut.trim().length > 0) return true;
        } catch {
          // Last resort: check if any node process is running (broad heuristic)
          return /node\.exe/i.test(stdout);
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // Unix (macOS / Linux)
  try {
    const { stdout } = await execFileAsync("pgrep", ["-f", "gemini"], {
      timeout: 3000,
    });
    // Filter out the pgrep process itself
    const pids = stdout
      .trim()
      .split("\n")
      .filter((p) => p.trim().length > 0);
    return pids.length > 0;
  } catch {
    // pgrep not available or no match — try ps
    try {
      const { stdout } = await execFileAsync("ps", ["aux"], {
        timeout: 3000,
      });
      const lines = stdout.split("\n");
      // Look for gemini process but exclude our own check
      return lines.some(
        (line) =>
          /gemini/.test(line) &&
          !/grep/.test(line) &&
          !/pgrep/.test(line),
      );
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Status & Health
// ---------------------------------------------------------------------------

/**
 * Gets the full Gemini CLI status.
 */
export async function getGeminiStatusAsync(): Promise<GeminiStatus> {
  const [binPath, version, running, model] = await Promise.all([
    findGeminiBinaryAsync(),
    getGeminiVersionAsync(),
    isGeminiProcessRunningAsync(),
    getGeminiModelAsync(),
  ]);

  const installed = binPath !== null;

  let health: "healthy" | "degraded" | "offline";
  if (installed && running) {
    health = "healthy";
  } else if (installed && !running) {
    health = "degraded";
  } else {
    health = "offline";
  }

  const status: GeminiStatus = {
    installed,
    running,
    version,
    path: binPath,
    health,
    model,
  };

  if (!installed) {
    status.message =
      "Gemini CLI not detected. Install with: npm install -g @google/gemini-cli";
  } else if (!running) {
    status.message =
      "Gemini CLI is installed but not currently running. Start it to enable full functionality.";
  }

  return status;
}

/**
 * Performs a comprehensive health check for Gemini CLI.
 */
export async function performGeminiHealthCheck(): Promise<GeminiHealthCheck> {
  const startTime = Date.now();
  const [installed, running, binPath] = await Promise.all([
    isGeminiInstalledAsync(),
    isGeminiProcessRunningAsync(),
    findGeminiBinaryAsync(),
  ]);

  const latency = Date.now() - startTime;

  let cliResponsive = false;
  let apiConnection = false;

  // Try to ping the CLI if installed
  if (installed && binPath) {
    try {
      console.log(`[gemini/health] Pinging CLI: ${binPath} --version`);
      const { stdout, stderr } = await execBin(binPath, ["--version"], { timeout: 5000 });
      console.log(`[gemini/health] CLI output: ${stdout.trim()}`);
      if (stderr) console.error(`[gemini/health] CLI error: ${stderr.trim()}`);
      cliResponsive = stdout.trim().length > 0;
    } catch (e) {
      console.error(`[gemini/health] CLI ping failed:`, e);
      cliResponsive = false;
    }
  }

  const healthy = installed && cliResponsive;

  console.log(`[gemini/health] Status: installed=${installed}, responsive=${cliResponsive}, healthy=${healthy}`);

  if (running) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      await fetch("https://generativelanguage.googleapis.com/", {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timer);
      apiConnection = true;
    } catch {
      apiConnection = false;
    }
  }

  let details: string;
  if (!installed) {
    details = "Gemini CLI is not installed on this system.";
  } else if (!cliResponsive) {
    details = "Gemini CLI is installed but not responding to commands.";
  } else if (!apiConnection) {
    details = "Gemini CLI is installed and running, but API connection may be unavailable.";
  } else {
    details = "Gemini CLI is installed, responsive, and connected to the API.";
  }

  return {
    healthy,
    latency,
    lastCheck: Date.now(),
    details,
    cliInstalled: installed,
    cliResponsive,
    apiConnection,
  };
}

// ---------------------------------------------------------------------------
// Config Management
// ---------------------------------------------------------------------------

// Model alias resolver
export function resolveModelAlias(alias: string): string {
  const aliases: Record<string, string> = {
    'auto': 'gemini-2.5-flash-lite',
    'pro': 'gemini-3-pro-preview',
    'flash': 'gemini-2.5-flash',
    'flash-lite': 'gemini-2.5-flash-lite',
  };
  return aliases[alias] || alias;
}

/**
 * Reads and parses the Gemini config from `~/.gemini/config.json`.
 */
export function getGeminiConfig(): GeminiConfig {
  if (!existsSync(GEMINI_CONFIG_PATH)) return {};

  try {
    const raw = readFileSync(GEMINI_CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as GeminiConfig;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Auth Detection
// ---------------------------------------------------------------------------

/**
 * Checks the current Gemini authentication status.
 */
export async function getGeminiAuthStatusAsync(): Promise<GeminiAuthStatus> {
  const config = getGeminiConfig();
  const apiKeySet = !!(config.api_key || process.env.GEMINI_API_KEY);

  let oauthConnected = false;
  try {
    if (existsSync(GEMINI_AUTH_PATH)) {
      const raw = readFileSync(GEMINI_AUTH_PATH, "utf-8");
      const authData = JSON.parse(raw);
      oauthConnected = !!(authData.access_token || authData.refresh_token);
    }
  } catch {
    // Auth file not readable
  }

  return {
    authenticated: apiKeySet || oauthConnected,
    method: apiKeySet ? "api_key" : oauthConnected ? "oauth" : "none",
    apiKeySet,
    oauthConnected,
  };
}

// ---------------------------------------------------------------------------
// Action System Prompt Mapping
// ---------------------------------------------------------------------------

/** Maps GeminiAction to a system prompt that tailors the AI's behavior. */
export function getActionSystemPrompt(action: GeminiAction): string {
  const prompts: Record<GeminiAction, string> = {
    chat: `You are Gemini, the AI assistant of Agentic OS — a comprehensive AI agent system. You are having a conversation with the user. Be helpful, precise, and thorough in your responses. You have expertise in software engineering, system administration, and task automation.`,

    generate: `You are Gemini, the code generation agent of Agentic OS. Your task is to generate high-quality, production-ready code based on the user's request. Follow best practices, include proper error handling, TypeScript types, and clear documentation. Write clean, maintainable code.`,

    review: `You are Gemini, the code review agent of Agentic OS. Review the provided code thoroughly. Look for bugs, security vulnerabilities, performance issues, code style problems, and architectural concerns. Provide specific, actionable feedback with line references when possible. Rate the code quality on a scale of 1-10.`,

    refactor: `You are Gemini, the refactoring agent of Agentic OS. Analyze the provided code and suggest improvements for readability, maintainability, performance, and adherence to best practices. Provide the refactored code along with explanations of the changes made.`,

    plan: `You are Gemini, the planning agent of Agentic OS. Create a detailed, step-by-step plan for the requested task. Break down complex tasks into manageable subtasks, identify dependencies, estimate effort, and suggest the optimal order of execution. Consider potential risks and mitigation strategies.`,

    research: `You are Gemini, the research agent of Agentic OS. Conduct thorough research on the requested topic. Provide comprehensive findings, compare different approaches, cite relevant sources, and summarize key insights. Be objective and thorough in your analysis.`,

    reason: `You are Gemini, the reasoning agent of Agentic OS. Apply careful logical reasoning to analyze the given problem or question. Show your reasoning chain step by step, consider multiple perspectives, identify assumptions, and arrive at well-supported conclusions.`,

    analyze: `You are Gemini, the analysis agent of Agentic OS. Perform a deep analysis of the provided content — whether it's code, data, architecture, or system behavior. Identify patterns, anomalies, dependencies, and provide actionable insights. Use structured formats (tables, lists) when appropriate.`,

    execute: `You are Gemini, the execution agent of Agentic OS. Help the user understand and execute terminal commands safely. Provide the exact commands needed, explain what each command does, and warn about any potential risks. Always prioritize safety and idempotency.`,
  };

  return prompts[action];
}

// ---------------------------------------------------------------------------
// CLI Command Builder
// ---------------------------------------------------------------------------

/**
 * Builds a Gemini CLI command array from a GeminiRequest.
 */
export function buildGeminiCommand(
  request: GeminiRequest,
  binPath: string,
): string[] {
  const args: string[] = [];

  // Add model flag if specified
  const model = request.model || GEMINI_DEFAULT_MODEL;
  args.push("--model", model);

  // Add context to prompt if provided (CLI doesn't have native --context flag)
  let prompt = request.message;
  if (request.context) {
    prompt = `Context:\n${request.context}\n\nTask:\n${prompt}`;
  }

  // Add the prompt/message
  // Different actions get different framing
  switch (request.action) {
    case "chat":
      args.push("--prompt", prompt);
      break;
    case "generate":
      args.push("--prompt", `Generate code for: ${prompt}`);
      break;
    case "review":
      args.push("--prompt", `Review this code: ${prompt}`);
      break;
    case "refactor":
      args.push("--prompt", `Refactor this code: ${prompt}`);
      break;
    case "plan":
      args.push("--prompt", `Create a plan for: ${prompt}`);
      break;
    case "research":
      args.push("--prompt", `Research: ${prompt}`);
      break;
    case "reason":
      args.push("--prompt", `Reason about: ${prompt}`);
      break;
    case "analyze":
      args.push("--prompt", `Analyze: ${prompt}`);
      break;
    case "execute":
      args.push("--prompt", `Execute: ${prompt}`);
      break;
    default:
      args.push("--prompt", prompt);
  }

  return [binPath, ...args];
}

/**
 * Lists available models from the Gemini CLI by parsing stats or using a heuristic.
 * Since there's no direct 'list models' headless command, we use a fallback list
 * but try to verify them.
 */
export async function listGeminiModelsAsync(): Promise<string[]> {
  // Common models as fallback
  const fallbackModels = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemma-2-27b-it",
    "gemma-2-9b-it"
  ];

  try {
    const bin = await findGeminiBinaryAsync();
    if (!bin) return fallbackModels;

    // Run a simple prompt to get stats which contain model names
    const { stdout } = await execBin(bin, ["--prompt", "list models", "--output-format", "json"], { timeout: 10000 });
    let data: { stats?: { models?: Record<string, unknown> } } = {};
    try {
      data = JSON.parse(stdout);
    } catch {
      // JSON parse failed — fall through to fallback
    }
    if (data.stats && data.stats.models) {
      return Object.keys(data.stats.models);
    }
  } catch {
    // Fallback to static list
  }

  return fallbackModels;
}


// ---------------------------------------------------------------------------
// Status Cache
// ---------------------------------------------------------------------------

let statusCache: { data: GeminiStatus; expiry: number } | null = null;
const STATUS_CACHE_TTL = 5000; // 5 seconds

export function getCachedGeminiStatus(): GeminiStatus | null {
  if (statusCache && Date.now() < statusCache.expiry) {
    return statusCache.data;
  }
  return null;
}

export function setCachedGeminiStatus(data: GeminiStatus): void {
  statusCache = { data, expiry: Date.now() + STATUS_CACHE_TTL };
}

// ---------------------------------------------------------------------------
// Health Cache
// ---------------------------------------------------------------------------

let healthCache: { data: GeminiHealthCheck; expiry: number } | null = null;
const HEALTH_CACHE_TTL = 10000; // 10 seconds

export function getCachedGeminiHealth(): GeminiHealthCheck | null {
  if (healthCache && Date.now() < healthCache.expiry) {
    return healthCache.data;
  }
  return null;
}

export function setCachedGeminiHealth(data: GeminiHealthCheck): void {
  healthCache = { data, expiry: Date.now() + HEALTH_CACHE_TTL };
}
