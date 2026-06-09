// ============================================================
// Agentic OS V2 — Multi-Model Router with Kubernetes-Style
// Load Balancing, Circuit Breakers, Traffic Shaping &
// Comprehensive Health Monitoring
//
// V2.2 — Lazy Provider Initialization, Direct Provider APIs
// (No ZAI SDK dependency — each provider called natively)
// ============================================================
import type {
  ModelProviderType,
  ModelRequest,
  ModelResponse,
  ModelHealth,
  ProviderScore,
  CircuitBreakerState,
  MultiModelResult,
  ProviderMetrics,
} from './types';

// ─── Constants ───────────────────────────────────────────────

const ALL_PROVIDERS: ModelProviderType[] = [
  'openai', 'claude', 'gemini', 'gemini-cli', 'glm', 'mistral', 'qwen', 'deepseek',
  'openrouter', 'ollama', 'lmstudio', 'llamacpp', 'vllm',
  'grok', 'moonshot',
];

/** Default priority order for failover when no task type is specified */
const PROVIDER_PRIORITY: ModelProviderType[] = [
  'openai', 'claude', 'gemini-cli', 'gemini', 'glm', 'deepseek',
  'mistral', 'qwen', 'openrouter', 'grok', 'moonshot',
  'ollama', 'lmstudio', 'llamacpp', 'vllm',
];

/** Model identifier per provider */
const MODEL_MAP: Record<ModelProviderType, string> = {
  openai: 'gpt-4o',
  claude: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
  'gemini-cli': 'gemini-2.5-flash',  // Default CLI model; updated dynamically by discovery engine
  glm: 'glm-4',
  mistral: 'mistral-large-latest',
  qwen: 'qwen-max',
  deepseek: 'deepseek-chat',
  openrouter: 'openrouter/auto',
  ollama: 'llama3',
  lmstudio: 'local-model',
  llamacpp: 'local-model',
  vllm: 'local-model',
  grok: 'grok-beta',
  moonshot: 'moonshot-v1-8k',
};

/** Estimated cost per 1K tokens (input+output blended) in USD */
const COST_PER_1K_TOKENS: Record<ModelProviderType, number> = {
  openai: 0.015,
  claude: 0.012,
  gemini: 0.001,
  'gemini-cli': 0.0,   // Free tier via local CLI
  glm: 0.008,
  mistral: 0.008,
  qwen: 0.006,
  deepseek: 0.002,
  openrouter: 0.01,
  ollama: 0.0,
  lmstudio: 0.0,
  llamacpp: 0.0,
  vllm: 0.0,
  grok: 0.01,
  moonshot: 0.005,
};

/** Default context window size per provider (tokens) */
const CONTEXT_WINDOW: Record<ModelProviderType, number> = {
  openai: 128_000,
  claude: 200_000,
  gemini: 1_000_000,
  'gemini-cli': 1_000_000,  // Dynamic; updated by discovery engine
  glm: 128_000,
  mistral: 128_000,
  qwen: 32_000,
  deepseek: 128_000,
  openrouter: 128_000,
  ollama: 8_000,
  lmstudio: 8_000,
  llamacpp: 4_000,
  vllm: 8_000,
  grok: 128_000,
  moonshot: 8_000,
};

/** Task-type → preferred provider ordering (traffic shaping) */
const TASK_PROVIDER_PREFERENCE: Record<string, ModelProviderType[]> = {
  coding: ['deepseek', 'openai', 'claude', 'gemini-cli'],
  research: ['gemini-cli', 'gemini', 'openai', 'claude'],
  planning: ['claude', 'gemini-cli', 'gemini', 'glm'],
  review: ['claude', 'mistral', 'openai', 'gemini-cli'],
  analysis: ['gemini-cli', 'gemini', 'openai', 'qwen'],
  creative: ['claude', 'openai', 'mistral', 'gemini-cli'],
};

/** Roles that map to task types for traffic shaping */
const ROLE_TASK_MAP: Record<string, string> = {
  coder: 'coding',
  researcher: 'research',
  planner: 'planning',
  architect: 'planning',
  reviewer: 'review',
  verifier: 'review',
};

// ─── Internal Interfaces ─────────────────────────────────────

/**
 * Circular buffer for tracking recent latencies.
 * Keeps up to `capacity` entries, overwriting oldest when full.
 */
interface LatencyRingBuffer {
  values: number[];
  index: number;
  length: number;
  capacity: number;
}

