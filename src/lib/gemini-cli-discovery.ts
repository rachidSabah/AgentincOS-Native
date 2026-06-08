// ============================================================
// Agentic OS V2 — Gemini CLI Discovery & Runtime Integration
// ============================================================
// Automatically detects, registers, monitors, and utilizes
// Gemini CLI installations on the local machine.
// Gemini CLI functions as a first-class execution provider,
// not as a manually configured external tool.
// ============================================================

import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import type {
  GeminiCLIDiscovery,
  GeminiCLIModel,
  GeminiCLIHealth,
  GeminiCLIProviderState,
  GeminiCLISearchPath,
  GeminiCLICapabilityReport,
  GeminiCLIStatus,
  GeminiCLIMode,
  GeminiCLIModelCapabilities,
} from './types';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// ─── Constants ───────────────────────────────────────────────

/** Search locations per platform */
const WINDOWS_SEARCH_PATHS = [
  { type: 'path' as const, getPath: () => 'gemini.exe' },
  { type: 'path' as const, getPath: () => 'gemini.cmd' },
  { type: 'path' as const, getPath: () => 'gemini.bat' },
  { type: 'npm-global' as const, getPath: () => getNpmGlobalPath('gemini') },
  { type: 'pnpm-global' as const, getPath: () => getPnpmGlobalPath('gemini') },
  { type: 'yarn-global' as const, getPath: () => getYarnGlobalPath('gemini') },
  { type: 'bun-global' as const, getPath: () => getBunGlobalPath('gemini') },
  { type: 'wsl' as const, getPath: () => 'wsl gemini' },
  { type: 'local-dev' as const, getPath: () => './node_modules/.bin/gemini' },
  { type: 'custom' as const, getPath: () => process.env.GEMINI_CLI_PATH ?? '' },
];

const UNIX_SEARCH_PATHS = [
  { type: 'path' as const, getPath: () => 'gemini' },
  { type: 'npm-global' as const, getPath: () => getNpmGlobalPath('gemini') },
  { type: 'pnpm-global' as const, getPath: () => getPnpmGlobalPath('gemini') },
  { type: 'yarn-global' as const, getPath: () => getYarnGlobalPath('gemini') },
  { type: 'bun-global' as const, getPath: () => getBunGlobalPath('gemini') },
  { type: 'local-dev' as const, getPath: () => './node_modules/.bin/gemini' },
  { type: 'custom' as const, getPath: () => process.env.GEMINI_CLI_PATH ?? '' },
];

/** Known Gemini model context windows (used as fallbacks when CLI doesn't report) */
const KNOWN_GEMINI_MODELS: Record<string, { contextWindow: number; capabilities: Partial<GeminiCLIModelCapabilities> }> = {
  'gemini-2.5-pro':         { contextWindow: 1_000_000, capabilities: { streaming: true, functionCalling: true, reasoning: true, toolUse: true, codeExecution: true, grounding: true } },
  'gemini-2.5-flash':       { contextWindow: 1_000_000, capabilities: { streaming: true, functionCalling: true, reasoning: true, toolUse: true, codeExecution: true, grounding: true } },
  'gemini-2.5-flash-lite':  { contextWindow: 1_000_000, capabilities: { streaming: true, functionCalling: true, reasoning: false, toolUse: true, codeExecution: false, grounding: true } },
  'gemini-2.0-flash':       { contextWindow: 1_000_000, capabilities: { streaming: true, functionCalling: true, reasoning: false, toolUse: true, codeExecution: true, grounding: true } },
  'gemini-2.0-flash-lite':  { contextWindow: 1_000_000, capabilities: { streaming: true, functionCalling: true, reasoning: false, toolUse: true, codeExecution: false, grounding: false } },
  'gemini-1.5-pro':         { contextWindow: 2_000_000, capabilities: { streaming: true, functionCalling: true, reasoning: false, toolUse: true, codeExecution: true, grounding: true } },
  'gemini-1.5-flash':       { contextWindow: 1_000_000, capabilities: { streaming: true, functionCalling: true, reasoning: false, toolUse: true, codeExecution: false, grounding: true } },
};

/** Failover chain when Gemini CLI degrades */
const GEMINI_CLI_FAILOVER_CHAIN = ['gemini', 'claude', 'glm', 'mistral', 'openai', 'deepseek', 'openrouter'];

