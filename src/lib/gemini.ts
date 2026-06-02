import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Gemini CLI data directory. */
export const GEMINI_DATA_DIR = join(homedir(), ".gemini");

/** Path to the Gemini config file. */
export const GEMINI_CONFIG_PATH = join(GEMINI_DATA_DIR, "config.json");

/** Path to the Gemini auth file. */
export const GEMINI_AUTH_PATH = join(GEMINI_DATA_DIR, "auth.json");

/** Possible binary names for the Gemini CLI. */
export const GEMINI_BIN_NAMES = ["gemini", "gemini-cli"];

/** Common binary locations for the Gemini CLI. */
export const GEMINI_BIN_CANDIDATES = [
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

/**
 * Finds the Gemini CLI binary path asynchronously, or returns `null` if not found.
 */
export async function findGeminiBinaryAsync(): Promise<string | null> {
  // 1. Try `which` for each possible binary name
  for (const binName of GEMINI_BIN_NAMES) {
    try {
      const { stdout } = await execFileAsync("which", [binName], {
        timeout: 3000,
      });
      const which = stdout.trim();
      if (which && existsSync(which)) return which;
    } catch {
      // not on PATH — try next name
    }
  }

  // 2. Check well-known candidate locations
  for (const candidate of GEMINI_BIN_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }

  // 3. Check npx global bin locations
  const npmGlobalBin = join(homedir(), ".npm-global", "bin");
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
    const { stdout } = await execFileAsync(bin, ["--version"], {
      timeout: 5000,
    });
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
// Process Detection
// ---------------------------------------------------------------------------

/**
 * Checks if the Gemini process is running, asynchronously.
 */
export async function isGeminiProcessRunningAsync(): Promise<boolean> {
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
      const { stdout } = await execFileAsync(binPath, ["--version"], {
        timeout: 5000,
      });
      cliResponsive = stdout.trim().length > 0;
    } catch {
      cliResponsive = false;
    }
  }

  // Try to check API connection
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

  const healthy = installed && cliResponsive;

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

  // Add the prompt/message
  // Different actions get different framing
  switch (request.action) {
    case "chat":
      args.push("--prompt", request.message);
      break;
    case "generate":
      args.push("--prompt", `Generate code for: ${request.message}`);
      break;
    case "review":
      args.push("--prompt", `Review this code: ${request.message}`);
      break;
    case "refactor":
      args.push("--prompt", `Refactor this code: ${request.message}`);
      break;
    case "plan":
      args.push("--prompt", `Create a plan for: ${request.message}`);
      break;
    case "research":
      args.push("--prompt", `Research: ${request.message}`);
      break;
    case "reason":
      args.push("--prompt", `Reason about: ${request.message}`);
      break;
    case "analyze":
      args.push("--prompt", `Analyze: ${request.message}`);
      break;
    case "execute":
      args.push("--prompt", `Execute: ${request.message}`);
      break;
    default:
      args.push("--prompt", request.message);
  }

  // Add context if provided
  if (request.context) {
    args.push("--context", request.context);
  }

  return [binPath, ...args];
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
