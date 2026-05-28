import { execSync } from "child_process";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Agent as HttpAgent } from "http";

const execFileAsync = promisify(execFile);

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
// Connection Pooling & Keep-Alive
// ---------------------------------------------------------------------------

/** Persistent connection pool for Hermes API */
const hermesHttpAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 60000,
});

/** Cached endpoint resolution */
let cachedEndpoint: string | null = null;
let endpointCacheExpiry = 0;
const ENDPOINT_CACHE_TTL = 60000; // 1 minute

/**
 * Returns the cached Hermes API endpoint, refreshing the cache if expired.
 */
export function getHermesApiEndpointCached(): string {
  const now = Date.now();
  if (cachedEndpoint && now < endpointCacheExpiry) return cachedEndpoint;
  cachedEndpoint = getHermesApiEndpoint();
  endpointCacheExpiry = now + ENDPOINT_CACHE_TTL;
  return cachedEndpoint;
}

// ---------------------------------------------------------------------------
// Retry Logic with Exponential Backoff
// ---------------------------------------------------------------------------

/**
 * Fetch with retry logic and exponential backoff.
 * Retries on 429 (rate limit) and 5xx errors, as well as network errors.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3,
  baseDelay: number = 500,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return res;
      }

      // Retry on 429, 5xx, and network errors
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = res.headers.get("Retry-After");
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : baseDelay * Math.pow(2, attempt);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay =
          baseDelay * Math.pow(2, attempt) + Math.random() * 200; // jitter
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Pooled fetch with keep-alive and retry for Hermes API requests.
 */