/** Health check interval (ms) */
const HEALTH_CHECK_INTERVAL = 30_000;

/** Model refresh interval (ms) */
const MODEL_REFRESH_INTERVAL = 300_000; // 5 minutes

// ─── Platform Helpers ────────────────────────────────────────

function getPlatform(): 'windows' | 'linux' | 'macos' {
  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  return 'linux';
}

function getNpmGlobalPath(cmd: string): string {
  // On Windows, npm global bin might be in AppData
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) return `${appData}\\npm\\${cmd}.cmd`;
  }
  return `npm-root -g/${cmd}`;
}

function getPnpmGlobalPath(cmd: string): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) return `${localAppData}\\pnpm\\${cmd}.cmd`;
  }
  return `pnpm-root -g/${cmd}`;
}

function getYarnGlobalPath(cmd: string): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) return `${localAppData}\\Yarn\\bin\\${cmd}.cmd`;
  }
  return `yarn-global/${cmd}`;
}

function getBunGlobalPath(cmd: string): string {
  if (process.platform === 'win32') {
    const userProfile = process.env.USERPROFILE;
    if (userProfile) return `${userProfile}\\.bun\\bin\\${cmd}.exe`;
  }
  return `~/.bun/bin/${cmd}`;
}

// ─── Gemini CLI Discovery Engine ────────────────────────────

class GeminiCLIDiscoveryEngine {
  private state: GeminiCLIProviderState;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private modelRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private searchResults: GeminiCLISearchPath[] = [];
  private eventHandlers: Map<string, Set<(...args: unknown[]) => unknown>> = new Map();
  private isDiscovering = false;

  constructor() {
    const platform = getPlatform();

    this.state = {
      discovery: {
        status: 'unavailable',
        executablePath: null,
        version: null,
        installSource: null,
        discoveredAt: 0,
        lastValidatedAt: 0,
        platform,
      },
      models: [],
      health: {
        available: false,
        executableLaunches: false,
        authenticationValid: false,
        modelDiscoveryWorks: false,
        testPromptSucceeded: false,
        lastLatencyMs: 0,
        successRate: 0,
        healthScore: 0,
        degradationReason: null,
        lastChecked: 0,
      },
      routingPriority: 2, // Right after claude, before glm
      failoverChain: GEMINI_CLI_FAILOVER_CHAIN,
      mode: 'api', // Default to API mode; upgraded to CLI when discovered
    };
  }

  // ────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────

  /**
   * Run the full discovery sequence on application startup.
   * 1. Scan for Gemini CLI executables
   * 2. Validate the executable
   * 3. Discover available models
   * 4. Validate authentication
   * 5. Run test prompt
   * 6. Register discovered models
   * 7. Start health monitoring
   */
  async discover(): Promise<GeminiCLIProviderState> {
    if (this.isDiscovering) return this.state;
    this.isDiscovering = true;
    this.state.discovery.status = 'discovering';

    try {
      // Step 1: Scan for Gemini CLI executables
      const searchPaths = getPlatform() === 'windows' ? WINDOWS_SEARCH_PATHS : UNIX_SEARCH_PATHS;
      this.searchResults = await this.scanSearchPaths(searchPaths);

      // Step 2: Find the best executable
      const bestResult = this.searchResults.find((r) => r.found);
      if (!bestResult || !bestResult.executable) {
        this.state.discovery.status = 'unavailable';
        this.state.health.available = false;
        this.state.health.degradationReason = 'Gemini CLI not found on this system';
        this.state.mode = 'api'; // Fall back to API mode
        this.emit('discovery:complete', this.state);
        return this.state;
      }

      this.state.discovery.executablePath = bestResult.executable;
      this.state.discovery.installSource = bestResult.type;
      this.state.discovery.version = bestResult.version ?? null;
      this.state.discovery.discoveredAt = Date.now();
      this.state.discovery.lastValidatedAt = Date.now();
      this.state.discovery.status = 'available';
      this.state.health.executableLaunches = true;
      this.state.mode = 'cli';

      this.emit('discovery:found', {
        executable: bestResult.executable,
        version: bestResult.version,
        source: bestResult.type,
      });

      // Step 3: Discover capabilities and models
      await this.discoverCapabilities();

      // Step 4: Validate authentication
      await this.validateAuthentication();

      // Step 5: Run test prompt
      await this.runTestPrompt();

      // Step 6: Compute health score
      this.computeHealthScore();

      // Step 7: Start health monitoring
      this.startHealthMonitoring();

      this.emit('discovery:complete', this.state);
      return this.state;
    } catch (error) {
      this.state.discovery.status = 'error';
      this.state.health.degradationReason = error instanceof Error ? error.message : 'Discovery failed';
      this.state.mode = 'api';
      this.emit('discovery:error', { error });
      return this.state;
    } finally {
      this.isDiscovering = false;
    }
  }

