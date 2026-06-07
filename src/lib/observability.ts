// ============================================================
// Agentic OS V2 — Observability Engine
// ============================================================
import type { MetricEvent, SystemHealth, ProviderHealth } from './types';
import type { ModelProviderType } from './types';
import { agentRegistry } from './agent-runtime';
import { modelRouter } from './model-router';

class ObservabilityEngine {
  private metrics: Map<string, MetricEvent[]> = new Map();
  private maxMetricsPerType = 1000;
  private startTime = Date.now();

  trackMetric(type: string, value: number, metadata: Record<string, unknown> = {}): void {
    const event: MetricEvent = {
      id: `metric-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      value,
      metadata,
      timestamp: Date.now(),
    };

    const existing = this.metrics.get(type) ?? [];
    existing.push(event);
    if (existing.length > this.maxMetricsPerType) {
      existing.shift();
    }
    this.metrics.set(type, existing);
  }

  getActiveAgents(): Array<{ id: string; name: string; type: string; status: string; currentTask?: string }> {
    return agentRegistry.list().map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      currentTask: a.currentTask,
    }));
  }

  getActiveModels(): ProviderHealth[] {
    const healthMap = modelRouter.getProviderHealth();
    const providers: ModelProviderType[] = [
      'openai', 'claude', 'gemini-cli', 'gemini', 'glm', 'mistral', 'qwen', 'deepseek',
      'openrouter', 'ollama', 'lmstudio', 'llamacpp', 'vllm', 'grok', 'moonshot',
    ];

    return providers.map((p) => {
      const h = healthMap.get(p);
      return {
        provider: p,
        healthy: h?.healthy ?? true,
        latencyMs: h?.latencyMs ?? 0,
        successRate: h?.successRate ?? 1.0,
        totalRequests: 0,
        failedRequests: 0,
        lastChecked: h?.lastChecked ?? Date.now(),
      };
    });
  }

  getLatency(): { avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number } {
    const latencies = this.getMetricValues('latency');
    if (latencies.length === 0) return { avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };

    const sorted = [...latencies].sort((a, b) => a - b);
    return {
      avgMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50Ms: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
      p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99Ms: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    };
  }

  getErrorRate(): { rate: number; total: number; errors: number } {
    const total = this.getMetricValues('request').length;
    const errors = this.getMetricValues('error').length;
    return {
      rate: total > 0 ? errors / total : 0,
      total,
      errors,
    };
  }

  getMemoryUsage(): { used: number; total: number; percent: number } {
    const memoryMetrics = this.getMetricValues('memory');
    const used = memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1] : 0;
    const total = 1024; // MB simulated
    return { used, total, percent: (used / total) * 100 };
  }

  getSwarmActivity(): { active: number; completed: number; failed: number } {
    return {
      active: this.getMetricValues('swarm_active').reduce((a, b) => a + b, 0),
      completed: this.getMetricValues('swarm_completed').length,
      failed: this.getMetricValues('swarm_failed').length,
    };
  }

  getProviderHealth(): Array<{
    provider: string;
    healthy: boolean;
    latencyMs: number;
    successRate: number;
    status: 'healthy' | 'degraded' | 'down';
  }> {
    return this.getActiveModels().map((m) => ({
      provider: m.provider,
      healthy: m.healthy,
      latencyMs: m.latencyMs,
      successRate: m.successRate,
      status: !m.healthy ? 'down' : m.successRate < 0.9 ? 'degraded' : 'healthy' as const,
    }));
  }

  getSystemHealth(): SystemHealth {
    const agents = this.getActiveAgents();
    const models = this.getActiveModels();
    const latency = this.getLatency();
    const errorRate = this.getErrorRate();

    const healthyModels = models.filter((m) => m.healthy).length;
    const status: SystemHealth['status'] =
      errorRate.rate > 0.5 ? 'unhealthy' :
      errorRate.rate > 0.1 || healthyModels < models.length / 2 ? 'degraded' :
      'healthy';

    return {
      status,
      activeAgents: agents.filter((a) => a.status === 'active').length,
      totalAgents: agents.length,
      activeModels: healthyModels,
      totalModels: models.length,
      avgLatencyMs: latency.avgMs,
      errorRate: errorRate.rate,
      memoryUsage: this.getMemoryUsage().percent,
      uptime: Date.now() - this.startTime,
    };
  }

  getMetricHistory(type: string, limit: number = 100): MetricEvent[] {
    const events = this.metrics.get(type) ?? [];
    return events.slice(-limit);
  }

  private getMetricValues(type: string): number[] {
    const events = this.metrics.get(type) ?? [];
    return events.map((e) => e.value);
  }
}

export const observabilityEngine = new ObservabilityEngine();
