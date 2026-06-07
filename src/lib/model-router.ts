// ============================================================
// Agentic OS V2 — Multi-Model Router with Kubernetes-Style
// Load Balancing, Circuit Breakers, Traffic Shaping &
// Comprehensive Health Monitoring
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
  private healthMap: Map<ModelProviderType, ModelHealth> = new Map();
  private stateMap: Map<ModelProviderType, ProviderState> = new Map();
  private circuitBreakers: Map<ModelProviderType, CircuitBreakerState> = new Map();

  // Dynamic model map — can be updated by Gemini CLI discovery
  private dynamicModelMap: Map<ModelProviderType, string> = new Map(Object.entries(MODEL_MAP) as [ModelProviderType, string][]);
  private dynamicContextWindow: Map<ModelProviderType, number> = new Map(Object.entries(CONTEXT_WINDOW) as [ModelProviderType, number][]);

  // EMA alpha — higher = more responsive to recent data
  private readonly EMA_ALPHA = 0.3;

  constructor() {
    for (const provider of ALL_PROVIDERS) {
      this.healthMap.set(provider, {
        provider,
        healthy: true,
        latencyMs: 0,
        successRate: 1.0,
        lastChecked: Date.now(),
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
      });

      this.circuitBreakers.set(provider, {
        provider,
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        tripThreshold: 3,
        resetTimeoutMs: 30_000,
      });
    }

    // Gemini CLI starts with circuit open until discovery validates it
    const geminiCliCB = this.circuitBreakers.get('gemini-cli');
    if (geminiCliCB) {
      geminiCliCB.state = 'open'; // Not yet validated
    }
    const geminiCliHealth = this.healthMap.get('gemini-cli');
    if (geminiCliHealth) {
      geminiCliHealth.healthy = false; // Not yet validated
    }
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
        if (this.getCircuitState(p) !== 'open') return p;
      }
    }
    // Fallback to generic load balance
    return this.loadBalance();
  }

  /**
   * Compute Kubernetes-style composite scores for all providers.
   * Score = (health * 40) + (reliability * 30) + (speed * 20) + (cost * 10)
   */
  scoreProviders(): ProviderScore[] {
    return ALL_PROVIDERS.map((provider) => {
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

  getProviderHealth(): Map<ModelProviderType, ModelHealth> {
    // Update health based on circuit breaker states
    for (const provider of ALL_PROVIDERS) {
      const health = this.healthMap.get(provider)!;
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

  getCircuitBreakerStates(): CircuitBreakerState[] {
    // Refresh states before returning
    for (const provider of ALL_PROVIDERS) {
      this.getCircuitState(provider);
    }
    return ALL_PROVIDERS.map((p) => ({ ...this.circuitBreakers.get(p)! }));
  }

  getProviderMetrics(): ProviderMetrics[] {
    return ALL_PROVIDERS.map((provider) => {
      const state = this.stateMap.get(provider)!;
      const cb = this.circuitBreakers.get(provider)!;

      const totalRequests = state.requestCount || 1;
      const successRate = (totalRequests - state.failCount) / totalRequests;

      const latencies = getRingBufferValues(state.latencyBuffer);
      const sorted = [...latencies].sort((a, b) => a - b);

      const avgLatencyMs = sorted.length > 0
        ? sorted.reduce((a, b) => a + b, 0) / sorted.length
        : 0;

      const contextWindowUsage = CONTEXT_WINDOW[provider] > 0
        ? state.contextTokensUsed / CONTEXT_WINDOW[provider]
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
   */
  markProviderValidated(provider: ModelProviderType): void {
    const cb = this.circuitBreakers.get(provider);
    if (cb) {
      cb.state = 'closed';
      cb.failureCount = 0;
    }
    const health = this.healthMap.get(provider);
    if (health) {
      health.healthy = true;
    }
  }

  /**
   * Mark a provider as degraded (circuit open, unhealthy).
   * Called by the Gemini CLI Discovery Engine when CLI is unavailable.
   */
  markProviderDegraded(provider: ModelProviderType, reason?: string): void {
    const cb = this.circuitBreakers.get(provider);
    if (cb) {
      cb.state = 'open';
      cb.lastFailureTime = Date.now();
    }
    const health = this.healthMap.get(provider);
    if (health) {
      health.healthy = false;
    }
  }

  /**
   * Call a model provider.
   *
   * For 'gemini-cli': Uses the Gemini CLI Discovery Engine to execute
   * prompts locally via the discovered CLI executable.
   *
   * For all other providers: Routes through the Z-AI SDK gateway.
   */
  private async callProvider(provider: ModelProviderType, request: ModelRequest): Promise<ModelResponse> {
    // Special handling for Gemini CLI provider
    if (provider === 'gemini-cli') {
      return this.callGeminiCLI(request);
    }

    // Standard Z-AI SDK gateway for all other providers
    const startTime = Date.now();

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const response = await ZAI.chat.completions.create({
      model: this.dynamicModelMap.get(provider) ?? MODEL_MAP[provider] ?? 'gpt-4o',
      messages: [
        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
        { role: 'user' as const, content: request.prompt },
      ],
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.7,
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const tokensUsed = response.usage?.total_tokens ?? 0;

    return {
      content,
      provider,
      model: this.dynamicModelMap.get(provider) ?? MODEL_MAP[provider] ?? 'gpt-4o',
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
      // Z-AI SDK gateway for multi-model merge (see callProvider architecture note)
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const response = await ZAI.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system' as const,
            content:
              'You are a synthesis engine. Merge the following multi-model responses into a single coherent, comprehensive answer. ' +
              'Preserve key insights from each perspective, resolve contradictions by favoring more specific/detailed claims, ' +
              'and organize the output with clear structure. Do not mention the individual models or providers.',
          },
          { role: 'user' as const, content: mergePrompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      });
      return response.choices?.[0]?.message?.content ?? this.concatenateResults(results);
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
    const state = this.stateMap.get(provider)!;
    const health = this.healthMap.get(provider)!;
    const cb = this.circuitBreakers.get(provider)!;

    state.requestCount++;
    state.totalTokensUsed += tokensUsed;
    state.estimatedCost += (tokensUsed / 1000) * COST_PER_1K_TOKENS[provider];
    state.contextTokensUsed = tokensUsed; // last request's context usage

    // Update latency ring buffer
    pushRingBuffer(state.latencyBuffer, latencyMs);

    // Track recent results (keep last 5 minutes)
    const now = Date.now();
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
    const state = this.stateMap.get(provider)!;
    const health = this.healthMap.get(provider)!;
    const cb = this.circuitBreakers.get(provider)!;

    state.requestCount++;
    state.failCount++;

    // Track recent results (keep last 5 minutes)
    const now = Date.now();
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