export async function hermesFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const endpoint = getHermesApiEndpointCached();
  const url = `${endpoint}${path}`;

  return fetchWithRetry(url, {
    ...options,
    // @ts-expect-error Node.js fetch supports agent
    agent: hermesHttpAgent,
    headers: {
      Connection: "keep-alive",
      ...options?.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Request Queue (concurrency limiter)
// ---------------------------------------------------------------------------

const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  return new Promise<void>((resolve) => {
    requestQueue.push(resolve);
  });
}

function releaseSlot(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) {
    activeRequests++;
    next();
  }
}

/**
 * Queued fetch that limits concurrent Hermes API requests.
 */
export async function hermesFetchQueued(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  await acquireSlot();
  try {
    return await hermesFetch(path, options);
  } finally {
    releaseSlot();
  }
}

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
  latency?: number;
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
// Async Functions (preferred)
// ---------------------------------------------------------------------------

/**
 * Finds the hermes binary path asynchronously, or returns `null` if not found.
 */
export async function findHermesBinaryAsync(): Promise<string | null> {
  // 1. Check `which hermes` (fast path when on PATH)
  try {
    const { stdout } = await execFileAsync("which", ["hermes"], {
      timeout: 3000,
    });
    const which = stdout.trim();
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
export async function isHermesInstalledAsync(): Promise<boolean> {
  return (await findHermesBinaryAsync()) !== null;
}

/**
 * Returns the Hermes CLI version string, or `undefined` if unavailable.
 */
export async function getHermesVersionAsync(): Promise<string | undefined> {
  const bin = await findHermesBinaryAsync();
  if (!bin) return undefined;

  try {
    const { stdout } = await execFileAsync(bin, ["--version"], {
      timeout: 5000,
    });
    const out = stdout.trim();
    // Typical output: "hermes 0.x.y" or just "0.x.y"
    const match = out.match(/(\d+\.\d+\.\d+[^\s]*)/);
    return match ? match[1] : out.split("\n")[0] || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Returns the model name configured for Hermes, or `undefined`.
 */
export async function getHermesModelAsync(): Promise<string | undefined> {
  const config = getHermesConfig();
  if (config?.model) return String(config.model);

  // Fallback: try `hermes config get model`
  const bin = await findHermesBinaryAsync();
  if (!bin) return undefined;

  try {
    const { stdout } = await execFileAsync(bin, ["config", "get", "model"], {
      timeout: 5000,
    });
    const out = stdout.trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks if the Hermes process is running (via `pgrep` or `ps`), asynchronously.
 */
export async function isHermesProcessRunningAsync(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-f", "hermes"], {
      timeout: 3000,
    });
    return stdout.trim().length > 0;
  } catch {
    // pgrep not available or no match — try ps
    try {
      const { stdout } = await execFileAsync("ps", ["aux"], {
        timeout: 3000,
      });
      return /hermes/.test(stdout);
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Sync Functions (deprecated — kept for backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use findHermesBinaryAsync() instead */
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

/** @deprecated Use isHermesInstalledAsync() instead */
export function isHermesInstalled(): boolean {
  return findHermesBinary() !== null;
}

/** @deprecated Use getHermesVersionAsync() instead */
export function getHermesVersion(): string | undefined {
  const bin = findHermesBinary();
  if (!bin) return undefined;

  try {
    const out = execSync(`${bin} --version 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    const match = out.match(/(\d+\.\d+\.\d+[^\s]*)/);
    return match ? match[1] : out.split("\n")[0] || undefined;
  } catch {
    return undefined;
  }
}

/** @deprecated Use getHermesModelAsync() instead */
export function getHermesModel(): string | undefined {
  const config = getHermesConfig();
  if (config?.model) return String(config.model);

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

/** @deprecated Use isHermesProcessRunningAsync() instead */
export function isHermesProcessRunning(): boolean {
  try {
    const out = execSync("pgrep -f hermes 2>/dev/null || true", {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    return out.length > 0;
  } catch {
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
// Utility functions (sync, non-blocking — no execSync)
// ---------------------------------------------------------------------------

/**
 * Reads and parses the Hermes config from `~/.hermes/config.yaml`.
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
 * Uses the pooled fetch with retry.
 */
export async function isHermesRunning(
  apiEndpoint?: string,
): Promise<boolean> {
  const endpoint = apiEndpoint ?? getHermesApiEndpointCached();

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
 * Measures latency (ms) to the Hermes API server, or `undefined` on failure.
 */
export async function measureHermesLatency(
  apiEndpoint?: string,
): Promise<number | undefined> {
  const endpoint = apiEndpoint ?? getHermesApiEndpointCached();

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

// ---------------------------------------------------------------------------
// Status Cache
// ---------------------------------------------------------------------------

let statusCache: { data: HermesStatusResult; expiry: number } | null = null;
const STATUS_CACHE_TTL = 5000; // 5 seconds

export function getCachedStatus(): HermesStatusResult | null {
  if (statusCache && Date.now() < statusCache.expiry) {
    return statusCache.data;
  }
  return null;
}

export function setCachedStatus(data: HermesStatusResult): void {
  statusCache = { data, expiry: Date.now() + STATUS_CACHE_TTL };
}

// ---------------------------------------------------------------------------
// Skills Cache
// ---------------------------------------------------------------------------

let skillsCache: { data: HermesSkill[]; source: string; expiry: number } | null = null;
const SKILLS_CACHE_TTL = 300000; // 5 minutes

export function getCachedSkills(): { data: HermesSkill[]; source: string } | null {
  if (skillsCache && Date.now() < skillsCache.expiry) {
    return skillsCache;
  }
  return null;
}

export function setCachedSkills(data: HermesSkill[], source: string): void {
  skillsCache = { data, source, expiry: Date.now() + SKILLS_CACHE_TTL };
}

// ---------------------------------------------------------------------------
// Lightweight YAML parser (no external dependency)
// ---------------------------------------------------------------------------

function parseLightYaml(raw: string): HermesConfig {
  const result: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [
    { obj: result, indent: -1 },
  ];

  for (const line of raw.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - trimmed.length;

    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]!.obj;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: unknown = trimmed.slice(colonIdx + 1).trim();

    if (value === "") {
      const nested: Record<string, unknown> = {};
      parent[key] = nested;
      stack.push({ obj: nested, indent });
    } else {
      parent[key] = parseYamlScalar(String(value));
    }
  }

  return result as HermesConfig;
}

function parseYamlScalar(val: string): unknown {
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    return val.slice(1, -1);
  }

  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null" || val === "~") return null;

  const num = Number(val);
  if (!isNaN(num) && val !== "") return num;

  return val;
}
