import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default port the Hermes OpenAI-compatible API server listens on. */
export const HERMES_DEFAULT_PORT = 8000;

/** Hermes data directory. */
export const HERMES_DATA_DIR = join(homedir(), ".hermes");

/** Path to the Hermes config file. */
export const HERMES_CONFIG_PATH = join(HERMES_DATA_DIR, "config.yaml");

/** Path to the Hermes secrets file. */
export const HERMES_ENV_PATH = join(HERMES_DATA_DIR, ".env");

/** Common binary locations for the hermes CLI. */
export const HERMES_BIN_CANDIDATES = [
  join(homedir(), ".local", "bin", "hermes"),
  "/usr/local/bin/hermes",
  "/usr/bin/hermes",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HermesConfig {
  model?: string;
  api_server?: {
    port?: number;
    host?: string;
  };
  mcp_servers?: Record<string, unknown>;
  web?: {
    backend?: string;
  };
  terminal?: {
    backend?: string;
  };
  [key: string]: unknown;
}

export interface HermesDetectResult {
  installed: boolean;
  running: boolean;
  version?: string;
  apiEndpoint?: string;
  configPath?: string;
  model?: string;
}

export interface HermesStatusResult {
  online: boolean;
  uptime?: string;
  activeSessions?: number;
  model?: string;
  latency?: number;
}

export interface HermesSkill {
  name: string;
  description?: string;
  category?: string;
  source?: string;
  platforms?: string[];
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Finds the hermes binary path, or returns `null` if not found.
 */
export function findHermesBinary(): string | null {
  // 1. Check `which hermes` (fast path when on PATH)
  try {
    const which = execSync("which hermes 2>/dev/null", {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    if (which && existsSync(which)) return which;
  } catch {
    // not on PATH — fall through
  }

  // 2. Check well-known candidate locations
  for (const candidate of HERMES_BIN_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Returns `true` if the hermes CLI binary is installed on this machine.
 */
export function isHermesInstalled(): boolean {
  return findHermesBinary() !== null;
}

/**
 * Reads and parses the Hermes config from `~/.hermes/config.yaml`.
 *
 * **Note:** We do a lightweight YAML parse here (no external deps).  For the
 * small subset of keys we care about this is sufficient.  If the file is
 * absent or unparseable we return an empty object.
 */
export function getHermesConfig(): HermesConfig {
  if (!existsSync(HERMES_CONFIG_PATH)) return {};

  try {
    const raw = readFileSync(HERMES_CONFIG_PATH, "utf-8");
    return parseLightYaml(raw);
  } catch {
    return {};
  }
}

/**
 * Determines the full Hermes API endpoint URL.
 *
 * Resolution order:
 * 1. `HERMES_API_URL` env var (if set)
 * 2. `api_server.port` from config.yaml
 * 3. Default `http://localhost:{HERMES_DEFAULT_PORT}`
 */
export function getHermesApiEndpoint(): string {
  const envUrl = process.env.HERMES_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const config = getHermesConfig();
  const port = config?.api_server?.port ?? HERMES_DEFAULT_PORT;
  const host = config?.api_server?.host ?? "localhost";

  return `http://${host}:${port}`;
}

/**
 * Pings the Hermes API server to check whether it is alive.
 *
 * Tries the `/v1/models` endpoint (OpenAI-compatible) with a short timeout.
 */
export async function isHermesRunning(
  apiEndpoint?: string,
): Promise<boolean> {
  const endpoint = apiEndpoint ?? getHermesApiEndpoint();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${endpoint}/v1/models`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Returns the Hermes CLI version string, or `undefined` if unavailable.
 */
export function getHermesVersion(): string | undefined {
  const bin = findHermesBinary();
  if (!bin) return undefined;

  try {
    const out = execSync(`${bin} --version 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    // Typical output: "hermes 0.x.y" or just "0.x.y"
    const match = out.match(/(\d+\.\d+\.\d+[^\s]*)/);
    return match ? match[1] : out.split("\n")[0] || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Measures latency (ms) to the Hermes API server, or `undefined` on failure.
 */
export async function measureHermesLatency(
  apiEndpoint?: string,
): Promise<number | undefined> {
  const endpoint = apiEndpoint ?? getHermesApiEndpoint();

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    await fetch(`${endpoint}/v1/models`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timer);
    return Date.now() - start;
  } catch {
    return undefined;
  }
}

/**
 * Returns the model name configured for Hermes, or `undefined`.
 */
export function getHermesModel(): string | undefined {
  const config = getHermesConfig();
  if (config?.model) return String(config.model);

  // Fallback: try `hermes config get model`
  const bin = findHermesBinary();
  if (!bin) return undefined;

  try {
    const out = execSync(`${bin} config get model 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks if the Hermes process is running (via `pgrep` or `ps`).
 */
export function isHermesProcessRunning(): boolean {
  try {
    const out = execSync("pgrep -f hermes 2>/dev/null || true", {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    return out.length > 0;
  } catch {
    // pgrep not available — try ps
    try {
      const out = execSync("ps aux 2>/dev/null", {
        encoding: "utf-8",
        timeout: 3000,
      });
      return /hermes/.test(out);
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Lightweight YAML parser (no external dependency)
// ---------------------------------------------------------------------------

/**
 * Extremely small YAML parser that handles the subset of keys Hermes uses.
 * Supports:
 *  - top-level key: value
 *  - nested objects via indentation
 *  - quoted strings, numbers, booleans
 *  - comments (#)
 *
 * Does NOT support:
 *  - arrays, anchors, multi-line strings, etc.
 */
function parseLightYaml(raw: string): HermesConfig {
  const result: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [
    { obj: result, indent: -1 },
  ];

  for (const line of raw.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - trimmed.length;

    // Pop stack until we find the right parent
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]!.obj;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: unknown = trimmed.slice(colonIdx + 1).trim();

    if (value === "") {
      // This key opens a new nested object
      const nested: Record<string, unknown> = {};
      parent[key] = nested;
      stack.push({ obj: nested, indent });
    } else {
      // Parse the scalar value
      parent[key] = parseYamlScalar(String(value));
    }
  }

  return result as HermesConfig;
}

function parseYamlScalar(val: string): unknown {
  // Strip surrounding quotes
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    return val.slice(1, -1);
  }

  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null" || val === "~") return null;

  // Number
  const num = Number(val);
  if (!isNaN(num) && val !== "") return num;

  return val;
}
