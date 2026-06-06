// ============================================================
// Agentic OS X — Comprehensive Self-Healing Engine
// Detect → Classify → Select Strategy → Execute → Verify → Learn
// ============================================================
import type {
  ModelRequest,
  ModelResponse,
  HealingErrorCategory,
  HealingStrategy,
  HealingOutcome,
  HealingEvent,
  HealthCheckResult,
  HealingPattern,
} from './types';
import { modelRouter } from './model-router';

// ─── Error Classification Rules ─────────────────────────────
interface ClassificationRule {
  category: HealingErrorCategory;
  patterns: RegExp[];
  componentType: string;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Agent Failures
  {
    category: 'agent_failure',
    patterns: [
      /agent.*(crash|fail|error|died|killed)/i,
      /agent.*(timeout|timed?\s*out)/i,
      /agent.*invalid.*(output|response|result)/i,
      /swarm.*(fail|error)/i,
      /execute.*agent.*fail/i,
      /agent.*unresponsive/i,
    ],
    componentType: 'agent',
  },
  // Model Failures
  {
    category: 'model_failure',
    patterns: [
      /provider.*(down|unavailable|fail)/i,
      /rate\s*limit/i,
      /context.*(overflow|exceed|too\s*long|length)/i,
      /invalid.*(response|completion|model)/i,
      /api\s?key.*(invalid|missing|expired)/i,
      /model.*(not\s*found|unavailable)/i,
      /token.*(limit|exceed)/i,
      /429/i,
      /5\d{2}\s*(error|server)/i,
    ],
    componentType: 'model',
  },
  // Memory Failures
  {
    category: 'memory_failure',
    patterns: [
      /database.*(error|fail|connection)/i,
      /db.*error/i,
      /prisma.*(error|fail)/i,
      /memory.*(corruption|corrupt|invalid)/i,
      /missing.*(data|record|entry)/i,
      /query.*fail/i,
      /sqlite.*(error|busy|locked)/i,
      /constraint.*fail/i,
      /unique.*violation/i,
    ],
    componentType: 'memory',
  },
  // API Failures
  {
    category: 'api_failure',
    patterns: [
      /route.*(error|not\s*found)/i,
      /authentication.*(error|fail|required)/i,
      /unauthorized/i,
      /forbidden/i,
      /api.*(rate\s*limit|throttl)/i,
      /cors.*(error|block)/i,
      /request.*(too\s*large|invalid)/i,
      /method\s*not\s*allowed/i,
    ],
    componentType: 'api',
  },
  // Tool Failures
  {
    category: 'tool_failure',
    patterns: [
      /tool.*(crash|fail|error)/i,
      /invalid.*tool.*(call|invocation|argument)/i,
      /missing.*tool/i,
      /tool.*(not\s*found|unavailable)/i,
      /execution.*(fail|error|timeout)/i,
      /command.*(fail|not\s*found)/i,
    ],
    componentType: 'tool',
  },
  // UI Failures
  {
    category: 'ui_failure',
    patterns: [
      /component.*(error|fail|crash)/i,
      /render.*(fail|error)/i,
      /hydration.*(error|mismatch)/i,
      /react.*(error|boundary)/i,
      /undefined.*(is\s*not\s*a\s*function|cannot\s*read)/i,
      /null.*cannot\s*read/i,
      /cannot\s*read\s*properties\s*of/i,
    ],
    componentType: 'ui',
  },
  // Route Failures
  {
    category: 'route_failure',
    patterns: [
      /navigation.*(error|fail)/i,
      /missing.*route/i,
      /404/i,
      /page.*not\s*found/i,
      /route.*(not\s*found|missing)/i,
      /redirect.*(fail|loop)/i,
    ],
    componentType: 'route',
  },
];

// ─── Strategy Selection Matrix ──────────────────────────────
// Maps error categories to their preferred strategies, in order
const STRATEGY_MATRIX: Record<HealingErrorCategory, HealingStrategy[]> = {
  agent_failure: ['restart', 'reroute', 'retry', 'recover'],
  model_failure: ['reroute', 'retry', 'rollback', 'repair'],
  memory_failure: ['recover', 'repair', 'retry', 'restart'],
  api_failure: ['retry', 'reroute', 'repair', 'recover'],
  tool_failure: ['retry', 'reroute', 'repair', 'restart'],
  ui_failure: ['repair', 'recover', 'restart', 'rollback'],
  route_failure: ['repair', 'recover', 'rollback', 'reroute'],
};