interface ProviderState {
  requestCount: number;
  failCount: number;
  recentResults: Array<{ success: boolean; timestamp: number }>;
  totalTokensUsed: number;
  estimatedCost: number;
  contextTokensUsed: number;
  latencyBuffer: LatencyRingBuffer;
  healthEma: number; // exponential moving average of health (0-1)
  lastUsedAt: number; // timestamp of last actual usage for idle unloading
}

// ─── Helper: Ring Buffer ─────────────────────────────────────

function createRingBuffer(capacity: number = 100): LatencyRingBuffer {
  return { values: new Array(capacity).fill(0), index: 0, length: 0, capacity };
}

function pushRingBuffer(buf: LatencyRingBuffer, value: number): void {
  buf.values[buf.index] = value;
  buf.index = (buf.index + 1) % buf.capacity;
  if (buf.length < buf.capacity) buf.length++;
}

function getRingBufferValues(buf: LatencyRingBuffer): number[] {
  return buf.values.slice(0, buf.length);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

// ─── ModelRouter Class ───────────────────────────────────────

class ModelRouter {
  // Lazy-initialized maps — empty until a provider is first accessed
  private healthMap: Map<ModelProviderType, ModelHealth> = new Map();
  private stateMap: Map<ModelProviderType, ProviderState> = new Map();
  private circuitBreakers: Map<ModelProviderType, CircuitBreakerState> = new Map();

  // Dynamic model map — can be updated by Gemini CLI discovery
  private dynamicModelMap: Map<ModelProviderType, string> = new Map(
    Object.entries(MODEL_MAP) as [ModelProviderType, string][],
  );
  private dynamicContextWindow: Map<ModelProviderType, number> = new Map(
    Object.entries(CONTEXT_WINDOW) as [ModelProviderType, number][],
  );

  // Cached provider client instances for connection reuse
  private providerClients: Map<ModelProviderType, any> = new Map();

  // EMA alpha — higher = more responsive to recent data
  private readonly EMA_ALPHA = 0.3;

  /** Default idle timeout: 5 minutes */
  private readonly DEFAULT_IDLE_TIMEOUT_MS = 300_000;

  /**
   * Near-zero cost constructor — no provider state is initialized.
   * Providers are lazily created on first access via ensureProvider().
   */
  constructor() {
    // Intentionally empty — all provider state is created lazily
  }

  // ────────────────────────────────────────────────────────
  // Lazy Provider Initialization
  // ────────────────────────────────────────────────────────

  /**
   * Ensure a provider's state, health, and circuit breaker are initialized.
   * Called lazily on first access — no eager initialization of all 15 providers.
   * Subsequent calls are a fast no-op (Map.has() check).
   */
  private ensureProvider(provider: ModelProviderType): void {
    if (this.stateMap.has(provider)) return;

    const now = Date.now();
    const isGeminiCli = provider === 'gemini-cli';

    this.healthMap.set(provider, {
      provider,
      healthy: !isGeminiCli,
      latencyMs: 0,
      successRate: isGeminiCli ? 0 : 1.0,
      lastChecked: now,
    });

    this.stateMap.set(provider, {
      requestCount: 0,
      failCount: 0,
      recentResults: [],
      totalTokensUsed: 0,
      estimatedCost: 0,
      contextTokensUsed: 0,
      latencyBuffer: createRingBuffer(100),
      healthEma: 1.0,
      lastUsedAt: now,
    });

    this.circuitBreakers.set(provider, {
      provider,
      state: isGeminiCli ? 'open' : 'closed', // gemini-cli starts with circuit open until validated
      failureCount: 0,
      lastFailureTime: 0,
      tripThreshold: 3,
      resetTimeoutMs: 30_000,
    });
  }

  // ────────────────────────────────────────────────────────
  // Provider Client Pooling — Direct API Clients
  // ────────────────────────────────────────────────────────

  /**
   * Lazy accessor for a provider's native API client.
   * Caches the client instance to enable connection reuse
   * for repeated calls to the same provider.
   */
  private async getProviderClient(provider: ModelProviderType): Promise<any> {
    if (this.providerClients.has(provider)) {
      return this.providerClients.get(provider);
    }

    let client: any;
    const apiKey = this.getApiKey(provider);

    switch (provider) {
      case 'openai': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey });
        break;
      }
      case 'claude': {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        client = new Anthropic({ apiKey });
        break;
      }
      case 'gemini':
      case 'gemini-cli': {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        client = new GoogleGenerativeAI(apiKey || '');
        break;
      }
      case 'deepseek': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' });
        break;
      }
      case 'mistral': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey, baseURL: 'https://api.mistral.ai/v1' });
        break;
      }
      case 'openrouter': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' });
        break;
      }
      case 'glm': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey, baseURL: 'https://open.bigmodel.cn/api/paas/v4' });
        break;
      }
      case 'qwen': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey, baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' });
        break;
      }
      case 'grok': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
        break;
      }
      case 'moonshot': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey, baseURL: 'https://api.moonshot.cn/v1' });
        break;
      }
      case 'ollama': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey: 'ollama', baseURL: 'http://localhost:11434/v1' });
        break;
      }
      case 'lmstudio': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey: 'lmstudio', baseURL: 'http://localhost:1234/v1' });
        break;
      }
      case 'vllm': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey: 'vllm', baseURL: 'http://localhost:8000/v1' });
        break;
      }
      case 'llamacpp': {
        const { OpenAI } = await import('openai');
        client = new OpenAI({ apiKey: 'llamacpp', baseURL: 'http://localhost:8080/v1' });
        break;
      }
      default:
        throw new Error(`No native client available for provider: ${provider}`);
    }

    this.providerClients.set(provider, client);
    return client;
  }

  /**
   * Get the API key for a provider from environment variables.
   */
  private getApiKey(provider: ModelProviderType): string | undefined {
    const envMap: Partial<Record<ModelProviderType, string>> = {
      openai: 'OPENAI_API_KEY',
      claude: 'ANTHROPIC_API_KEY',
      gemini: 'GEMINI_API_KEY',
      'gemini-cli': 'GEMINI_API_KEY',
      glm: 'GLM_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      qwen: 'QWEN_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      grok: 'XAI_API_KEY',
      moonshot: 'MOONSHOT_API_KEY',
    };
    const envKey = envMap[provider];
    return envKey ? process.env[envKey] : undefined;
  }

  // ────────────────────────────────────────────────────────
  // Idle Provider Unloading
  // ────────────────────────────────────────────────────────

  /**
   * Unload providers that have been idle longer than the specified timeout.
   * Removes state, health, and circuit breaker entries — the next use
   * will re-initialize the provider lazily via ensureProvider().
   *
   * Called periodically by the kernel's maintenance cycle.
   *
   * @param timeoutMs - Idle threshold in milliseconds (default: 300000 = 5 minutes)
   * @returns Array of provider names that were unloaded
   */
  unloadIdleProviders(timeoutMs: number = 300_000): ModelProviderType[] {
    const now = Date.now();
    const unloaded: ModelProviderType[] = [];

    for (const [provider, state] of this.stateMap) {
      if (now - state.lastUsedAt > timeoutMs) {
        this.stateMap.delete(provider);
        this.healthMap.delete(provider);
        this.circuitBreakers.delete(provider);
        unloaded.push(provider);
      }
    }

    return unloaded;
  }

  // ────────────────────────────────────────────────────────
  // Active Provider Tracking
  // ────────────────────────────────────────────────────────

  /**
   * Get the list of currently initialized (active) providers.
   * Only providers that have been accessed at least once are included.
   */
  getActiveProviders(): ModelProviderType[] {
    return Array.from(this.stateMap.keys());
  }

  /**
   * Get the count of currently initialized providers.
   */
  getLoadedProviderCount(): number {
    return this.stateMap.size;
  }

  /**
   * Get the total count of available providers (including uninitialized).
   */
  getTotalProviderCount(): number {
    return ALL_PROVIDERS.length;
  }

  /**
   * Get all available provider types.
   */
  getAllProviders(): ModelProviderType[] {
    return [...ALL_PROVIDERS];
  }

  /**
   * Get the priority index for a provider.
   */
  getPriority(provider: ModelProviderType): number {
    return PROVIDER_PRIORITY.indexOf(provider);
  }

  // ────────────────────────────────────────────────────────
  // Public API — Backward Compatible
  // ────────────────────────────────────────────────────────

  /**
   * Execute a single model request with failover chain.
   * Enhanced with circuit breaker integration.
   */
  async executeWithFailover(request: ModelRequest): Promise<ModelResponse> {
    const preferredProvider = request.provider ?? this.selectModel(request.prompt);
    const failoverChain = this.getFailoverChain(preferredProvider);

    let lastError: string | undefined;

    for (const provider of failoverChain) {
      // Ensure provider is lazily initialized before checking circuit
      this.ensureProvider(provider);

      // Circuit breaker check
      const cbState = this.getCircuitState(provider);
      if (cbState === 'open') continue; // skip tripped circuits
      // half-open: allow one test request through

      const startTime = Date.now();
      try {
        const result = await this.callProvider(provider, request);
        const latencyMs = Date.now() - startTime;
        this.recordSuccess(provider, latencyMs, result.tokensUsed);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        this.recordFailure(provider);
      }
    }

    // All providers failed — return internal fallback response
    return {
      content: this.generateFallbackResponse(request.prompt),
      provider: preferredProvider,
      model: 'fallback',
      tokensUsed: 0,
      latencyMs: 0,
      success: false,
      error: lastError ?? 'All providers failed',
    };
  }

  /**
   * Execute multiple model requests in parallel, then AI-merge the results.
   * Each request is routed to its best provider based on role/task type.
   */
  async executeMultiModel(
    requests: Array<{
      role: string;
      prompt: string;
      systemPrompt?: string;
      provider?: ModelProviderType;
      maxTokens?: number;
      temperature?: number;
    }>,
  ): Promise<MultiModelResult> {
    const overallStart = Date.now();

    // Route each request to the best provider for its role
    const routedRequests = requests.map((req) => {
      const taskType = ROLE_TASK_MAP[req.role] ?? 'research';
      const preferred = req.provider ?? this.routeByTaskType(taskType);
      return { ...req, _provider: preferred };
    });

    // Execute all in parallel using Promise.allSettled
    const settled = await Promise.allSettled(
      routedRequests.map(async (req) => {
        const startTime = Date.now();
        try {
          const result = await this.executeWithFailover({
            prompt: req.prompt,
            systemPrompt: req.systemPrompt,
            maxTokens: req.maxTokens,
            temperature: req.temperature,
            provider: req._provider,
          });
          const latencyMs = Date.now() - startTime;
          return {
            role: req.role,
            content: result.content,
            provider: result.provider,
            model: result.model,
            tokensUsed: result.tokensUsed,
            latencyMs,
            success: result.success,
            error: result.error,
          };
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          return {
            role: req.role,
            content: '',
            provider: req._provider,
            model: MODEL_MAP[req._provider],
            tokensUsed: 0,
            latencyMs,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );

    // Collect results
    const results = settled.map((s, i) => {
      if (s.status === 'fulfilled') return s.value;
      return {
        role: routedRequests[i]!.role,
        content: '',
        provider: routedRequests[i]!._provider,
        model: MODEL_MAP[routedRequests[i]!._provider],
        tokensUsed: 0,
        latencyMs: 0,
        success: false,
        error: s.reason instanceof Error ? s.reason.message : 'Unknown error',
      };
    });

    const totalTokensUsed = results.reduce((sum, r) => sum + r.tokensUsed, 0);
    const totalLatencyMs = Date.now() - overallStart;

    // AI-merge the results
    let mergedResponse: string;
    try {
      mergedResponse = await this.mergeResults(results);
    } catch {
      // Fallback: concatenate results
      mergedResponse = this.concatenateResults(results);
    }

    return {
      results,
      mergedResponse,
      totalTokensUsed,
      totalLatencyMs,
    };
  }

  // ────────────────────────────────────────────────────────
  // Model Selection & Load Balancing
  // ────────────────────────────────────────────────────────

  /**
   * Select the best model for a given prompt/task.
   * Uses Kubernetes-style composite scoring.
   */
  selectModel(task?: string): ModelProviderType {
    const taskType = this.inferTaskType(task);
    const preferred = this.routeByTaskType(taskType);

    // If the preferred provider's circuit is closed, use it
    if (this.getCircuitState(preferred) !== 'open') return preferred;

    // Otherwise fall back to best-scoring provider with closed circuit
    const scores = this.scoreProviders();
    const available = scores.filter(
      (s) => this.getCircuitState(s.provider) !== 'open',
    );
    if (available.length > 0) return available[0]!.provider;

    // Last resort — return preferred anyway
    return preferred;
  }

  /**
   * Kubernetes-style load balancer: pick the provider with the best
   * composite score among those with closed circuits.
   */
  loadBalance(): ModelProviderType {
    const scores = this.scoreProviders();
    const available = scores.filter(
      (s) => this.getCircuitState(s.provider) !== 'open' && s.health.healthy,
    );
    if (available.length === 0) {
      // No healthy providers — try half-open
      const halfOpen = scores.filter(
        (s) => this.getCircuitState(s.provider) === 'half_open',
      );
      if (halfOpen.length > 0) return halfOpen[0]!.provider;
      return PROVIDER_PRIORITY[0];
    }

    // Weighted random selection among top 3 to avoid thundering herd
    const topN = available.slice(0, 3);
    const totalScore = topN.reduce((sum, s) => sum + s.score, 0);
    if (totalScore <= 0) return topN[0]!.provider;
    let rand = Math.random() * totalScore;
    for (const s of topN) {
      rand -= s.score;
      if (rand <= 0) return s.provider;
    }
    return topN[0]!.provider;
  }

  /**
   * Route by task type using traffic shaping preferences.
   */
  routeByTaskType(taskType: string): ModelProviderType {
    const preferences = TASK_PROVIDER_PREFERENCE[taskType];
    if (preferences && preferences.length > 0) {
      for (const p of preferences) {
        this.ensureProvider(p);
        if (this.getCircuitState(p) !== 'open') return p;
      }
    }
    // Fallback to generic load balance
    return this.loadBalance();
  }

  /**
   * Compute Kubernetes-style composite scores for initialized providers only.
   * Score = (health * 40) + (reliability * 30) + (speed * 20) + (cost * 10)
   *
   * Only providers that have been lazily initialized via ensureProvider()
   * are scored — uninitialized providers are not included.
   */
  scoreProviders(): ProviderScore[] {
    const initializedProviders = Array.from(this.stateMap.keys());

    return initializedProviders.map((provider) => {
      const state = this.stateMap.get(provider)!;
      const health = this.healthMap.get(provider)!;
      const cb = this.circuitBreakers.get(provider)!;

      // Health score: EMA of recent successes (0-1) * 40
      const healthScore = state.healthEma * 40;

      // Reliability score: overall success rate (0-1) * 30
      const totalRequests = state.requestCount || 1;
      const reliability = (totalRequests - state.failCount) / totalRequests;
      const reliabilityScore = reliability * 30;

      // Speed score: normalized latency (lower is better) * 20
      const latencies = getRingBufferValues(state.latencyBuffer);
      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 500; // assume 500ms if no data
      const speedScore = Math.max(0, (1 - avgLatency / 10000)) * 20;

      // Cost score: lower cost is better * 10
      const maxCost = Math.max(...Object.values(COST_PER_1K_TOKENS));
      const costScore = (1 - COST_PER_1K_TOKENS[provider] / maxCost) * 10;

      // Circuit breaker penalty
      const cbPenalty = cb.state === 'open' ? -100 : cb.state === 'half_open' ? -30 : 0;

      const compositeScore = healthScore + reliabilityScore + speedScore + costScore + cbPenalty;

      return {
        provider,
        score: compositeScore,
        health: { ...health, successRate: reliability },
        priority: PROVIDER_PRIORITY.indexOf(provider),
      };
    }).sort((a, b) => b.score - a.score);
  }

  // ────────────────────────────────────────────────────────
  // Circuit Breaker
  // ────────────────────────────────────────────────────────

  private getCircuitState(provider: ModelProviderType): CircuitBreakerState['state'] {
    this.ensureProvider(provider);
    const cb = this.circuitBreakers.get(provider)!;
    const now = Date.now();

    if (cb.state === 'open') {
      // Check if reset timeout has elapsed → transition to half-open
      if (now - cb.lastFailureTime >= cb.resetTimeoutMs) {
        cb.state = 'half_open';
      }
    }

    return cb.state;
  }

  private tripCircuit(provider: ModelProviderType): void {
    const cb = this.circuitBreakers.get(provider)!;
    cb.state = 'open';
    cb.lastFailureTime = Date.now();
  }

  private resetCircuit(provider: ModelProviderType): void {
    const cb = this.circuitBreakers.get(provider)!;
    cb.state = 'closed';
    cb.failureCount = 0;
  }

  // ────────────────────────────────────────────────────────
  // Health Monitoring
  // ────────────────────────────────────────────────────────

  /**
   * Get health status for all initialized providers.
   * Only providers that have been lazily initialized are included.
   */
  getProviderHealth(): Map<ModelProviderType, ModelHealth> {
    // Update health based on circuit breaker states (initialized providers only)
    for (const [provider, health] of this.healthMap) {
      const cbState = this.getCircuitState(provider);
      if (cbState === 'open') {
        health.healthy = false;
      }
    }
    return new Map(this.healthMap);
  }

  getLoadBalanceState(): Array<{
    provider: ModelProviderType;
    score: number;
    health: ModelHealth;
    priority: number;
    circuitState: CircuitBreakerState['state'];
    activeRequests: number;
  }> {
    const scores = this.scoreProviders();
    return scores.map((s) => ({
      provider: s.provider,
      score: s.score,
      health: s.health,
      priority: s.priority,
      circuitState: this.getCircuitState(s.provider),
      activeRequests: this.stateMap.get(s.provider)?.requestCount ?? 0,
    }));
  }

  /**
   * Get circuit breaker states for all initialized providers.
   * Only providers that have been lazily initialized are included.
   */
  getCircuitBreakerStates(): CircuitBreakerState[] {
    // Refresh states for initialized providers
    for (const provider of this.stateMap.keys()) {
      this.getCircuitState(provider);
    }
    return Array.from(this.circuitBreakers.values()).map((cb) => ({ ...cb }));
  }

  /**
   * Get detailed metrics for all initialized providers.
   * Only providers that have been lazily initialized are included.
   */
  getProviderMetrics(): ProviderMetrics[] {
    return Array.from(this.stateMap.entries()).map(([provider, state]) => {
      const cb = this.circuitBreakers.get(provider)!;

      const totalRequests = state.requestCount || 1;
      const successRate = (totalRequests - state.failCount) / totalRequests;

      const latencies = getRingBufferValues(state.latencyBuffer);
      const sorted = [...latencies].sort((a, b) => a - b);

      const avgLatencyMs = sorted.length > 0
        ? sorted.reduce((a, b) => a + b, 0) / sorted.length
        : 0;

      const contextWindow = this.dynamicContextWindow.get(provider) ?? CONTEXT_WINDOW[provider];
      const contextWindowUsage = contextWindow > 0
        ? state.contextTokensUsed / contextWindow
        : 0;

      // Compute sub-scores
      const healthScore = state.healthEma * 40;
      const reliabilityScore = successRate * 30;
      const avgLat = avgLatencyMs || 500;
      const speedScore = Math.max(0, (1 - avgLat / 10000)) * 20;
      const maxCost = Math.max(...Object.values(COST_PER_1K_TOKENS));
      const costScore = (1 - COST_PER_1K_TOKENS[provider] / maxCost) * 10;

      return {
        provider,
        totalRequests: state.requestCount,
        totalFailures: state.failCount,
        successRate,
        avgLatencyMs,
        p50LatencyMs: percentile(sorted, 0.5),
        p95LatencyMs: percentile(sorted, 0.95),
        p99LatencyMs: percentile(sorted, 0.99),
        estimatedCost: state.estimatedCost,
        contextWindowUsage,
        healthScore,
        reliabilityScore,
        speedScore,
        costScore,
        compositeScore: healthScore + reliabilityScore + speedScore + costScore,
        circuitBreakerState: { ...cb },
      };
    });
  }

  // ────────────────────────────────────────────────────────
  // Provider Call
  // ────────────────────────────────────────────────────────

  /**
   * Update the dynamic model map (called by Gemini CLI Discovery Engine).
   * Allows the discovery engine to set the best available model for gemini-cli.
   */
  updateDynamicModel(provider: ModelProviderType, modelId: string, contextWindow?: number): void {
    this.dynamicModelMap.set(provider, modelId);
    if (contextWindow) {
      this.dynamicContextWindow.set(provider, contextWindow);
    }
  }

  /**
   * Mark a provider as validated (circuit closed, healthy).
   * Called by the Gemini CLI Discovery Engine after successful validation.
   * Lazily initializes the provider if not yet loaded.
   */
  markProviderValidated(provider: ModelProviderType): void {
    this.ensureProvider(provider);
    const cb = this.circuitBreakers.get(provider)!;
    cb.state = 'closed';
    cb.failureCount = 0;
    const health = this.healthMap.get(provider)!;
    health.healthy = true;
  }

  /**
   * Mark a provider as degraded (circuit open, unhealthy).
   * Called by the Gemini CLI Discovery Engine when CLI is unavailable.
   * Lazily initializes the provider if not yet loaded.
   */
  markProviderDegraded(provider: ModelProviderType, reason?: string): void {
    this.ensureProvider(provider);
    const cb = this.circuitBreakers.get(provider)!;
    cb.state = 'open';
    cb.lastFailureTime = Date.now();
    const health = this.healthMap.get(provider)!;
    health.healthy = false;
    // Reason is logged but not stored in current schema
    void reason;
  }

  /**
   * Call a model provider using its native API client.
   *
   * For 'gemini-cli': Uses the Gemini CLI Discovery Engine to execute
   * prompts locally via the discovered CLI executable.
   *
   * For all other providers: Calls the provider's native SDK directly
   * (OpenAI-compatible, Anthropic, Google Generative AI, etc.).
   */
  private async callProvider(provider: ModelProviderType, request: ModelRequest): Promise<ModelResponse> {
    // Special handling for Gemini CLI provider
    if (provider === 'gemini-cli') {
      return this.callGeminiCLI(request);
    }

    const startTime = Date.now();
    const model = this.dynamicModelMap.get(provider) ?? MODEL_MAP[provider] ?? 'gpt-4o';

    // Anthropic uses a different API shape
    if (provider === 'claude') {
      return this.callAnthropic(provider, model, request, startTime);
    }

    // Google Generative AI uses a different API shape
    if (provider === 'gemini') {
      return this.callGoogleGenAI(provider, model, request, startTime);
    }

    // OpenAI-compatible providers (openai, deepseek, mistral-openai, openrouter, glm, qwen, grok, moonshot, ollama, lmstudio, vllm, llamacpp)
    return this.callOpenAICompatible(provider, model, request, startTime);
  }

  /**
   * Call a provider using the OpenAI-compatible chat completions API.
   * Works for: OpenAI, DeepSeek, OpenRouter, GLM, Qwen, Grok, Moonshot,
   * Ollama, LM Studio, vLLM, llama.cpp
   */
  private async callOpenAICompatible(
    provider: ModelProviderType,
    model: string,
    request: ModelRequest,
    startTime: number,
  ): Promise<ModelResponse> {
    const client = await this.getProviderClient(provider);

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.7,
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const tokensUsed = response.usage?.total_tokens ?? 0;

    return {
      content,
      provider,
      model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      success: true,
    };
  }

  /**
   * Call Anthropic (Claude) using the native Anthropic SDK.
   */
  private async callAnthropic(
    provider: ModelProviderType,
    model: string,
    request: ModelRequest,
    startTime: number,
  ): Promise<ModelResponse> {
    const client = await this.getProviderClient(provider);

    const response = await client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 2048,
      ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
      messages: [{ role: 'user', content: request.prompt }],
    });

    const content = response.content?.[0]?.text ?? '';
    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    return {
      content,
      provider,
      model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      success: true,
    };
  }

  /**
   * Call Google Generative AI (Gemini) using the native Google SDK.
   */
  private async callGoogleGenAI(
    provider: ModelProviderType,
    model: string,
    request: ModelRequest,
    startTime: number,
  ): Promise<ModelResponse> {
    const client = await this.getProviderClient(provider);
    const genModel = client.getGenerativeModel({ model });

    const parts: Array<{ text: string }> = [];
    if (request.systemPrompt) {
      // Google GenAI uses systemInstruction for system prompts
      genModel.systemInstruction = request.systemPrompt;
    }
    parts.push({ text: request.prompt });

    const result = await genModel.generateContent({ contents: [{ role: 'user', parts }] });
    const response = result.response;
    const content = response.text();
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;

    return {
      content,
      provider,
      model,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      success: true,
    };
  }

  /**
   * Execute a prompt via the Gemini CLI Discovery Engine.
   * Falls back to the Gemini API provider if CLI is unavailable.
   */
  private async callGeminiCLI(request: ModelRequest): Promise<ModelResponse> {
    // Lazy import to avoid circular dependency
    const { geminiCLIDiscovery } = await import('./gemini-cli-discovery');

    if (!geminiCLIDiscovery.isAvailable()) {
      // CLI not available — fall back to Gemini API
      throw new Error('Gemini CLI not available; failing over to Gemini API');
    }

    const model = this.dynamicModelMap.get('gemini-cli') ?? 'gemini-2.5-flash';
    const fullPrompt = request.systemPrompt
      ? `${request.systemPrompt}\n\n${request.prompt}`
      : request.prompt;

    const result = await geminiCLIDiscovery.executePrompt(fullPrompt, model);

    if (!result.success) {
      throw new Error(result.error ?? 'Gemini CLI execution failed');
    }

    return {
      content: result.content,
      provider: 'gemini-cli',
      model,
      tokensUsed: Math.ceil(result.content.length / 4), // Approximate token count for CLI
      latencyMs: result.latencyMs,
      success: true,
    };
  }

  // ────────────────────────────────────────────────────────
  // Result Merging for Multi-Model
  // ────────────────────────────────────────────────────────

  private async mergeResults(
    results: MultiModelResult['results'],
  ): Promise<string> {
    const successful = results.filter((r) => r.success);
    if (successful.length === 0) return this.concatenateResults(results);
    if (successful.length === 1) return successful[0]!.content;

    const mergePrompt = successful
      .map((r) => `## ${r.role.toUpperCase()} (via ${r.provider}/${r.model})\n${r.content}`)
      .join('\n\n---\n\n');

    try {
      // Use the model router itself to merge results (self-referential)
      const mergeResult = await this.callOpenAICompatible(
        'openai',
        'gpt-4o',
        {
          prompt: mergePrompt,
          systemPrompt:
            'You are a synthesis engine. Merge the following multi-model responses into a single coherent, comprehensive answer. ' +
            'Preserve key insights from each perspective, resolve contradictions by favoring more specific/detailed claims, ' +
            'and organize the output with clear structure. Do not mention the individual models or providers.',
          maxTokens: 4096,
          temperature: 0.3,
        },
        Date.now(),
      );
      return mergeResult.content || this.concatenateResults(results);
    } catch {
      return this.concatenateResults(results);
    }
  }

  private concatenateResults(results: MultiModelResult['results']): string {
    const successful = results.filter((r) => r.success);
    if (successful.length === 0) {
      return 'All model providers failed to generate a response. Please try again.';
    }
    if (successful.length === 1) return successful[0]!.content;
    return successful
      .map((r) => `### ${r.role}\n${r.content}`)
      .join('\n\n---\n\n');
  }

  // ────────────────────────────────────────────────────────
  // Internal Helpers
  // ────────────────────────────────────────────────────────

  private getFailoverChain(preferred: ModelProviderType): ModelProviderType[] {
    const chain = [preferred];
    for (const p of PROVIDER_PRIORITY) {
      if (p !== preferred) chain.push(p);
    }
    return chain;
  }

  private inferTaskType(prompt?: string): string {
    if (!prompt) return 'research';
    const lower = prompt.toLowerCase();
    if (/code|function|implement|debug|fix bug|program|script|api|class|module/.test(lower)) return 'coding';
    if (/plan|strategy|roadmap|schedule|organize|architect|design/.test(lower)) return 'planning';
    if (/review|check|audit|verify|validate|test|inspect/.test(lower)) return 'review';
    if (/analyz|data|metric|statistic|chart|graph|trend/.test(lower)) return 'analysis';
    if (/creative|write|story|poem|brainstorm|idea|imagine/.test(lower)) return 'creative';
    return 'research';
  }

  private generateFallbackResponse(prompt: string): string {
    return `I received your request: "${prompt.slice(0, 100)}". All AI providers are currently unavailable. Please check your API key configuration in Settings and try again.`;
  }

  private recordSuccess(provider: ModelProviderType, latencyMs: number, tokensUsed: number): void {
    this.ensureProvider(provider);
    const state = this.stateMap.get(provider)!;
    const health = this.healthMap.get(provider)!;
    const cb = this.circuitBreakers.get(provider)!;

    const now = Date.now();

    state.requestCount++;
    state.totalTokensUsed += tokensUsed;
    state.estimatedCost += (tokensUsed / 1000) * COST_PER_1K_TOKENS[provider];
    state.contextTokensUsed = tokensUsed; // last request's context usage
    state.lastUsedAt = now; // track usage for idle unloading

    // Update latency ring buffer
    pushRingBuffer(state.latencyBuffer, latencyMs);

    // Track recent results (keep last 5 minutes)
    state.recentResults.push({ success: true, timestamp: now });
    state.recentResults = state.recentResults.filter((r) => now - r.timestamp < 300_000);

    // Update health EMA
    state.healthEma = state.healthEma * (1 - this.EMA_ALPHA) + 1.0 * this.EMA_ALPHA;

    // Update health map
    health.healthy = true;
    health.latencyMs = latencyMs;
    health.lastChecked = now;

    // Reset circuit breaker on success (half-open → closed)
    if (cb.state === 'half_open') {
      this.resetCircuit(provider);
    }
  }

  private recordFailure(provider: ModelProviderType): void {
    this.ensureProvider(provider);
    const state = this.stateMap.get(provider)!;
    const health = this.healthMap.get(provider)!;
    const cb = this.circuitBreakers.get(provider)!;

    const now = Date.now();

    state.requestCount++;
    state.failCount++;
    state.lastUsedAt = now; // track usage for idle unloading

    // Track recent results (keep last 5 minutes)
    state.recentResults.push({ success: false, timestamp: now });
    state.recentResults = state.recentResults.filter((r) => now - r.timestamp < 300_000);

    // Update health EMA
    state.healthEma = state.healthEma * (1 - this.EMA_ALPHA) + 0.0 * this.EMA_ALPHA;

    // Update circuit breaker
    cb.failureCount++;
    cb.lastFailureTime = now;

    // Check if we should trip the circuit (>50% failures in last 5 min, or hit threshold)
    const recentFailures = state.recentResults.filter((r) => !r.success).length;
    const recentTotal = state.recentResults.length;
    if (recentTotal >= 3 && recentFailures / recentTotal > 0.5) {
      this.tripCircuit(provider);
    } else if (cb.failureCount >= cb.tripThreshold) {
      this.tripCircuit(provider);
    }

    // Update health map
    const totalRequests = state.requestCount || 1;
    const successRate = (totalRequests - state.failCount) / totalRequests;
    health.healthy = cb.state !== 'open';
    health.successRate = successRate;
    health.lastChecked = now;
  }
}

// ─── Singleton Export ────────────────────────────────────────
export const modelRouter = new ModelRouter();