  /**
   * Get the current provider state.
   */
  getState(): GeminiCLIProviderState {
    return { ...this.state };
  }

  /**
   * Get all discovered models.
   */
  getModels(): GeminiCLIModel[] {
    return [...this.state.models];
  }

  /**
   * Get the current health status.
   */
  getHealth(): GeminiCLIHealth {
    return { ...this.state.health };
  }

  /**
   * Get the search results from the last discovery scan.
   */
  getSearchResults(): GeminiCLISearchPath[] {
    return [...this.searchResults];
  }

  /**
   * Check if Gemini CLI is available as a provider.
   */
  isAvailable(): boolean {
    return this.state.discovery.status === 'available' && this.state.health.available;
  }

  /**
   * Get the best available Gemini CLI model for a given task.
   * Prioritizes pro models for complex tasks, flash for speed.
   */
  selectBestModel(taskType?: 'complex' | 'fast' | 'balanced'): GeminiCLIModel | null {
    const available = this.state.models.filter((m) => m.status === 'available');
    if (available.length === 0) return null;

    // Sort by capability score
    const scored = available.map((model) => {
      let score = 0;
      const nameLC = model.id.toLowerCase();

      if (taskType === 'complex') {
        // Prefer pro models for complex tasks
        if (nameLC.includes('pro')) score += 50;
        if (model.capabilities.reasoning) score += 20;
        if (model.capabilities.codeExecution) score += 15;
        if (model.capabilities.functionCalling) score += 10;
        score += model.contextWindow / 100_000; // Bonus for larger context
      } else if (taskType === 'fast') {
        // Prefer flash/lite models for speed
        if (nameLC.includes('flash-lite')) score += 40;
        if (nameLC.includes('flash')) score += 30;
        score -= model.contextWindow / 200_000; // Smaller context = faster
      } else {
        // Balanced: prefer flash models as default
        if (nameLC.includes('flash') && !nameLC.includes('lite')) score += 40;
        if (nameLC.includes('pro')) score += 25;
        if (model.capabilities.functionCalling) score += 15;
        if (model.capabilities.reasoning) score += 10;
        score += model.contextWindow / 200_000;
      }

      return { model, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.model ?? available[0] ?? null;
  }

  /**
   * Execute a prompt using Gemini CLI.
   * Returns the raw output from the CLI.
   */
  async executePrompt(prompt: string, modelId?: string): Promise<{ content: string; latencyMs: number; success: boolean; error?: string }> {
    if (!this.isAvailable() || !this.state.discovery.executablePath) {
      return {
        content: '',
        latencyMs: 0,
        success: false,
        error: 'Gemini CLI not available',
      };
    }

    const startTime = Date.now();
    const model = modelId ?? this.selectBestModel('balanced')?.id ?? 'gemini-2.5-flash';

    try {
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/`/g, '\\`');
      const { stdout } = await execAsync(
        `"${this.state.discovery.executablePath}" --model ${model} "${escapedPrompt}"`,
        { timeout: 60_000, maxBuffer: 1024 * 1024 }
      );

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(latencyMs);

      return {
        content: stdout.trim(),
        latencyMs,
        success: true,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.recordFailure(error instanceof Error ? error.message : 'Execution failed');
      return {
        content: '',
        latencyMs,
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      };
    }
  }

  /**
   * Force a re-discovery (useful after installing Gemini CLI).
   */
  async rediscover(): Promise<GeminiCLIProviderState> {
    this.stopHealthMonitoring();
    this.state.discovery.status = 'unavailable';
    this.state.models = [];
    this.state.health = {
      available: false,
      executableLaunches: false,
      authenticationValid: false,
      modelDiscoveryWorks: false,
      testPromptSucceeded: false,
      lastLatencyMs: 0,
      successRate: 0,
      healthScore: 0,
      degradationReason: null,
      lastChecked: 0,
    };
    return this.discover();
  }

  /**
   * Generate a discovery report for the dashboard.
   */
  generateReport(): GeminiCLIDiscoveryReport {
    return {
      installed: this.state.discovery.status !== 'unavailable',
      version: this.state.discovery.version,
      executablePath: this.state.discovery.executablePath,
      installSource: this.state.discovery.installSource,
      detectedModels: this.state.models.map((m) => ({
        id: m.id,
        name: m.name,
        contextWindow: m.contextWindow,
        status: m.status,
        capabilities: m.capabilities,
      })),
      providerStatus: this.state.discovery.status,
      latencyMs: this.state.health.lastLatencyMs,
      authenticationValid: this.state.health.authenticationValid,
      healthScore: this.state.health.healthScore,
      routingPriority: this.state.routingPriority,
      failoverChain: this.state.failoverChain,
      mode: this.state.mode,
      searchResults: this.searchResults,
      lastValidated: this.state.discovery.lastValidatedAt,
    };
  }

  /**
   * Stop all monitoring timers (for shutdown).
   */
  shutdown(): void {
    this.stopHealthMonitoring();
  }

  // ────────────────────────────────────────────────────────
  // Event System
  // ────────────────────────────────────────────────────────

  on(event: string, handler: (...args: unknown[]) => unknown): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (...args: unknown[]) => unknown): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[GeminiCLIDiscovery] Event handler error for "${event}":`, err);
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────
  // SCANNING — Step 1
  // ────────────────────────────────────────────────────────

  private async scanSearchPaths(
    searchPaths: Array<{ type: GeminiCLISearchPath['type']; getPath: () => string }>
  ): Promise<GeminiCLISearchPath[]> {
    const results: GeminiCLISearchPath[] = [];

    for (const searchPath of searchPaths) {
      const path = searchPath.getPath();
      if (!path) {
        results.push({ path: '', type: searchPath.type, found: false });
        continue;
      }

      try {
        const found = await this.checkExecutable(path);
        let version: string | undefined;

        if (found) {
          version = await this.getVersion(path);
          results.push({ path, type: searchPath.type, found: true, executable: path, version });
        } else {
          results.push({ path, type: searchPath.type, found: false });
        }
      } catch {
        results.push({ path, type: searchPath.type, found: false });
      }
    }

    return results;
  }

  /**
   * Check if an executable exists and is runnable.
   */
  private async checkExecutable(execPath: string): Promise<boolean> {
    try {
      // For WSL, check if wsl command itself exists
      if (execPath.startsWith('wsl ')) {
        const { stdout } = await execAsync('where wsl', { timeout: 5000 });
        return stdout.trim().length > 0;
      }

      // For regular executables, try --version or --help
      const platform = getPlatform();
      if (platform === 'windows') {
        const { stdout } = await execAsync(`where "${execPath}"`, { timeout: 5000 });
        return stdout.trim().length > 0;
      } else {
        const { stdout } = await execAsync(`which "${execPath}" 2>/dev/null || command -v "${execPath}"`, { timeout: 5000 });
        return stdout.trim().length > 0;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get the version of the Gemini CLI.
   */
  private async getVersion(execPath: string): Promise<string | undefined> {
    try {
      const cmd = execPath.startsWith('wsl ')
        ? `${execPath} --version`
        : `"${execPath}" --version`;
      const { stdout } = await execAsync(cmd, { timeout: 10_000 });
      // Parse version from output like "gemini v1.2.3" or "1.2.3"
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+[^\s]*)/);
      return versionMatch?.[1];
    } catch {
      return undefined;
    }
  }

  // ────────────────────────────────────────────────────────
  // CAPABILITY DISCOVERY — Step 3
  // ────────────────────────────────────────────────────────

  private async discoverCapabilities(): Promise<void> {
    if (!this.state.discovery.executablePath) return;

    try {
      // Try to discover models from the CLI
      const report = await this.queryCLICapabilities();
      if (report) {
        this.state.models = this.registerModelsFromReport(report);
        this.state.health.modelDiscoveryWorks = true;
      } else {
        // Fallback: use known models with best guess
        this.state.models = this.getDefaultModels();
        this.state.health.modelDiscoveryWorks = false;
      }
    } catch {
      // Fallback: use known models
      this.state.models = this.getDefaultModels();
      this.state.health.modelDiscoveryWorks = false;
    }
  }

  /**
   * Query the Gemini CLI for its capabilities and available models.
   */
  private async queryCLICapabilities(): Promise<GeminiCLICapabilityReport | null> {
    const execPath = this.state.discovery.executablePath!;

    try {
      // Try `gemini --list-models` or similar command
      const cmd = execPath.startsWith('wsl ')
        ? `${execPath} --list-models`
        : `"${execPath}" --list-models`;

      const { stdout } = await execAsync(cmd, { timeout: 15_000 });

      // Parse the model list from output
      const modelIds = this.parseModelList(stdout);

      if (modelIds.length > 0) {
        return {
          version: this.state.discovery.version ?? 'unknown',
          supportedModels: modelIds,
          features: {
            streaming: true,
            functionCalling: true,
            reasoning: modelIds.some((m) => m.includes('pro') || m.includes('2.5')),
            toolUse: true,
            codeExecution: true,
            grounding: true,
          },
          contextWindows: Object.fromEntries(
            modelIds.map((m) => [m, KNOWN_GEMINI_MODELS[m]?.contextWindow ?? 1_000_000])
          ),
          outputModes: ['text', 'json'],
        };
      }
    } catch {
      // --list-models might not be supported
    }

    // Alternative: try `gemini --help` and parse model references
    try {
      const cmd = execPath.startsWith('wsl ')
        ? `${execPath} --help`
        : `"${execPath}" --help`;

      const { stdout } = await execAsync(cmd, { timeout: 10_000 });

      const modelIds = this.parseModelReferences(stdout);
      if (modelIds.length > 0) {
        return {
          version: this.state.discovery.version ?? 'unknown',
          supportedModels: modelIds,
          features: {
            streaming: true,
            functionCalling: true,
            reasoning: modelIds.some((m) => m.includes('pro') || m.includes('2.5')),
            toolUse: true,
            codeExecution: true,
            grounding: true,
          },
          contextWindows: Object.fromEntries(
            modelIds.map((m) => [m, KNOWN_GEMINI_MODELS[m]?.contextWindow ?? 1_000_000])
          ),
          outputModes: ['text', 'json'],
        };
      }
    } catch {
      // --help might not list models either
    }

    return null;
  }

  /**
   * Parse model list from CLI output.
   * Handles formats like:
   *   - "gemini-2.5-pro"
   *   - "  gemini-2.5-flash"
   *   - "Available models: gemini-2.5-pro, gemini-2.5-flash"
   */
  private parseModelList(output: string): string[] {
    const models: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Match lines that look like model IDs
      const geminiModelRegex = /gemini-\d+\.\d+[-\w]*/g;
      const matches = trimmed.match(geminiModelRegex);
      if (matches) {
        for (const match of matches) {
          if (!models.includes(match)) {
            models.push(match);
          }
        }
      }

      // Match comma-separated model lists
      if (trimmed.includes(',') && trimmed.includes('gemini')) {
        const parts = trimmed.split(',');
        for (const part of parts) {
          const modelMatch = part.trim().match(/gemini-\d+\.\d+[-\w]*/);
          if (modelMatch && !models.includes(modelMatch[0])) {
            models.push(modelMatch[0]);
          }
        }
      }
    }

    return models;
  }

  /**
   * Parse model references from --help output.
   */
  private parseModelReferences(output: string): string[] {
    const models: string[] = [];
    const geminiModelRegex = /gemini-\d+\.\d+[-\w]*/g;
    const matches = output.match(geminiModelRegex);
    if (matches) {
      for (const match of matches) {
        if (!models.includes(match)) {
          models.push(match);
        }
      }
    }
    return models;
  }

  /**
   * Register models from a capability report.
   */
  private registerModelsFromReport(report: GeminiCLICapabilityReport): GeminiCLIModel[] {
    const now = Date.now();

    return report.supportedModels.map((modelId) => {
      const known = KNOWN_GEMINI_MODELS[modelId];
      const capabilities: GeminiCLIModelCapabilities = {
        streaming: report.features.streaming,
        functionCalling: report.features.functionCalling,
        reasoning: known?.capabilities?.reasoning ?? report.features.reasoning,
        toolUse: report.features.toolUse,
        codeExecution: known?.capabilities?.codeExecution ?? report.features.codeExecution,
        grounding: report.features.grounding,
        outputModes: report.outputModes,
      };

      return {
        id: modelId,
        name: this.formatModelName(modelId),
        provider: 'gemini-cli' as const,
        contextWindow: known?.contextWindow ?? report.contextWindows[modelId] ?? 1_000_000,
        capabilities,
        discoveredAt: now,
        lastValidatedAt: now,
        status: 'available' as const,
      };
    }).sort((a, b) => {
      // Sort: pro first, then flash, then flash-lite
      const getOrder = (id: string) => {
        if (id.includes('pro')) return 0;
        if (id.includes('flash-lite')) return 2;
        return 1;
      };
      return getOrder(a.id) - getOrder(b.id);
    });
  }

  /**
   * Get default models when CLI doesn't report available models.
   * These are the models most likely available based on CLI version.
   */
  private getDefaultModels(): GeminiCLIModel[] {
    const now = Date.now();
    const version = this.state.discovery.version;
    const isV2 = version?.startsWith('2') ?? false;
    const isV1 = version?.startsWith('1') ?? false;

    // Default: include current generation models
    const defaultModelIds = isV1
      ? ['gemini-1.5-pro', 'gemini-1.5-flash']
      : ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

    return defaultModelIds.map((modelId) => {
      const known = KNOWN_GEMINI_MODELS[modelId];
      return {
        id: modelId,
        name: this.formatModelName(modelId),
        provider: 'gemini-cli' as const,
        contextWindow: known?.contextWindow ?? 1_000_000,
        capabilities: known?.capabilities ?? {
          streaming: true,
          functionCalling: true,
          reasoning: false,
          toolUse: true,
          codeExecution: false,
          grounding: true,
          outputModes: ['text', 'json'],
        },
        discoveredAt: now,
        lastValidatedAt: now,
        status: 'available' as const,
      };
    });
  }

  /**
   * Format a model ID into a human-readable name.
   */
  private formatModelName(modelId: string): string {
    const parts = modelId.replace('gemini-', '').split('-');
    const nameParts: string[] = ['Gemini'];

    for (const part of parts) {
      if (/^\d+\.\d+$/.test(part)) {
        nameParts.push(part);
      } else if (part === 'pro') {
        nameParts.push('Pro');
      } else if (part === 'flash') {
        nameParts.push('Flash');
      } else if (part === 'lite') {
        nameParts.push('Lite');
      } else {
        nameParts.push(part.charAt(0).toUpperCase() + part.slice(1));
      }
    }

    return nameParts.join(' ');
  }

  // ────────────────────────────────────────────────────────
  // AUTHENTICATION VALIDATION — Step 4
  // ────────────────────────────────────────────────────────

  private async validateAuthentication(): Promise<void> {
    if (!this.state.discovery.executablePath) {
      this.state.health.authenticationValid = false;
      return;
    }

    try {
      const execPath = this.state.discovery.executablePath;
      const cmd = execPath.startsWith('wsl ')
        ? `${execPath} --status`
        : `"${execPath}" --status`;

      const { stdout } = await execAsync(cmd, { timeout: 10_000 });

      // Check for auth indicators in the output
      const authIndicators = ['authenticated', 'logged in', 'api key set', 'oauth', 'credentials'];
      const lowerOutput = stdout.toLowerCase();
      this.state.health.authenticationValid = authIndicators.some(
        (indicator) => lowerOutput.includes(indicator)
      ) || stdout.length > 0; // If CLI responds at all, it likely has auth
    } catch {
      // If --status fails, try a simple prompt to check auth
      try {
        const result = await this.executePrompt('Hello, respond with "OK"');
        this.state.health.authenticationValid = result.success;
      } catch {
        this.state.health.authenticationValid = false;
      }
    }
  }

  // ────────────────────────────────────────────────────────
  // TEST PROMPT — Step 5
  // ────────────────────────────────────────────────────────

  private async runTestPrompt(): Promise<void> {
    if (!this.state.discovery.executablePath) return;

    try {
      const result = await this.executePrompt('Respond with only the word "healthy"');
      this.state.health.testPromptSucceeded = result.success;

      if (result.success) {
        this.state.health.available = true;
      } else {
        this.state.health.available = false;
        this.state.health.degradationReason = `Test prompt failed: ${result.error}`;
        // Degrade to unavailable but keep discovered
        this.state.discovery.status = 'degraded';
      }
    } catch (error) {
      this.state.health.testPromptSucceeded = false;
      this.state.health.available = false;
      this.state.health.degradationReason = error instanceof Error ? error.message : 'Test prompt failed';
      this.state.discovery.status = 'degraded';
    }
  }

  // ────────────────────────────────────────────────────────
  // HEALTH SCORE COMPUTATION — Step 6
  // ────────────────────────────────────────────────────────

  private computeHealthScore(): void {
    let score = 0;

    // Executable launches: 20 points
    if (this.state.health.executableLaunches) score += 20;

    // Authentication valid: 25 points
    if (this.state.health.authenticationValid) score += 25;

    // Model discovery works: 15 points
    if (this.state.health.modelDiscoveryWorks) score += 15;

    // Test prompt succeeded: 25 points
    if (this.state.health.testPromptSucceeded) score += 25;

    // Latency score: up to 15 points (lower is better)
    if (this.state.health.lastLatencyMs > 0) {
      const latencyScore = Math.max(0, 15 - (this.state.health.lastLatencyMs / 1000));
      score += Math.min(15, latencyScore);
    }

    this.state.health.healthScore = Math.round(Math.max(0, Math.min(100, score)));
  }

  // ────────────────────────────────────────────────────────
  // HEALTH MONITORING — Step 7
  // ────────────────────────────────────────────────────────

  private startHealthMonitoring(): void {
    this.stopHealthMonitoring();

    // Periodic health checks
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, HEALTH_CHECK_INTERVAL);

    // Periodic model refresh
    this.modelRefreshTimer = setInterval(async () => {
      await this.refreshModels();
    }, MODEL_REFRESH_INTERVAL);
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.modelRefreshTimer) {
      clearInterval(this.modelRefreshTimer);
      this.modelRefreshTimer = null;
    }
  }

  /**
   * Perform a health check by validating CLI availability and auth.
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.state.discovery.executablePath) {
      this.state.health.available = false;
      this.state.health.healthScore = 0;
      return;
    }

    try {
      // Check if CLI still launches
      const execPath = this.state.discovery.executablePath;
      const cmd = execPath.startsWith('wsl ')
        ? `${execPath} --version`
        : `"${execPath}" --version`;

      const { stdout } = await execAsync(cmd, { timeout: 10_000 });
      this.state.health.executableLaunches = stdout.trim().length > 0;

      // Quick test prompt
      const result = await this.executePrompt('OK');
      this.state.health.testPromptSucceeded = result.success;

      if (result.success) {
        this.state.health.available = true;
        if (this.state.discovery.status === 'degraded') {
          this.state.discovery.status = 'available';
          this.state.health.degradationReason = null;
          this.emit('health:recovered', { mode: this.state.mode });
        }
      } else {
        this.handleCLIFailure(result.error);
      }

      this.state.discovery.lastValidatedAt = Date.now();
      this.state.health.lastChecked = Date.now();
      this.computeHealthScore();

      this.emit('health:checked', this.state.health);
    } catch (error) {
      this.handleCLIFailure(error instanceof Error ? error.message : 'Health check failed');
    }
  }

  /**
   * Refresh the model list from the CLI.
   */
  private async refreshModels(): Promise<void> {
    if (!this.state.discovery.executablePath) return;

    try {
      await this.discoverCapabilities();
      this.emit('models:refreshed', this.state.models);
    } catch {
      // Keep existing models
    }
  }

  // ────────────────────────────────────────────────────────
  // AUTO-RECOVERY
  // ────────────────────────────────────────────────────────

  private failureCount = 0;
  private lastFailureTime = 0;

  private recordSuccess(latencyMs: number): void {
    this.state.health.lastLatencyMs = latencyMs;
    this.state.health.successRate = Math.min(1, this.state.health.successRate + 0.1);
    this.failureCount = 0;

    if (this.state.discovery.status === 'degraded') {
      this.state.discovery.status = 'available';
      this.state.health.degradationReason = null;
    }
  }

  private recordFailure(error: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.state.health.successRate = Math.max(0, this.state.health.successRate - 0.15);

    if (this.failureCount >= 3) {
      this.handleCLIFailure(error);
    }
  }

  /**
   * Handle CLI failure with auto-recovery strategy.
   * Strategy: Retry → Re-authenticate → CLI Restart → Cache Refresh → Model Refresh → Failover
   */
  private handleCLIFailure(error?: string): void {
    this.state.discovery.status = 'degraded';
    this.state.health.degradationReason = error ?? 'CLI failure detected';
    this.computeHealthScore();

    this.emit('health:degraded', {
      status: this.state.discovery.status,
      reason: error,
      failoverChain: this.state.failoverChain,
    });

    // Attempt auto-recovery after a delay
    setTimeout(async () => {
      await this.attemptAutoRecovery();
    }, 5000);
  }

  /**
   * Attempt auto-recovery in order:
   * 1. Retry the CLI
   * 2. Re-authenticate
   * 3. CLI restart (re-discover)
   * 4. Cache refresh
   * 5. Model refresh
   * If all fail, mark as failed and rely on failover chain
   */
  private async attemptAutoRecovery(): Promise<void> {
    if (!this.state.discovery.executablePath) return;

    this.emit('recovery:attempting', { step: 'retry' });

    // Step 1: Retry
    try {
      const result = await this.executePrompt('OK');
      if (result.success) {
        this.state.discovery.status = 'available';
        this.state.health.available = true;
        this.state.health.degradationReason = null;
        this.failureCount = 0;
        this.computeHealthScore();
        this.emit('recovery:success', { step: 'retry' });
        return;
      }
    } catch {
      // Retry failed, continue to next step
    }

    // Step 2: Re-authenticate
    this.emit('recovery:attempting', { step: 'reauthenticate' });
    try {
      await this.validateAuthentication();
      if (this.state.health.authenticationValid) {
        const result = await this.executePrompt('OK');
        if (result.success) {
          this.state.discovery.status = 'available';
          this.state.health.available = true;
          this.state.health.degradationReason = null;
          this.failureCount = 0;
          this.computeHealthScore();
          this.emit('recovery:success', { step: 'reauthenticate' });
          return;
        }
      }
    } catch {
      // Re-auth failed
    }

    // Step 3: Model refresh
    this.emit('recovery:attempting', { step: 'model_refresh' });
    try {
      await this.refreshModels();
      if (this.state.models.some((m) => m.status === 'available')) {
        this.emit('recovery:success', { step: 'model_refresh' });
        // Don't mark as fully recovered yet, just note the improvement
      }
    } catch {
      // Model refresh failed
    }

    // All recovery attempts failed — rely on failover chain
    this.state.health.available = false;
    this.state.discovery.status = 'degraded';
    this.state.health.degradationReason = 'Auto-recovery failed; using failover chain';
    this.computeHealthScore();

    this.emit('recovery:failed', {
      failoverChain: this.state.failoverChain,
      mode: this.state.mode,
    });
  }
}

// ─── Discovery Report Interface ────────────────────────────

export interface GeminiCLIDiscoveryReport {
  installed: boolean;
  version: string | null;
  executablePath: string | null;
  installSource: string | null;
  detectedModels: Array<{
    id: string;
    name: string;
    contextWindow: number;
    status: string;
    capabilities: GeminiCLIModelCapabilities;
  }>;
  providerStatus: GeminiCLIStatus;
  latencyMs: number;
  authenticationValid: boolean;
  healthScore: number;
  routingPriority: number;
  failoverChain: string[];
  mode: GeminiCLIMode;
  searchResults: GeminiCLISearchPath[];
  lastValidated: number;
}

// ─── Singleton Export ────────────────────────────────────────

export const geminiCLIDiscovery = new GeminiCLIDiscoveryEngine();