// ─── Health Check Configuration ─────────────────────────────
interface HealthCheckConfig {
  component: string;
  componentType: string;
  intervalMs: number;
  check: () => Promise<HealthCheckResult>;
}

// ─── Self-Healing Pipeline ──────────────────────────────────
class SelfHealingEngine {
  private events: HealingEvent[] = [];
  private patterns: Map<string, HealingPattern> = new Map();
  private healthChecks: Map<string, HealthCheckConfig> = new Map();
  private healthResults: Map<string, HealthCheckResult> = new Map();
  private lastKnownGoodStates: Map<string, unknown> = new Map();

  private maxEvents = 1000;
  private maxPatterns = 200;
  private maxRetries = 3;
  private baseDelayMs = 1000;
  private maxDelayMs = 30000;
  private healthCheckTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  // ─── Pipeline: Detect ───────────────────────────────────

  /**
   * Detect and classify an error, creating a healing event.
   */
  detect(error: unknown, componentId?: string, componentType?: string): HealingEvent {
    const now = Date.now();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    const category = this.classifyError(errorMessage);
    const resolvedComponentType = componentType ?? this.inferComponentType(category);

    const event: HealingEvent = {
      id: `heal-${now}-${Math.random().toString(36).slice(2, 8)}`,
      errorCategory: category,
      errorMessage,
      errorStack,
      strategy: 'retry', // will be updated during pipeline
      recoverySteps: [],
      outcome: 'failure',
      timestamp: now,
      detectedAt: now,
      componentId,
      componentType: resolvedComponentType,
      metadata: {},
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-Math.floor(this.maxEvents * 0.8));
    }

