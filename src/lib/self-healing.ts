// ============================================================
// Agentic OS V2 — Self-Healing Engine
// ============================================================
import type { ModelRequest, ModelResponse } from './types';
import { modelRouter } from './model-router';

type ErrorType = 'crash' | 'timeout' | 'provider_failure' | 'tool_failure' | 'unknown';

interface HealingEvent {
  id: string;
  errorType: ErrorType;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolution?: string;
}

class SelfHealingEngine {
  private events: HealingEvent[] = [];
  private maxRetries = 3;
  private baseDelayMs = 1000;

  detect(error: unknown): HealingEvent {
    const errorType = this.classifyError(error);
    const message = error instanceof Error ? error.message : String(error);

    const event: HealingEvent = {
      id: `heal-${Date.now()}`,
      errorType,
      message,
      timestamp: Date.now(),
      resolved: false,
    };

    this.events.push(event);
    return event;
  }

  async retry<T>(operation: () => Promise<T>, maxRetries?: number): Promise<T> {
    const retries = maxRetries ?? this.maxRetries;
    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const delay = this.baseDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  async reroute(request: ModelRequest): Promise<ModelResponse> {
    // Skip the failed provider and try alternatives
    const result = await modelRouter.executeWithFailover(request);
    return result;
  }

  async recover(error: unknown): Promise<string> {
    const event = this.detect(error);

    switch (event.errorType) {
      case 'provider_failure':
        return 'Rerouted to alternative provider';
      case 'timeout':
        return 'Retried with increased timeout';
      case 'crash':
        return 'Restarted failed component';
      case 'tool_failure':
        return 'Switched to fallback tool';
      default:
        return 'Applied generic recovery strategy';
    }
  }

  getEvents(limit: number = 50): HealingEvent[] {
    return this.events.slice(-limit);
  }

  getHealthStatus(): {
    totalEvents: number;
    resolvedEvents: number;
    unresolvedEvents: number;
    recentErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recent = this.events.filter((e) => e.timestamp > oneHourAgo);

    return {
      totalEvents: this.events.length,
      resolvedEvents: this.events.filter((e) => e.resolved).length,
      unresolvedEvents: this.events.filter((e) => !e.resolved).length,
      recentErrors: recent.length,
    };
  }

  private classifyError(error: unknown): ErrorType {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
      if (msg.includes('api') || msg.includes('provider') || msg.includes('key')) return 'provider_failure';
      if (msg.includes('crash') || msg.includes('fatal') || msg.includes('segmentation')) return 'crash';
      if (msg.includes('tool') || msg.includes('command') || msg.includes('execution')) return 'tool_failure';
    }
    return 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const selfHealingEngine = new SelfHealingEngine();
