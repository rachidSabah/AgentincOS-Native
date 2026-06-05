// ============================================================
// Agentic OS V2 — Multi-Model Router with Failover
// ============================================================
import type { ModelProviderType, ModelRequest, ModelResponse, ModelHealth, ProviderScore } from './types';

const PROVIDER_PRIORITY: ModelProviderType[] = ['openai', 'claude', 'gemini', 'glm', 'mistral', 'qwen', 'deepseek'];

class ModelRouter {
  private healthMap: Map<ModelProviderType, ModelHealth> = new Map();
  private latencyMap: Map<ModelProviderType, number[]> = new Map();
  private requestCount: Map<ModelProviderType, number> = new Map();
  private failCount: Map<ModelProviderType, number> = new Map();

  constructor() {
    // Initialize health for all providers
    for (const provider of PROVIDER_PRIORITY) {
      this.healthMap.set(provider, {
        provider,
        healthy: true,
        latencyMs: 0,
        successRate: 1.0,
        lastChecked: Date.now(),
      });
      this.latencyMap.set(provider, []);
      this.requestCount.set(provider, 0);
      this.failCount.set(provider, 0);
    }
  }

  selectModel(task?: string): ModelProviderType {
    const scores = this.scoreProviders();
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.provider ?? 'openai';
  }

  async executeWithFailover(request: ModelRequest): Promise<ModelResponse> {
    const preferredProvider = request.provider ?? this.selectModel(request.prompt);
    const failoverChain = this.getFailoverChain(preferredProvider);

    let lastError: string | undefined;

    for (const provider of failoverChain) {
      const health = this.healthMap.get(provider);
      if (health && !health.healthy) continue;

      const startTime = Date.now();
      try {
        const result = await this.callProvider(provider, request);
        const latencyMs = Date.now() - startTime;
        this.recordSuccess(provider, latencyMs);
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
      provider: 'openai',
      model: 'fallback',
      tokensUsed: 0,
      latencyMs: 0,
      success: false,
      error: lastError ?? 'All providers failed',
    };
  }

  private async callProvider(provider: ModelProviderType, request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const response = await ZAI.chat.completions.create({
        model: this.getModelForProvider(provider),
        messages: [
          ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
          { role: 'user' as const, content: request.prompt },
        ],
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
      });

      const content = response.choices?.[0]?.message?.content ?? '';
      return {
        content,
        provider,
        model: this.getModelForProvider(provider),
        tokensUsed: response.usage?.total_tokens ?? 0,
        latencyMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  private generateFallbackResponse(prompt: string): string {
    return `I received your request: "${prompt.slice(0, 100)}". All AI providers are currently unavailable. Please check your API key configuration in Settings and try again.`;
  }

  private getModelForProvider(provider: ModelProviderType): string {
    const modelMap: Record<ModelProviderType, string> = {
      openai: 'gpt-4o',
      claude: 'claude-sonnet-4-20250514',
      gemini: 'gemini-2.0-flash',
      glm: 'glm-4',
      mistral: 'mistral-large-latest',
      qwen: 'qwen-max',
      deepseek: 'deepseek-chat',
    };
    return modelMap[provider] ?? 'gpt-4o';
  }

  private getFailoverChain(preferred: ModelProviderType): ModelProviderType[] {
    const chain = [preferred];
    for (const p of PROVIDER_PRIORITY) {
      if (p !== preferred) chain.push(p);
    }
    return chain;
  }

  scoreProviders(): ProviderScore[] {
    return PROVIDER_PRIORITY.map((provider) => {
      const health = this.healthMap.get(provider)!;
      const totalRequests = this.requestCount.get(provider) ?? 0;
      const failedRequests = this.failCount.get(provider) ?? 0;
      const successRate = totalRequests > 0 ? (totalRequests - failedRequests) / totalRequests : 1.0;
      const latencyScores = this.latencyMap.get(provider) ?? [];
      const avgLatency = latencyScores.length > 0 ? latencyScores.reduce((a, b) => a + b, 0) / latencyScores.length : 0;
      const priorityScore = (PROVIDER_PRIORITY.length - PROVIDER_PRIORITY.indexOf(provider)) * 10;
      const healthScore = health.healthy ? 50 : 0;
      const latencyScore = Math.max(0, 30 - avgLatency / 100);
      const reliabilityScore = successRate * 20;

      return {
        provider,
        score: priorityScore + healthScore + latencyScore + reliabilityScore,
        health: { ...health, successRate },
        priority: PROVIDER_PRIORITY.indexOf(provider),
      };
    });
  }

  loadBalance(): ModelProviderType {
    const healthy = PROVIDER_PRIORITY.filter((p) => {
      const h = this.healthMap.get(p);
      return h?.healthy ?? false;
    });
    if (healthy.length === 0) return PROVIDER_PRIORITY[0];
    // Round-robin based on request count
    const leastUsed = healthy.sort((a, b) => (this.requestCount.get(a) ?? 0) - (this.requestCount.get(b) ?? 0));
    return leastUsed[0];
  }

  getProviderHealth(): Map<ModelProviderType, ModelHealth> {
    return new Map(this.healthMap);
  }

  private recordSuccess(provider: ModelProviderType, latencyMs: number): void {
    const current = this.requestCount.get(provider) ?? 0;
    this.requestCount.set(provider, current + 1);
    const latencies = this.latencyMap.get(provider) ?? [];
    latencies.push(latencyMs);
    if (latencies.length > 100) latencies.shift();
    this.latencyMap.set(provider, latencies);
    const health = this.healthMap.get(provider)!;
    health.healthy = true;
    health.latencyMs = latencyMs;
    health.lastChecked = Date.now();
  }

  private recordFailure(provider: ModelProviderType): void {
    const current = this.requestCount.get(provider) ?? 0;
    this.requestCount.set(provider, current + 1);
    const fails = this.failCount.get(provider) ?? 0;
    this.failCount.set(provider, fails + 1);
    const totalReqs = this.requestCount.get(provider) ?? 1;
    if (fails / totalReqs > 0.5 && totalReqs > 3) {
      const health = this.healthMap.get(provider)!;
      health.healthy = false;
      health.lastChecked = Date.now();
    }
  }
}

export const modelRouter = new ModelRouter();