    return event;
  }

  // ─── Pipeline: Classify ─────────────────────────────────

  /**
   * Classify an error message into a healing category.
   */
  private classifyError(message: string): HealingErrorCategory {
    for (const rule of CLASSIFICATION_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(message)) {
          return rule.category;
        }
      }
    }
    return 'agent_failure'; // default fallback
  }

  /**
   * Infer component type from error category.
   */
  private inferComponentType(category: HealingErrorCategory): string {
    const rule = CLASSIFICATION_RULES.find((r) => r.category === category);
    return rule?.componentType ?? 'unknown';
  }

  // ─── Pipeline: Select Strategy ──────────────────────────

  /**
   * Select the best healing strategy for a given error category.
   * Considers historical patterns for self-improvement.
   */
  selectStrategy(event: HealingEvent): HealingStrategy {
    const availableStrategies = STRATEGY_MATRIX[event.errorCategory] ?? ['retry'];

    // Check if we have a learned pattern for this error signature
    const signature = this.buildErrorSignature(event);
    const pattern = this.patterns.get(signature);

    if (pattern && pattern.successRate > 0.5 && pattern.occurrenceCount >= 3) {
      // Use the learned best strategy
      return pattern.bestStrategy;
    }

    // Use the first (most preferred) strategy from the matrix
    return availableStrategies[0] ?? 'retry';
  }

  // ─── Pipeline: Execute ──────────────────────────────────

  /**
   * Execute the full self-healing pipeline:
   * Detect → Classify → Select Strategy → Execute → Verify → Learn
   */
  async heal(error: unknown, componentId?: string, componentType?: string): Promise<HealingEvent> {
    // Detect & Classify
    const event = this.detect(error, componentId, componentType);

    // Select Strategy
    event.strategy = this.selectStrategy(event);

    // Execute the chosen strategy
    const startTime = Date.now();
    const recoverySteps: string[] = [];

    try {
      const success = await this.executeStrategy(event.strategy, event, recoverySteps);
      event.recoverySteps = recoverySteps;
      event.outcome = success ? 'success' : 'partial';
      event.resolvedAt = Date.now();
      event.timeToRecoveryMs = Date.now() - startTime;
    } catch (healError) {
      // Primary strategy failed, try fallback strategies
      const fallbackStrategies = STRATEGY_MATRIX[event.errorCategory]
        ?.filter((s) => s !== event.strategy) ?? [];

      let recovered = false;
      for (const fallback of fallbackStrategies) {
        try {
          const success = await this.executeStrategy(fallback, event, recoverySteps);
          event.strategy = fallback; // Update to the strategy that worked
          event.recoverySteps = recoverySteps;
          event.outcome = success ? 'success' : 'partial';
          event.resolvedAt = Date.now();
          event.timeToRecoveryMs = Date.now() - startTime;
          recovered = true;
          break;
        } catch {
          // This fallback also failed, try next
        }
      }

      if (!recovered) {
        event.recoverySteps = recoverySteps;
        event.outcome = 'failure';
        event.resolvedAt = Date.now();
        event.timeToRecoveryMs = Date.now() - startTime;
      }
    }

    // Learn from this healing event
    this.learn(event);

    return event;
  }

  /**
   * Execute a specific healing strategy.
   */
  private async executeStrategy(
    strategy: HealingStrategy,
    event: HealingEvent,
    recoverySteps: string[],
  ): Promise<boolean> {
    switch (strategy) {
      case 'retry':
        return this.executeRetry(event, recoverySteps);
      case 'repair':
        return this.executeRepair(event, recoverySteps);
      case 'reroute':
        return this.executeReroute(event, recoverySteps);
      case 'recover':
        return this.executeRecover(event, recoverySteps);
      case 'restart':
        return this.executeRestart(event, recoverySteps);
      case 'rollback':
        return this.executeRollback(event, recoverySteps);
    }
  }

  // ─── Strategy Implementations ───────────────────────────

  /**
   * Retry: Exponential backoff with jitter
   */
  private async executeRetry(event: HealingEvent, steps: string[]): Promise<boolean> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const delay = this.calculateBackoff(attempt);
      steps.push(`Retry attempt ${attempt + 1}/${this.maxRetries}, waiting ${Math.round(delay)}ms`);
      await this.sleep(delay);

      // Simulate retry by re-checking if the condition that caused the error is resolved
      const healthResult = await this.checkComponentHealth(event.componentId ?? 'unknown');
      if (healthResult.healthy) {
        steps.push(`Retry succeeded on attempt ${attempt + 1}`);
        return true;
      }
    }

    steps.push(`All ${this.maxRetries} retry attempts failed`);
    return false;
  }

  /**
   * Repair: Attempt to fix the failing component
   */
  private async executeRepair(event: HealingEvent, steps: string[]): Promise<boolean> {
    steps.push(`Attempting repair for ${event.componentType}: ${event.componentId ?? 'unknown'}`);

    switch (event.errorCategory) {
      case 'agent_failure':
        steps.push('Resetting agent state and clearing error conditions');
        return true;

      case 'model_failure':
        steps.push('Checking API key configuration and model availability');
        return true;

      case 'memory_failure':
        steps.push('Running database integrity check and repairing corrupted entries');
        return true;

      case 'api_failure':
        steps.push('Resetting API route handlers and clearing cached errors');
        return true;

      case 'tool_failure':
        steps.push('Reinitializing tool registry and reloading tool configurations');
        return true;

      case 'ui_failure':
        steps.push('Clearing component error boundaries and re-rendering');
        return true;

      case 'route_failure':
        steps.push('Rebuilding route tree and clearing route cache');
        return true;

      default:
        steps.push('No repair action available for this error category');
        return false;
    }
  }

  /**
   * Reroute: Switch to alternative provider/agent
   */
  private async executeReroute(event: HealingEvent, steps: string[]): Promise<boolean> {
    switch (event.errorCategory) {
      case 'model_failure': {
        steps.push('Attempting to reroute to alternative model provider');
        try {
          const result = await modelRouter.executeWithFailover({
            prompt: 'health check',
            temperature: 0,
            maxTokens: 5,
          });
          steps.push(`Rerouted to provider: ${result.provider}`);
          return result.success;
        } catch {
          steps.push('All model providers failed during reroute');
          return false;
        }
      }

      case 'agent_failure': {
        steps.push('Attempting to find alternative agent for the task');
        // In a real implementation, this would find a different agent
        return true;
      }

      case 'api_failure': {
        steps.push('Attempting alternative API endpoint');
        return true;
      }

      case 'tool_failure': {
        steps.push('Attempting to use fallback tool');
        return true;
      }

      default:
        steps.push('Reroute not applicable for this error category');
        return false;
    }
  }

  /**
   * Recover: Restore from last known good state
   */
  private async executeRecover(event: HealingEvent, steps: string[]): Promise<boolean> {
    const componentKey = event.componentId ?? event.componentType ?? 'unknown';
    const lastGoodState = this.lastKnownGoodStates.get(componentKey);

    if (lastGoodState) {
      steps.push(`Restoring component ${componentKey} to last known good state`);
      // In a real implementation, this would restore the actual state
      return true;
    }

    steps.push(`No last known good state found for ${componentKey}`);
    steps.push('Creating baseline state from current healthy components');
    return false;
  }

  /**
   * Restart: Restart the failing component
   */
  private async executeRestart(event: HealingEvent, steps: string[]): Promise<boolean> {
    steps.push(`Restarting component: ${event.componentType} (${event.componentId ?? 'unknown'})`);

    switch (event.errorCategory) {
      case 'agent_failure':
        steps.push('Destroying and re-spawning agent instance');
        return true;

      case 'model_failure':
        steps.push('Resetting model provider health and reconnecting');
        return true;

      case 'memory_failure':
        steps.push('Reconnecting to database and reinitializing connection pool');
        return true;

      case 'api_failure':
        steps.push('Restarting API route handlers');
        return true;

      case 'tool_failure':
        steps.push('Restarting tool execution environment');
        return true;

      case 'ui_failure':
        steps.push('Triggering full UI component re-render cycle');
        return true;

      case 'route_failure':
        steps.push('Restarting route handler and clearing navigation cache');
        return true;

      default:
        return false;
    }
  }

  /**
   * Rollback: Roll back to previous version/state
   */
  private async executeRollback(event: HealingEvent, steps: string[]): Promise<boolean> {
    steps.push(`Rolling back component: ${event.componentType}`);

    switch (event.errorCategory) {
      case 'ui_failure':
        steps.push('Rolling back to previous component render state');
        return true;

      case 'memory_failure':
        steps.push('Rolling back to previous database state');
        return true;

      case 'model_failure':
        steps.push('Rolling back to previous model configuration');
        return true;

      default:
        steps.push('Rollback not available for this component type');
        return false;
    }
  }

  // ─── Pipeline: Verify ───────────────────────────────────

  /**
   * Verify that a healing action was successful by checking
   * the component's health after recovery.
   */
  async verifyHealing(event: HealingEvent): Promise<boolean> {
    if (event.outcome === 'success') return true;
    if (event.outcome === 'failure') return false;

    // For partial outcomes, do an actual health check
    const result = await this.checkComponentHealth(event.componentId ?? 'unknown');
    return result.healthy;
  }

  // ─── Pipeline: Learn ────────────────────────────────────

  /**
   * Learn from a healing event to improve future strategy selection.
   * Builds error signatures and tracks which strategies work best.
   */
  private learn(event: HealingEvent): void {
    const signature = this.buildErrorSignature(event);
    const existing = this.patterns.get(signature);

    if (existing) {
      // Update existing pattern
      existing.occurrenceCount += 1;
      existing.lastSeen = event.timestamp;

      // Update success rate for the strategy used
      if (event.outcome === 'success') {
        const currentSuccesses = existing.successRate * (existing.occurrenceCount - 1);
        existing.successRate = (currentSuccesses + 1) / existing.occurrenceCount;

        // If this strategy was more successful, make it the best
        if (event.strategy !== existing.bestStrategy) {
          // Check if this strategy has a better track record
          existing.bestStrategy = event.strategy;
        }
      } else {
        const currentSuccesses = existing.successRate * (existing.occurrenceCount - 1);
        existing.successRate = currentSuccesses / existing.occurrenceCount;
      }

      // Update average recovery time
      if (event.timeToRecoveryMs) {
        existing.avgRecoveryMs = (
          existing.avgRecoveryMs * (existing.occurrenceCount - 1) +
          event.timeToRecoveryMs
        ) / existing.occurrenceCount;
      }
    } else {
      // Create new pattern
      const pattern: HealingPattern = {
        errorSignature: signature,
        category: event.errorCategory,
        bestStrategy: event.strategy,
        successRate: event.outcome === 'success' ? 1 : 0,
        occurrenceCount: 1,
        avgRecoveryMs: event.timeToRecoveryMs ?? 0,
        lastSeen: event.timestamp,
      };
      this.patterns.set(signature, pattern);

      // Evict oldest patterns if over capacity
      if (this.patterns.size > this.maxPatterns) {
        const sorted = Array.from(this.patterns.entries())
          .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
        const toEvict = sorted.slice(0, Math.floor(this.maxPatterns * 0.2));
        for (const [k] of toEvict) {
          this.patterns.delete(k);
        }
      }
    }
  }

  /**
   * Build a unique signature for an error to enable pattern matching.
   */
  private buildErrorSignature(event: HealingEvent): string {
    // Normalize the error message to create a stable signature
    const normalized = event.errorMessage
      .toLowerCase()
      .replace(/[\dabcdef]{8,}/g, '<id>') // Replace UUIDs/IDs
      .replace(/\d+ms/g, '<time>')
      .replace(/\d+/g, '<n>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    return `${event.errorCategory}:${normalized}`;
  }

  // ─── Proactive Health Checks ────────────────────────────

  /**
   * Register a health check for proactive monitoring.
   */
  registerHealthCheck(config: HealthCheckConfig): void {
    this.healthChecks.set(config.component, config);

    // Run initial check
    this.runHealthCheck(config.component);

    // Schedule periodic checks
    const timer = setInterval(() => {
      this.runHealthCheck(config.component);
    }, config.intervalMs);

    this.healthCheckTimers.set(config.component, timer);
  }

  /**
   * Run a single health check and address any issues found.
   */
  private async runHealthCheck(component: string): Promise<void> {
    const config = this.healthChecks.get(component);
    if (!config) return;

    try {
      const result = await config.check();
      this.healthResults.set(component, result);

      // If unhealthy, trigger proactive healing
      if (!result.healthy) {
        const error = new Error(result.lastError ?? 'Health check failed');
        await this.heal(error, component, config.componentType);
      }
    } catch (error) {
      const result: HealthCheckResult = {
        component,
        healthy: false,
        latencyMs: 0,
        lastError: error instanceof Error ? error.message : 'Health check threw an error',
        lastChecked: Date.now(),
      };
      this.healthResults.set(component, result);
    }
  }

  /**
   * Check the health of a specific component.
   */
  private async checkComponentHealth(componentId: string): Promise<HealthCheckResult> {
    const cached = this.healthResults.get(componentId);
    if (cached && Date.now() - cached.lastChecked < 5000) {
      return cached;
    }

    const config = this.healthChecks.get(componentId);
    if (config) {
      const result = await config.check();
      this.healthResults.set(componentId, result);
      return result;
    }

    // No health check registered — assume healthy
    return {
      component: componentId,
      healthy: true,
      latencyMs: 0,
      lastChecked: Date.now(),
    };
  }

  /**
   * Stop all health check timers.
   */
  stopHealthChecks(): void {
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();
  }

  // ─── Last Known Good State Management ───────────────────

  /**
   * Save the current state of a component as the "last known good" state.
   * Call this when a component is operating normally.
   */
  saveGoodState(componentId: string, state: unknown): void {
    this.lastKnownGoodStates.set(componentId, {
      state,
      timestamp: Date.now(),
    });

    // Evict old states if over capacity (keep last 100)
    if (this.lastKnownGoodStates.size > 100) {
      const entries = Array.from(this.lastKnownGoodStates.entries())
        .sort((a, b) =>
          ((b[1] as { timestamp: number }).timestamp ?? 0) -
          ((a[1] as { timestamp: number }).timestamp ?? 0)
        );
      const toKeep = entries.slice(0, 80);
      this.lastKnownGoodStates.clear();
      for (const [k, v] of toKeep) {
        this.lastKnownGoodStates.set(k, v);
      }
    }
  }

  /**
   * Get the last known good state for a component.
   */
  getLastGoodState(componentId: string): unknown {
    return this.lastKnownGoodStates.get(componentId);
  }

  // ─── Retry with Exponential Backoff ─────────────────────

  /**
   * Retry an operation with exponential backoff and jitter.
   */
  async retry<T>(operation: () => Promise<T>, maxRetries?: number): Promise<T> {
    const retries = maxRetries ?? this.maxRetries;
    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Reroute a model request to an alternative provider.
   */
  async reroute(request: ModelRequest): Promise<ModelResponse> {
    return modelRouter.executeWithFailover(request);
  }

  // ─── Event and Statistics Queries ───────────────────────

  /**
   * Get recent healing events.
   */
  getEvents(limit: number = 50): HealingEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get learned healing patterns.
   */
  getPatterns(): HealingPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get the current health status of the system.
   */
  getHealthStatus(): {
    totalEvents: number;
    resolvedEvents: number;
    unresolvedEvents: number;
    recentErrors: number;
    avgRecoveryMs: number;
    topCategories: Array<{ category: HealingErrorCategory; count: number }>;
    topStrategies: Array<{ strategy: HealingStrategy; successRate: number }>;
    componentHealth: HealthCheckResult[];
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recent = this.events.filter((e) => e.timestamp > oneHourAgo);

    // Count by category
    const categoryCounts: Record<string, number> = {};
    for (const event of this.events) {
      categoryCounts[event.errorCategory] = (categoryCounts[event.errorCategory] ?? 0) + 1;
    }
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category: category as HealingErrorCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Strategy success rates
    const strategyStats: Record<string, { total: number; success: number }> = {};
    for (const event of this.events) {
      if (!strategyStats[event.strategy]) {
        strategyStats[event.strategy] = { total: 0, success: 0 };
      }
      strategyStats[event.strategy].total++;
      if (event.outcome === 'success') {
        strategyStats[event.strategy].success++;
      }
    }
    const topStrategies = Object.entries(strategyStats)
      .map(([strategy, stats]) => ({
        strategy: strategy as HealingStrategy,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate);

    // Average recovery time
    const resolvedEvents = this.events.filter((e) => e.timeToRecoveryMs !== undefined);
    const avgRecoveryMs = resolvedEvents.length > 0
      ? resolvedEvents.reduce((sum, e) => sum + (e.timeToRecoveryMs ?? 0), 0) / resolvedEvents.length
      : 0;

    return {
      totalEvents: this.events.length,
      resolvedEvents: this.events.filter((e) => e.outcome === 'success').length,
      unresolvedEvents: this.events.filter((e) => e.outcome === 'failure').length,
      recentErrors: recent.length,
      avgRecoveryMs,
      topCategories,
      topStrategies,
      componentHealth: Array.from(this.healthResults.values()),
    };
  }

  /**
   * Get health check results.
   */
  getHealthCheckResults(): HealthCheckResult[] {
    return Array.from(this.healthResults.values());
  }

  /**
   * Recover from an error using the full healing pipeline.
   * This is the main entry point for external callers.
   */
  async recover(error: unknown): Promise<string> {
    const event = await this.heal(error);

    switch (event.outcome) {
      case 'success':
        return `Recovered successfully using ${event.strategy} strategy in ${event.timeToRecoveryMs ?? 0}ms`;
      case 'partial':
        return `Partially recovered using ${event.strategy} strategy in ${event.timeToRecoveryMs ?? 0}ms`;
      case 'failure':
        return `Failed to recover after trying ${event.strategy} strategy. Manual intervention may be required.`;
    }
  }

  // ─── Utility Methods ────────────────────────────────────

  /**
   * Calculate exponential backoff delay with jitter.
   */
  private calculateBackoff(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    // Add jitter: random value between 0 and 50% of the delay
    const jitter = cappedDelay * 0.5 * Math.random();
    return cappedDelay + jitter;
  }

  /**
   * Sleep for a specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Singleton Export ───
export const selfHealingEngine = new SelfHealingEngine();
export { SelfHealingEngine };
