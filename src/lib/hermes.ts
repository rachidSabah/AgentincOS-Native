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
      Authorization: `Bearer ${process.env.HERMES_API_KEY || ""}`,
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

    const headers: Record<string, string> = {};
    const apiKey = process.env.HERMES_API_KEY;
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${endpoint}/v1/models`, {
      method: "GET",
      signal: controller.signal,
      headers,
    });

    clearTimeout(timer);
    // 200 or 401 both mean the server is alive (401 = auth required, not dead)
    return res.ok || res.status === 401;
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

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;       // failures before opening (default: 5)
  resetTimeout: number;           // ms before trying half-open (default: 30000)
  halfOpenMaxAttempts: number;    // requests in half-open state (default: 3)
}

class HermesCircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeout: config?.resetTimeout ?? 30000,
      halfOpenMaxAttempts: config?.halfOpenMaxAttempts ?? 3,
    };
  }

  getState(): CircuitState {
    // Automatically transition from open → half-open if resetTimeout has elapsed
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeout) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
      }
    }
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getSuccessCount(): number {
    return this.successCount;
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    // --- OPEN: fail fast ---
    if (currentState === 'open') {
      throw new Error(
        `[HermesCircuitBreaker] Circuit is OPEN — failing fast. ` +
        `Retry after ${this.config.resetTimeout - (Date.now() - this.lastFailureTime)}ms`,
      );
    }

    // --- HALF-OPEN: allow limited probe requests ---
    if (currentState === 'half-open') {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        // Too many half-open attempts already in flight — reject
        throw new Error(
          `[HermesCircuitBreaker] Circuit is HALF-OPEN — max probe attempts reached. ` +
          `Wait for in-flight requests to resolve.`,
        );
      }
      this.halfOpenAttempts++;
    }

    // --- CLOSED or HALF-OPEN (within limit): execute ---
    try {
      const result = await fn();

      // Success path
      this.successCount++;
      this.failureCount = 0;

      if (currentState === 'half-open') {
        // Sufficient probes succeeded → close the circuit
        this.state = 'closed';
        this.halfOpenAttempts = 0;
      }

      return result;
    } catch (err) {
      // Failure path
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (currentState === 'closed' && this.failureCount >= this.config.failureThreshold) {
        this.state = 'open';
      }

      if (currentState === 'half-open') {
        // Probe failed → back to open
        this.state = 'open';
        this.halfOpenAttempts = 0;
      }

      throw err;
    }
  }
}

export const hermesCircuitBreaker = new HermesCircuitBreaker();

// ---------------------------------------------------------------------------
// Performance Telemetry
// ---------------------------------------------------------------------------

export interface TelemetryMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  tokensUsed: number;
  toolCallsCount: number;
  skillExecutions: number;
  activeConnections: number;
  circuitBreakerState: CircuitState;
  uptime: number;               // ms since first request
  lastRequestTime: number | null;
  requestsPerMinute: number;    // rolling 1-minute window
}

class HermesTelemetry {
  private latencies: number[] = [];          // last 1000 latencies
  private maxLatencies = 1000;
  private requestTimestamps: number[] = [];   // rolling 1-min window for RPM
  private startTime = Date.now();

  private metrics: TelemetryMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    tokensUsed: 0,
    toolCallsCount: 0,
    skillExecutions: 0,
    activeConnections: 0,
    circuitBreakerState: 'closed',
    uptime: 0,
    lastRequestTime: null,
    requestsPerMinute: 0,
  };

  recordRequest(
    latencyMs: number,
    success: boolean,
    tokens?: number,
    toolCalls?: number,
  ): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Track latency for percentile calculations
    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxLatencies) {
      this.latencies.shift();
    }

    // Track timestamp for RPM calculation
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.pruneTimestamps(now);

    // Optional counters
    if (tokens !== undefined) {
      this.metrics.tokensUsed += tokens;
    }
    if (toolCalls !== undefined) {
      this.metrics.toolCallsCount += toolCalls;
    }

    this.metrics.lastRequestTime = now;
    this.recompute();
  }

  recordSkillExecution(): void {
    this.metrics.skillExecutions++;
  }

  incrementActiveConnections(): void {
    this.metrics.activeConnections++;
  }

  decrementActiveConnections(): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
  }

  getMetrics(): TelemetryMetrics {
    // Refresh dynamic fields
    this.recompute();
    return { ...this.metrics };
  }

  reset(): void {
    this.latencies = [];
    this.requestTimestamps = [];
    this.startTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      tokensUsed: 0,
      toolCallsCount: 0,
      skillExecutions: 0,
      activeConnections: 0,
      circuitBreakerState: 'closed',
      uptime: 0,
      lastRequestTime: null,
      requestsPerMinute: 0,
    };
  }

  // ---- Private helpers ----

  private recompute(): void {
    const now = Date.now();
    this.metrics.uptime = now - this.startTime;
    this.metrics.circuitBreakerState = hermesCircuitBreaker.getState();

    // Average latency
    if (this.latencies.length > 0) {
      const sum = this.latencies.reduce((a, b) => a + b, 0);
      this.metrics.avgLatencyMs = Math.round(sum / this.latencies.length);

      // Percentiles (sorted copy)
      const sorted = [...this.latencies].sort((a, b) => a - b);
      this.metrics.p50LatencyMs = this.computePercentile(sorted, 50);
      this.metrics.p95LatencyMs = this.computePercentile(sorted, 95);
      this.metrics.p99LatencyMs = this.computePercentile(sorted, 99);
    } else {
      this.metrics.avgLatencyMs = 0;
      this.metrics.p50LatencyMs = 0;
      this.metrics.p95LatencyMs = 0;
      this.metrics.p99LatencyMs = 0;
    }

    // Requests per minute (rolling window)
    this.metrics.requestsPerMinute = this.computeRPM(now);
  }

  private computePercentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const idx = (p / 100) * (sortedArr.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sortedArr[lower]!;
    const frac = idx - lower;
    return Math.round(sortedArr[lower]! * (1 - frac) + sortedArr[upper]! * frac);
  }

  private pruneTimestamps(now: number): void {
    const cutoff = now - 60000; // 1 minute ago
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0]! < cutoff) {
      this.requestTimestamps.shift();
    }
  }

  private computeRPM(now: number): number {
    this.pruneTimestamps(now);
    return this.requestTimestamps.length;
  }
}

export const hermesTelemetry = new HermesTelemetry();

// ---------------------------------------------------------------------------
// Protected Fetch (Circuit Breaker + Telemetry wrapper)
// ---------------------------------------------------------------------------

export async function hermesFetchProtected(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  return hermesCircuitBreaker.execute(async () => {
    const start = Date.now();
    try {
      const res = await hermesFetchQueued(path, options);
      const latency = Date.now() - start;
      hermesTelemetry.recordRequest(latency, res.ok);
      return res;
    } catch (err) {
      const latency = Date.now() - start;
      hermesTelemetry.recordRequest(latency, false);
      throw err;
    }
  });
}
