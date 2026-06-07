// ============================================================
// Agentic OS V2 — Agentic Kernel (Central Orchestrator)
// Minimal Core Architecture with Lazy Subsystem Loading
// ============================================================
// The kernel core only contains: EventBus, StateManager,
// Scheduler, Registries (lazy), PermissionEngine, SecurityEngine.
// All other subsystems are loaded on-demand via lazy getters.
// ============================================================

import type {
  KernelStatus,
  KernelState,
  ScheduledTask,
  KernelEvent,
  AuditLogEntry,
  BrainOverlayType,
  SwarmRole,
  AgentConfig,
  ModelProviderConfig,
  ArtifactData,
} from './types';

// ─── Utility ───
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// 1. EVENT BUS — Pub/Sub with wildcard support
// ============================================================
class EventBus {
  private handlers: Map<string, Set<(...args: unknown[]) => unknown>> = new Map();
  private eventLog: KernelEvent[] = [];
  private maxLogSize = 1000;

  /**
   * Emit an event to all matching handlers.
   * Supports wildcard patterns: `agent:*` matches `agent:spawn`, `agent:complete`, etc.
   */
  emit(event: string, data: unknown): void {
    const loggedEvent: KernelEvent = {
      id: generateId('evt'),
      type: event,
      data,
      timestamp: Date.now(),
    };
    this.eventLog.push(loggedEvent);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Exact match handlers
    const exact = this.handlers.get(event);
    if (exact) {
      for (const handler of exact) {
        try {
          handler(data, loggedEvent);
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        }
      }
    }

    // Wildcard match handlers (e.g. "agent:*" matches "agent:spawn")
    for (const [pattern, handlers] of this.handlers.entries()) {
      if (pattern === event) continue; // already handled
      if (this.matchesWildcard(pattern, event)) {
        for (const handler of handlers) {
          try {
            handler(data, loggedEvent);
          } catch (err) {
            console.error(`[EventBus] Error in wildcard handler "${pattern}" for "${event}":`, err);
          }
        }
      }
    }
  }

  /**
   * Subscribe to an event. Supports wildcard patterns like `agent:*` or `model:*`.
   */
  on(event: string, handler: (...args: unknown[]) => unknown): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe a handler from an event.
   */
  off(event: string, handler: (...args: unknown[]) => unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Get recent event log entries.
   */
  getEventLog(limit: number = 100): KernelEvent[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Total number of events emitted.
   */
  get totalEvents(): number {
    return this.eventLog.length;
  }

  /**
   * Clear old events from the log, keeping only the most recent `keep` entries.
   */
  trimEvents(keep: number = 500): number {
    if (this.eventLog.length <= keep) return 0;
    const removed = this.eventLog.length - keep;
    this.eventLog = this.eventLog.slice(-keep);
    return removed;
  }

  /**
   * Check if a wildcard pattern matches an event string.
   * Only supports trailing `*` (e.g. `agent:*` matches `agent:spawn`).
   */
  private matchesWildcard(pattern: string, event: string): boolean {
    if (!pattern.includes('*')) return false;
    const prefix = pattern.slice(0, pattern.indexOf('*'));
    return event.startsWith(prefix);
  }
}

// ============================================================
// 2. STATE MANAGER — Centralized state with reactive updates
// ============================================================
class StateManager {
  private state: Map<string, unknown> = new Map();
  private subscribers: Map<string, Set<(...args: unknown[]) => unknown>> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Get a value from the state store.
   */
  getState(key: string): unknown {
    return this.state.get(key);
  }

  /**
   * Set a value in the state store. Notifies subscribers and emits
   * a `state:change` event on the Event Bus.
   */
  setState(key: string, value: unknown): void {
    const previous = this.state.get(key);
    this.state.set(key, value);

    // Notify key-specific subscribers
    const subs = this.subscribers.get(key);
    if (subs) {
      for (const cb of subs) {
        try {
          cb(value, previous);
        } catch (err) {
          console.error(`[StateManager] Subscriber error for key "${key}":`, err);
        }
      }
    }

    // Emit global state change event
    this.eventBus.emit('state:change', { key, value, previous });
  }

  /**
   * Subscribe to changes for a specific state key.
   */
  subscribe(key: string, callback: (...args: unknown[]) => unknown): void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);
  }

  /**
   * Unsubscribe from state changes.
   */
  unsubscribe(key: string, callback: (...args: unknown[]) => unknown): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        this.subscribers.delete(key);
      }
    }
  }

  /**
   * Get a snapshot of all state keys and values.
   */
  getSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    for (const [key, value] of this.state.entries()) {
      snapshot[key] = value;
    }
    return snapshot;
  }

  /**
   * Clear all state and subscribers.
   */
  clear(): void {
    this.state.clear();
    this.subscribers.clear();
  }
}

// ============================================================
// 3. SCHEDULER — Task scheduling with priority queues
// ============================================================
class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private processing = false;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Schedule a task. Tasks are processed by priority order (higher = sooner).
   */
  schedule(task: Omit<ScheduledTask, 'status' | 'createdAt'>): ScheduledTask {
    const scheduledTask: ScheduledTask = {
      ...task,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.tasks.set(task.id, scheduledTask);
    this.eventBus.emit('scheduler:scheduled', { taskId: task.id, name: task.name, priority: task.priority });

    // Auto-process if not already running
    this.processNext();

    return scheduledTask;
  }

  /**
   * Cancel a scheduled task (only if still pending).
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status !== 'pending') return false;

    task.status = 'failed';
    task.error = 'Cancelled';
    task.completedAt = Date.now();
    this.eventBus.emit('scheduler:cancelled', { taskId });
    return true;
  }

  /**
   * Get all tasks, optionally filtered by status.
   */
  getTasks(status?: ScheduledTask['status']): ScheduledTask[] {
    const all = Array.from(this.tasks.values());
    if (status) return all.filter((t) => t.status === status);
    return all;
  }

  /**
   * Get count of active (pending + running) tasks.
   */
  get activeTaskCount(): number {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'pending' || task.status === 'running') count++;
    }
    return count;
  }

  /**
   * Clean up completed/failed tasks older than the given age.
   */
  cleanupOldTasks(maxAgeMs: number = 300_000): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.completedAt &&
        now - task.completedAt > maxAgeMs
      ) {
        this.tasks.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Process the next highest-priority pending task.
   */
  private processNext(): void {
    if (this.processing) return;

    const pending = Array.from(this.tasks.values())
      .filter((t) => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority); // higher priority first

    if (pending.length === 0) return;

    const task = pending[0]!;
    this.processing = true;
    task.status = 'running';
    task.startedAt = Date.now();
    this.eventBus.emit('scheduler:started', { taskId: task.id, name: task.name });

    task.execute()
      .then((result) => {
        task.status = 'completed';
        task.completedAt = Date.now();
        this.eventBus.emit('scheduler:completed', { taskId: task.id, name: task.name, result });
      })
      .catch((error) => {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        task.completedAt = Date.now();
        this.eventBus.emit('scheduler:failed', { taskId: task.id, name: task.name, error: task.error });
      })
      .finally(() => {
        this.processing = false;
        // Process next task if any
        this.processNext();
      });
  }
}

// ============================================================
// 4. REGISTRIES — Central registry accessors (lazy delegates)
// ============================================================
interface RegistryEntry {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

class RegistryManager {
  private brainRegistry: Map<string, { name: string; overlay: BrainOverlayType; config: Record<string, unknown> }> = new Map();
  private modelRegistry: Map<string, ModelProviderConfig> = new Map();
  private toolRegistry: Map<string, { name: string; description: string; handler: (...args: unknown[]) => unknown; config: Record<string, unknown> }> = new Map();
  private skillRegistry: Map<string, { name: string; description: string; handler: (...args: unknown[]) => unknown; config: Record<string, unknown> }> = new Map();
  private artifactRegistry: Map<string, ArtifactData> = new Map();
  private eventBus: EventBus;

  // Lazy reference to agent-runtime — set during kernel init
  private _agentRegistry: any = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeDefaultRegistries();
  }

  /** Bind the agent registry (called lazily during kernel init step 4) */
  bindAgentRegistry(registry: any): void {
    this._agentRegistry = registry;
  }

  // ─── Agent Registry (delegates to agent-runtime, lazy) ───
  get agents(): AgentConfig[] {
    if (!this._agentRegistry) return [];
    return this._agentRegistry.list();
  }

  getAgent(id: string): AgentConfig | undefined {
    if (!this._agentRegistry) return undefined;
    return this._agentRegistry.get(id)?.getStatus();
  }

  // ─── Brain Registry ───
  registerBrain(id: string, name: string, overlay: BrainOverlayType, config: Record<string, unknown> = {}): void {
    this.brainRegistry.set(id, { name, overlay, config });
    this.eventBus.emit('registry:brain:registered', { id, name, overlay });
  }

  getBrains(): Array<{ id: string; name: string; overlay: BrainOverlayType; config: Record<string, unknown> }> {
    return Array.from(this.brainRegistry.entries()).map(([id, val]) => ({ id, ...val }));
  }

  get brainCount(): number {
    return this.brainRegistry.size;
  }

  // ─── Model Registry ───
  registerModel(config: ModelProviderConfig): void {
    this.modelRegistry.set(config.id, config);
    this.eventBus.emit('registry:model:registered', { id: config.id, provider: config.provider });
  }

  getModels(): ModelProviderConfig[] {
    return Array.from(this.modelRegistry.values());
  }

  get modelCount(): number {
    return this.modelRegistry.size;
  }

  // ─── Tool Registry ───
  registerTool(id: string, name: string, description: string, handler: (...args: unknown[]) => unknown, config: Record<string, unknown> = {}): void {
    this.toolRegistry.set(id, { name, description, handler, config });
    this.eventBus.emit('registry:tool:registered', { id, name });
  }

  getTools(): Array<{ id: string; name: string; description: string; config: Record<string, unknown> }> {
    return Array.from(this.toolRegistry.entries()).map(([id, val]) => ({
      id,
      name: val.name,
      description: val.description,
      config: val.config,
    }));
  }

  async executeTool(id: string, params: Record<string, unknown>): Promise<unknown> {
    const tool = this.toolRegistry.get(id);
    if (!tool) throw new Error(`Tool not found: ${id}`);
    this.eventBus.emit('registry:tool:executed', { id, name: tool.name });
    return tool.handler(params);
  }

  get toolCount(): number {
    return this.toolRegistry.size;
  }

  // ─── Skill Registry ───
  registerSkill(id: string, name: string, description: string, handler: (...args: unknown[]) => unknown, config: Record<string, unknown> = {}): void {
    this.skillRegistry.set(id, { name, description, handler, config });
    this.eventBus.emit('registry:skill:registered', { id, name });
  }

  getSkills(): Array<{ id: string; name: string; description: string; config: Record<string, unknown> }> {
    return Array.from(this.skillRegistry.entries()).map(([id, val]) => ({
      id,
      name: val.name,
      description: val.description,
      config: val.config,
    }));
  }

  async executeSkill(id: string, params: Record<string, unknown>): Promise<unknown> {
    const skill = this.skillRegistry.get(id);
    if (!skill) throw new Error(`Skill not found: ${id}`);
    this.eventBus.emit('registry:skill:executed', { id, name: skill.name });
    return skill.handler(params);
  }

  get skillCount(): number {
    return this.skillRegistry.size;
  }

  // ─── Artifact Registry ───
  registerArtifact(artifact: ArtifactData): void {
    this.artifactRegistry.set(artifact.id, artifact);
    this.eventBus.emit('registry:artifact:registered', { id: artifact.id, name: artifact.name, type: artifact.type });
  }

  getArtifacts(): ArtifactData[] {
    return Array.from(this.artifactRegistry.values());
  }

  get artifactCount(): number {
    return this.artifactRegistry.size;
  }

  // ─── Initialize with default entries ───
  private initializeDefaultRegistries(): void {
    // Register default brain overlays
    const defaultBrains: Array<{ name: string; overlay: BrainOverlayType }> = [
      { name: 'Default Brain', overlay: 'default' },
      { name: 'Claude Overlay', overlay: 'claude' },
      { name: 'Hermes Overlay', overlay: 'hermes' },
      { name: 'Research Overlay', overlay: 'research' },
      { name: 'Coding Overlay', overlay: 'coding' },
      { name: 'Architect Overlay', overlay: 'architect' },
      { name: 'Analyst Overlay', overlay: 'analyst' },
      { name: 'DevOps Overlay', overlay: 'devops' },
      { name: 'Security Overlay', overlay: 'security' },
      { name: 'Business Overlay', overlay: 'business' },
      { name: 'Recruitment Overlay', overlay: 'recruitment' },
      { name: 'Aviation Overlay', overlay: 'aviation' },
    ];

    for (let i = 0; i < defaultBrains.length; i++) {
      const b = defaultBrains[i]!;
      this.registerBrain(`brain-${b.overlay}`, b.name, b.overlay);
    }

    // Register default tools
    const defaultTools: Array<{ id: string; name: string; description: string }> = [
      { id: 'tool-web-search', name: 'Web Search', description: 'Search the web for information' },
      { id: 'tool-code-exec', name: 'Code Execution', description: 'Execute code in a sandboxed environment' },
      { id: 'tool-file-read', name: 'File Reader', description: 'Read file contents from the workspace' },
      { id: 'tool-file-write', name: 'File Writer', description: 'Write content to a file in the workspace' },
      { id: 'tool-api-call', name: 'API Caller', description: 'Make HTTP API calls to external services' },
      { id: 'tool-terminal', name: 'Terminal', description: 'Execute terminal commands' },
      { id: 'tool-memory-store', name: 'Memory Store', description: 'Store information in the memory graph' },
      { id: 'tool-memory-retrieve', name: 'Memory Retrieve', description: 'Retrieve information from the memory graph' },
    ];

    for (const t of defaultTools) {
      this.registerTool(
        t.id,
        t.name,
        t.description,
        async (params: Record<string, unknown>) => ({ tool: t.name, params, result: 'Tool executed (stub)' }),
      );
    }

    // Register default skills
    const defaultSkills: Array<{ id: string; name: string; description: string }> = [
      { id: 'skill-code-gen', name: 'Code Generation', description: 'Generate code from natural language descriptions' },
      { id: 'skill-code-review', name: 'Code Review', description: 'Review code for quality and best practices' },
      { id: 'skill-testing', name: 'Test Generation', description: 'Generate unit and integration tests' },
      { id: 'skill-documentation', name: 'Documentation', description: 'Generate documentation from code' },
      { id: 'skill-refactoring', name: 'Refactoring', description: 'Suggest and apply code refactoring' },
      { id: 'skill-deployment', name: 'Deployment', description: 'Deploy applications and services' },
      { id: 'skill-analysis', name: 'Data Analysis', description: 'Analyze data and generate reports' },
      { id: 'skill-research', name: 'Research', description: 'Conduct research and synthesize findings' },
    ];

    for (const s of defaultSkills) {
      this.registerSkill(
        s.id,
        s.name,
        s.description,
        async (params: Record<string, unknown>) => ({ skill: s.name, params, result: 'Skill executed (stub)' }),
      );
    }
  }
}

// ============================================================
// 5. PERMISSION ENGINE — Check permissions before operations
// ============================================================
interface PermissionRule {
  resource: string; // e.g. "agent", "model", "tool:terminal"
  action: string;   // e.g. "read", "write", "execute", "delete"
  effect: 'allow' | 'deny';
  condition?: (context: Record<string, unknown>) => boolean;
}

class PermissionEngine {
  private rules: PermissionRule[] = [];
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeDefaultRules();
  }

  /**
   * Check if an operation is permitted.
   * Returns true if an explicit 'allow' rule matches and no 'deny' rule overrides it.
   */
  checkPermission(resource: string, action: string, context: Record<string, unknown> = {}): boolean {
    // Check deny rules first (they take precedence)
    for (const rule of this.rules) {
      if (rule.effect === 'deny' && this.matchesRule(rule, resource, action, context)) {
        this.eventBus.emit('permission:denied', { resource, action, context, rule });
        return false;
      }
    }

    // Check allow rules
    for (const rule of this.rules) {
      if (rule.effect === 'allow' && this.matchesRule(rule, resource, action, context)) {
        this.eventBus.emit('permission:allowed', { resource, action, context, rule });
        return true;
      }
    }

    // Default deny if no rule matches
    this.eventBus.emit('permission:denied', { resource, action, context, reason: 'no_matching_rule' });
    return false;
  }

  /**
   * Add a permission rule.
   */
  addRule(rule: PermissionRule): void {
    this.rules.push(rule);
    this.eventBus.emit('permission:rule_added', { rule });
  }

  /**
   * Remove a permission rule by resource:action pattern.
   */
  removeRule(resource: string, action: string): void {
    this.rules = this.rules.filter((r) => !(r.resource === resource && r.action === action));
    this.eventBus.emit('permission:rule_removed', { resource, action });
  }

  /**
   * Get all current rules.
   */
  getRules(): PermissionRule[] {
    return [...this.rules];
  }

  private matchesRule(rule: PermissionRule, resource: string, action: string, context: Record<string, unknown>): boolean {
    // Support wildcard matching: "agent:*" matches any action on agent
    const resourceMatch = rule.resource === '*' || rule.resource === resource || this.wildcardMatch(rule.resource, resource);
    const actionMatch = rule.action === '*' || rule.action === action || this.wildcardMatch(rule.action, action);
    const conditionMatch = rule.condition ? rule.condition(context) : true;

    return resourceMatch && actionMatch && conditionMatch;
  }

  private wildcardMatch(pattern: string, value: string): boolean {
    if (!pattern.includes('*')) return pattern === value;
    const prefix = pattern.slice(0, pattern.indexOf('*'));
    return value.startsWith(prefix);
  }

  private initializeDefaultRules(): void {
    // Default: allow all read operations
    this.rules.push({ resource: '*', action: 'read', effect: 'allow' });

    // Default: allow agent operations
    this.rules.push({ resource: 'agent', action: '*', effect: 'allow' });

    // Default: allow model operations
    this.rules.push({ resource: 'model', action: '*', effect: 'allow' });

    // Default: allow brain operations
    this.rules.push({ resource: 'brain', action: '*', effect: 'allow' });

    // Default: allow memory operations
    this.rules.push({ resource: 'memory', action: '*', effect: 'allow' });

    // Default: allow tool execution
    this.rules.push({ resource: 'tool', action: 'execute', effect: 'allow' });

    // Default: allow skill execution
    this.rules.push({ resource: 'skill', action: 'execute', effect: 'allow' });

    // Default: allow artifact operations
    this.rules.push({ resource: 'artifact', action: '*', effect: 'allow' });

    // Default: allow swarm operations
    this.rules.push({ resource: 'swarm', action: '*', effect: 'allow' });

    // Default: deny kernel shutdown from non-admin context
    this.rules.push({
      resource: 'kernel',
      action: 'shutdown',
      effect: 'deny',
      condition: (ctx) => ctx.role !== 'admin',
    });

    // Default: allow kernel health/read operations
    this.rules.push({ resource: 'kernel', action: 'read', effect: 'allow' });
    this.rules.push({ resource: 'kernel', action: 'health', effect: 'allow' });
  }
}

// ============================================================
// 6. SECURITY ENGINE — Input sanitization, rate limiting, audit
// ============================================================
class SecurityEngine {
  private rateLimits: Map<string, { count: number; windowStart: number }> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private maxAuditLogSize = 5000;

  // Rate limiting configuration
  private defaultWindowMs = 60_000; // 1 minute
  private defaultMaxRequests = 100; // per window

  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Sanitize input by removing potentially dangerous content.
   */
  sanitize(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  }

  /**
   * Check rate limit for a source. Returns true if the request is allowed.
   */
  checkRateLimit(source: string, maxRequests?: number, windowMs?: number): boolean {
    const max = maxRequests ?? this.defaultMaxRequests;
    const window = windowMs ?? this.defaultWindowMs;
    const now = Date.now();

    const entry = this.rateLimits.get(source);
    if (!entry || now - entry.windowStart > window) {
      // Reset window
      this.rateLimits.set(source, { count: 1, windowStart: now });
      return true;
    }

    entry.count++;
    if (entry.count > max) {
      this.eventBus.emit('security:rate_limited', { source, count: entry.count, max });
      return false;
    }

    return true;
  }

  /**
   * Get current rate limit status for a source.
   */
  getRateLimitStatus(source: string): { count: number; remaining: number; resetAt: number } | null {
    const entry = this.rateLimits.get(source);
    if (!entry) return null;

    return {
      count: entry.count,
      remaining: Math.max(0, this.defaultMaxRequests - entry.count),
      resetAt: entry.windowStart + this.defaultWindowMs,
    };
  }

  /**
   * Log an audit entry.
   */
  auditLog(
    action: string,
    resource: string,
    result: 'allowed' | 'denied',
    metadata?: Record<string, unknown>,
  ): void {
    const entry: AuditLogEntry = {
      id: generateId('audit'),
      action,
      resource,
      result,
      timestamp: Date.now(),
      metadata,
    };

    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog.shift();
    }

    this.eventBus.emit('security:audit', entry);
  }

  /**
   * Get recent audit log entries.
   */
  getAuditLog(limit: number = 100): AuditLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Clear expired rate limit entries.
   */
  cleanupRateLimits(): number {
    const now = Date.now();
    let removed = 0;
    for (const [source, entry] of this.rateLimits.entries()) {
      if (now - entry.windowStart > this.defaultWindowMs * 2) {
        this.rateLimits.delete(source);
        removed++;
      }
    }
    return removed;
  }
}

// ============================================================
// 7. LAZY SUBSYSTEM LOADER — On-demand subsystem imports
// ============================================================
class LazySubsystemLoader {
  private cache: Map<string, unknown> = new Map();
  private loadTimestamps: Map<string, number> = new Map();

  /**
   * Lazy-load a subsystem module. Caches after first import.
   * Returns the named export from the module.
   */
  async load(modulePath: string, exportName: string): Promise<unknown> {
    const cacheKey = `${modulePath}:${exportName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const mod = await import(modulePath);
      const instance = mod[exportName];
      if (instance) {
        this.cache.set(cacheKey, instance);
        this.loadTimestamps.set(cacheKey, Date.now());
        return instance;
      }
      return null;
    } catch (err) {
      console.warn(`[LazyLoader] Failed to load ${exportName} from ${modulePath}:`, err);
      return null;
    }
  }

  /**
   * Synchronous lazy-load attempt using require (for backward compat
   * with code that expects synchronous access). Caches after first require.
   */
  loadSync(modulePath: string, exportName: string): unknown {
    const cacheKey = `${modulePath}:${exportName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(modulePath);
      const instance = mod[exportName];
      if (instance) {
        this.cache.set(cacheKey, instance);
        this.loadTimestamps.set(cacheKey, Date.now());
        return instance;
      }
      return null;
    } catch (err) {
      console.warn(`[LazyLoader] Failed to sync-load ${exportName} from ${modulePath}:`, err);
      return null;
    }
  }

  /**
   * Check if a subsystem has been loaded.
   */
  isLoaded(modulePath: string, exportName: string): boolean {
    return this.cache.has(`${modulePath}:${exportName}`);
  }

  /**
   * Get the timestamp when a subsystem was loaded.
   */
  getLoadTime(modulePath: string, exportName: string): number | null {
    return this.loadTimestamps.get(`${modulePath}:${exportName}`) ?? null;
  }

  /**
   * Get list of all loaded subsystems.
   */
  getLoadedSubsystems(): Array<{ modulePath: string; exportName: string; loadedAt: number }> {
    const result: Array<{ modulePath: string; exportName: string; loadedAt: number }> = [];
    for (const [key, timestamp] of this.loadTimestamps.entries()) {
      const [modulePath, exportName] = key.split(':');
      result.push({ modulePath: modulePath!, exportName: exportName!, loadedAt: timestamp });
    }
    return result;
  }
}

// ============================================================
// 8. INIT STEP TIMING TRACKER
// ============================================================
interface InitStepTiming {
  step: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

// ============================================================
// 9. AGENTIC KERNEL — Lifecycle management & orchestration
// ============================================================
class AgenticKernel {
  // ─── Core subsystems (always loaded) ───
  readonly eventBus: EventBus;
  readonly stateManager: StateManager;
  readonly scheduler: Scheduler;
  readonly registries: RegistryManager;
  readonly permissions: PermissionEngine;
  readonly security: SecurityEngine;

  // ─── Lifecycle state ───
  private _status: KernelStatus = 'stopped';
  private _initializedAt: number | null = null;

  // ─── Performance tracking ───
  private initStartTime: number = 0;
  private initEndTime: number = 0;
  private initStepTimings: InitStepTiming[] = [];

  // ─── Lazy subsystem loader ───
  private lazyLoader: LazySubsystemLoader;

  // ─── Maintenance cycle ───
  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;

  // ─── Cached lazy subsystem references (populated on first access or during init) ───
  private _agentRegistry: any = null;
  private _modelRouter: any = null;
  private _memoryEngine: any = null;
  private _brainEngine: any = null;
  private _observabilityEngine: any = null;
  private _selfHealingEngine: any = null;
  private _swarmEngine: any = null;
  private _memoryOptimizer: any = null;
  private _db: any = null;
  private _geminiCLIDiscovery: any = null;
  private _knowledgeEngine: any = null;

  constructor() {
    this.eventBus = new EventBus();
    this.stateManager = new StateManager(this.eventBus);
    this.scheduler = new Scheduler(this.eventBus);
    this.registries = new RegistryManager(this.eventBus);
    this.permissions = new PermissionEngine(this.eventBus);
    this.security = new SecurityEngine(this.eventBus);
    this.lazyLoader = new LazySubsystemLoader();
  }

  // ────────────────────────────────────────────────────────
  // LAZY SUBSYSTEM GETTERS
  // ────────────────────────────────────────────────────────

  /**
   * Lazy getter for agent-runtime.
   * Loads on first access; returns cached instance afterwards.
   */
  get agentRuntime(): any {
    if (!this._agentRegistry) {
      this._agentRegistry = this.lazyLoader.loadSync('./agent-runtime', 'agentRegistry');
    }
    return this._agentRegistry;
  }

  /**
   * Lazy getter for model-router.
   */
  get modelRouter(): any {
    if (!this._modelRouter) {
      this._modelRouter = this.lazyLoader.loadSync('./model-router', 'modelRouter');
    }
    return this._modelRouter;
  }

  /**
   * Lazy getter for memory-engine.
   */
  get memoryEngine(): any {
    if (!this._memoryEngine) {
      this._memoryEngine = this.lazyLoader.loadSync('./memory-engine', 'memoryEngine');
    }
    return this._memoryEngine;
  }

  /**
   * Lazy getter for brain-engine.
   */
  get brainEngine(): any {
    if (!this._brainEngine) {
      this._brainEngine = this.lazyLoader.loadSync('./brain-engine', 'brainEngine');
    }
    return this._brainEngine;
  }

  /**
   * Lazy getter for observability engine.
   */
  get observabilityEngine(): any {
    if (!this._observabilityEngine) {
      this._observabilityEngine = this.lazyLoader.loadSync('./observability', 'observabilityEngine');
    }
    return this._observabilityEngine;
  }

  /**
   * Lazy getter for self-healing engine.
   */
  get selfHealingEngine(): any {
    if (!this._selfHealingEngine) {
      this._selfHealingEngine = this.lazyLoader.loadSync('./self-healing', 'selfHealingEngine');
    }
    return this._selfHealingEngine;
  }

  /**
   * Lazy getter for swarm-engine.
   */
  get swarmEngine(): any {
    if (!this._swarmEngine) {
      this._swarmEngine = this.lazyLoader.loadSync('./swarm-engine', 'swarmEngine');
    }
    return this._swarmEngine;
  }

  /**
   * Lazy getter for memory-optimizer (NEW).
   */
  get memoryOptimizer(): any {
    if (!this._memoryOptimizer) {
      this._memoryOptimizer = this.lazyLoader.loadSync('./memory-optimizer', 'memoryOptimizer');
    }
    return this._memoryOptimizer;
  }

  /**
   * Lazy getter for database client.
   */
  get db(): any {
    if (!this._db) {
      this._db = this.lazyLoader.loadSync('./db', 'db');
    }
    return this._db;
  }

  /**
   * Lazy getter for Gemini CLI discovery.
   */
  get geminiCLIDiscovery(): any {
    if (!this._geminiCLIDiscovery) {
      this._geminiCLIDiscovery = this.lazyLoader.loadSync('./gemini-cli-discovery', 'geminiCLIDiscovery');
    }
    return this._geminiCLIDiscovery;
  }

  /**
   * Lazy getter for knowledge-engine (optional — may not exist).
   */
  get knowledgeEngine(): any {
    if (!this._knowledgeEngine) {
      this._knowledgeEngine = this.lazyLoader.loadSync('./knowledge-engine', 'knowledgeEngine');
    }
    return this._knowledgeEngine;
  }

  // ─── Backward-compatible aliases (match old public API) ───

  /** @deprecated Use agentRuntime for clarity; kept for backward compat */
  get agentRegistry(): any {
    return this.agentRuntime;
  }

  // ────────────────────────────────────────────────────────
  // LIFECYCLE
  // ────────────────────────────────────────────────────────

  /**
   * Initialize the kernel using the 6-step validation pipeline.
   * Each step has a timeout and failure doesn't block subsequent steps.
   *
   * Step 1: Database connection (optional, non-blocking)
   * Step 2: Core subsystems load (EventBus, StateManager, Scheduler, Security)
   * Step 3: Model Router init (lazy, only loads default provider)
   * Step 4: Agent Runtime init (lazy, only registers descriptors)
   * Step 5: Memory Engine init
   * Step 6: Gemini CLI Discovery (non-blocking)
   */
  async init(): Promise<void> {
    if (this._status === 'running' || this._status === 'initializing') {
      console.warn('[Kernel] Already initialized or initializing');
      return;
    }

    this._status = 'initializing';
    this.initStartTime = Date.now();
    this.initStepTimings = [];
    this.eventBus.emit('kernel:initializing', {});

    try {
      // ─── Step 1: Database connection (optional, non-blocking) ───
      await this.runInitStep('database', async () => {
        try {
          const database = this.db;
          if (database) {
            await database.$connect();
            console.log('[Kernel] Step 1: Database connected');
          }
        } catch (err) {
          console.warn('[Kernel] Step 1: Database connection failed (continuing with stub):', err);
          throw err; // Re-throw so step records as failed but pipeline continues
        }
      }, 5000);

      // ─── Step 2: Core subsystems (already loaded in constructor) ───
      await this.runInitStep('core_subsystems', async () => {
        this.stateManager.setState('kernel.status', 'initializing');
        this.stateManager.setState('kernel.startedAt', Date.now());
        console.log('[Kernel] Step 2: Core subsystems ready (EventBus, StateManager, Scheduler, Security)');
      }, 2000);

      // ─── Step 3: Model Router init (lazy, only loads default provider) ───
      await this.runInitStep('model_router', async () => {
        const router = this.modelRouter;
        if (router) {
          // Model router self-initializes in constructor — just verify it's available
          console.log('[Kernel] Step 3: Model Router initialized (lazy load)');
        } else {
          throw new Error('Model Router not available');
        }
      }, 3000);

      // ─── Step 4: Agent Runtime init (lazy, only registers descriptors) ───
      await this.runInitStep('agent_runtime', async () => {
        const registry = this.agentRuntime;
        if (registry) {
          // Bind the agent registry to the RegistryManager for lazy delegation
          this.registries.bindAgentRegistry(registry);
          console.log('[Kernel] Step 4: Agent Runtime initialized (lazy load, descriptors registered)');
        } else {
          throw new Error('Agent Runtime not available');
        }
      }, 3000);

      // ─── Step 5: Memory Engine init ───
      await this.runInitStep('memory_engine', async () => {
        const memory = this.memoryEngine;
        if (memory) {
          console.log('[Kernel] Step 5: Memory Engine initialized (lazy load)');
        } else {
          throw new Error('Memory Engine not available');
        }
      }, 3000);

      // ─── Step 6: Gemini CLI Discovery (non-blocking) ───
      await this.runInitStep('gemini_cli_discovery', async () => {
        const discovery = this.geminiCLIDiscovery;
        if (discovery) {
          try {
            console.log('[Kernel] Step 6: Starting Gemini CLI auto-discovery...');
            this.eventBus.emit('gemini-cli:discovering', {});

            const cliState = await discovery.discover();

            if (cliState.discovery.status === 'available' && cliState.health.available) {
              // CLI found and validated — register with model router
              const router = this.modelRouter;
              if (router) {
                router.markProviderValidated('gemini-cli');

                const bestModel = discovery.selectBestModel('balanced');
                if (bestModel) {
                  router.updateDynamicModel('gemini-cli', bestModel.id, bestModel.contextWindow);
                }

                // Register discovered models in the kernel model registry
                for (const model of cliState.models) {
                  this.registries.registerModel({
                    id: `gemini-cli-${model.id}`,
                    name: model.name,
                    provider: 'gemini-cli',
                    enabled: model.status === 'available',
                    priority: cliState.routingPriority,
                    config: {
                      modelId: model.id,
                      contextWindow: model.contextWindow,
                      capabilities: model.capabilities,
                      mode: cliState.mode,
                      executablePath: cliState.discovery.executablePath,
                      version: cliState.discovery.version,
                    },
                  });
                }
              }

              console.log(`[Kernel] Step 6: Gemini CLI discovered: ${cliState.discovery.version} at ${cliState.discovery.executablePath}`);
              this.eventBus.emit('gemini-cli:discovered', {
                version: cliState.discovery.version,
                executablePath: cliState.discovery.executablePath,
                models: cliState.models.map((m: any) => m.id),
                healthScore: cliState.health.healthScore,
              });
            } else {
              // CLI not available — mark provider as degraded in router
              const router = this.modelRouter;
              if (router) {
                router.markProviderDegraded('gemini-cli', cliState.health.degradationReason ?? 'Not found');
              }
              console.log('[Kernel] Step 6: Gemini CLI not available — using Gemini API fallback');
              this.eventBus.emit('gemini-cli:unavailable', {
                reason: cliState.health.degradationReason,
              });
            }

            // Wire up Gemini CLI discovery events to model router
            discovery.on('health:recovered', () => {
              const router = this.modelRouter;
              if (router) {
                router.markProviderValidated('gemini-cli');
                const bestModel = discovery.selectBestModel('balanced');
                if (bestModel) {
                  router.updateDynamicModel('gemini-cli', bestModel.id, bestModel.contextWindow);
                }
                console.log('[Kernel] Gemini CLI recovered — routing restored');
              }
            });

            discovery.on('health:degraded', () => {
              const router = this.modelRouter;
              if (router) {
                router.markProviderDegraded('gemini-cli');
                console.log('[Kernel] Gemini CLI degraded — failing over to Gemini API');
              }
            });
          } catch (err) {
            // Discovery failure should not block kernel startup
            console.warn('[Kernel] Step 6: Gemini CLI discovery failed (non-blocking):', err);
            const router = this.modelRouter;
            if (router) {
              router.markProviderDegraded('gemini-cli', 'Discovery error');
            }
            this.eventBus.emit('gemini-cli:error', { error: err });
          }
        } else {
          console.warn('[Kernel] Step 6: Gemini CLI Discovery not available');
        }
      }, 10000); // Longer timeout for discovery (involves shell commands)

      // ─── Mark as running ───
      this._status = 'running';
      this._initializedAt = Date.now();
      this.initEndTime = Date.now();
      this.stateManager.setState('kernel.status', 'running');

      // Track observability metric if available
      try {
        const obs = this.observabilityEngine;
        if (obs) {
          obs.trackMetric('kernel_init', 1, { status: 'success' });
        }
      } catch {
        // Non-critical
      }

      // ─── Emit performance event ───
      const totalInitMs = this.initEndTime - this.initStartTime;
      this.eventBus.emit('kernel:performance', {
        initStartTime: this.initStartTime,
        initEndTime: this.initEndTime,
        totalInitMs,
        coldStartTarget: 3000,
        coldStartOnTarget: totalInitMs < 3000,
        stepTimings: this.initStepTimings.map((t) => ({
          step: t.step,
          durationMs: t.durationMs,
          success: t.success,
        })),
        loadedSubsystems: this.lazyLoader.getLoadedSubsystems(),
      });

      this.eventBus.emit('kernel:initialized', {
        uptime: 0,
        registryCounts: this.getRegistryCounts(),
        initDurationMs: totalInitMs,
      });

      console.log(`[Kernel] Agentic Kernel initialized successfully in ${totalInitMs}ms (target: <3000ms)`);
    } catch (error) {
      this._status = 'stopped';
      this.initEndTime = Date.now();
      this.stateManager.setState('kernel.status', 'error');
      this.eventBus.emit('kernel:init_failed', { error });

      // Track observability metric if available
      try {
        const obs = this.observabilityEngine;
        if (obs) {
          obs.trackMetric('kernel_init', 0, { status: 'failed' });
        }
      } catch {
        // Non-critical
      }

      console.error('[Kernel] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Gracefully shut down the kernel and all subsystems.
   */
  async shutdown(): Promise<void> {
    if (this._status !== 'running') {
      console.warn('[Kernel] Not running, cannot shut down');
      return;
    }

    this._status = 'shutting_down';
    this.stateManager.setState('kernel.status', 'shutting_down');
    this.eventBus.emit('kernel:shutting_down', {});

    try {
      // Stop maintenance cycle
      this.stopMaintenanceCycle();

      // Cancel all pending tasks
      const pendingTasks = this.scheduler.getTasks('pending');
      for (const task of pendingTasks) {
        this.scheduler.cancel(task.id);
      }

      // Wait for running tasks (with timeout)
      const runningTasks = this.scheduler.getTasks('running');
      if (runningTasks.length > 0) {
        console.log(`[Kernel] Waiting for ${runningTasks.length} running task(s)...`);
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Give tasks 3s to complete
      }

      // Disconnect from the database
      try {
        const database = this.db;
        if (database) {
          await database.$disconnect();
          console.log('[Kernel] Database disconnected');
        }
      } catch (err) {
        console.warn('[Kernel] Database disconnect failed:', err);
      }

      // Shut down Gemini CLI discovery
      try {
        const discovery = this.geminiCLIDiscovery;
        if (discovery) {
          discovery.shutdown();
          console.log('[Kernel] Gemini CLI discovery shut down');
        }
      } catch (err) {
        console.warn('[Kernel] Gemini CLI shutdown failed:', err);
      }

      // Shut down memory optimizer auto-GC if loaded
      try {
        const optimizer = this._memoryOptimizer;
        if (optimizer && typeof optimizer.destroy === 'function') {
          optimizer.destroy();
          console.log('[Kernel] Memory optimizer shut down');
        }
      } catch (err) {
        console.warn('[Kernel] Memory optimizer shutdown failed:', err);
      }

      this._status = 'stopped';
      this._initializedAt = null;
      this.stateManager.setState('kernel.status', 'stopped');

      this.eventBus.emit('kernel:shutdown', {});
      console.log('[Kernel] Agentic Kernel shut down successfully');
    } catch (error) {
      this._status = 'stopped';
      this.eventBus.emit('kernel:shutdown_error', { error });
      console.error('[Kernel] Shutdown error:', error);
    }
  }

  /**
   * Return the current health status of the kernel and all subsystems.
   */
  healthCheck(): KernelState {
    const now = Date.now();
    const uptime = this._initializedAt ? now - this._initializedAt : 0;

    return {
      status: this._status,
      uptime,
      totalEvents: this.eventBus.totalEvents,
      activeTasks: this.scheduler.activeTaskCount,
      registryCounts: this.getRegistryCounts(),
    };
  }

  /**
   * Get the current kernel status.
   */
  get status(): KernelStatus {
    return this._status;
  }

  /**
   * Check if the kernel is running.
   */
  get isRunning(): boolean {
    return this._status === 'running';
  }

  // ────────────────────────────────────────────────────────
  // PERFORMANCE METRICS
  // ────────────────────────────────────────────────────────

  /**
   * Get the initialization performance metrics.
   */
  getInitPerformance(): {
    initStartTime: number;
    initEndTime: number;
    totalInitMs: number;
    coldStartOnTarget: boolean;
    stepTimings: InitStepTiming[];
    loadedSubsystems: Array<{ modulePath: string; exportName: string; loadedAt: number }>;
  } {
    return {
      initStartTime: this.initStartTime,
      initEndTime: this.initEndTime,
      totalInitMs: this.initEndTime - this.initStartTime,
      coldStartOnTarget: (this.initEndTime - this.initStartTime) < 3000,
      stepTimings: [...this.initStepTimings],
      loadedSubsystems: this.lazyLoader.getLoadedSubsystems(),
    };
  }

  // ────────────────────────────────────────────────────────
  // MAINTENANCE CYCLE
  // ────────────────────────────────────────────────────────

  /**
   * Start a periodic maintenance cycle that cleans up idle resources.
   * Runs every `intervalMs` milliseconds (default: 60s).
   *
   * Cleans up: idle agents, idle providers, stale rate limits, old events.
   * Emits `kernel:maintenance` event after each cycle.
   */
  startMaintenanceCycle(intervalMs: number = 60_000): void {
    this.stopMaintenanceCycle();

    this.maintenanceTimer = setInterval(() => {
      this.runMaintenance();
    }, intervalMs);

    // Allow the process to exit even if the timer is running
    if (this.maintenanceTimer && typeof this.maintenanceTimer === 'object' && 'unref' in this.maintenanceTimer) {
      this.maintenanceTimer.unref();
    }

    console.log(`[Kernel] Maintenance cycle started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop the periodic maintenance cycle.
   */
  stopMaintenanceCycle(): void {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }
  }

  /**
   * Run a single maintenance pass. Called by the maintenance cycle timer.
   */
  private runMaintenance(): void {
    const startTime = Date.now();
    const results: Record<string, unknown> = {};

    // 1. Clean up stale rate limits
    try {
      results.rateLimitsCleaned = this.security.cleanupRateLimits();
    } catch {
      results.rateLimitsCleaned = 'error';
    }

    // 2. Clean up old scheduler tasks
    try {
      results.oldTasksCleaned = this.scheduler.cleanupOldTasks();
    } catch {
      results.oldTasksCleaned = 'error';
    }

    // 3. Trim event log
    try {
      results.eventsTrimmed = this.eventBus.trimEvents(500);
    } catch {
      results.eventsTrimmed = 'error';
    }

    // 4. Clean up idle agents (if agent runtime is loaded)
    try {
      const registry = this._agentRegistry;
      if (registry && typeof registry.cleanupIdle === 'function') {
        results.idleAgentsCleaned = registry.cleanupIdle();
      }
    } catch {
      results.idleAgentsCleaned = 'error';
    }

    // 5. Clean up idle model providers (if model router is loaded)
    try {
      const router = this._modelRouter;
      if (router && typeof router.cleanupProviders === 'function') {
        results.idleProvidersCleaned = router.cleanupProviders();
      }
    } catch {
      results.idleProvidersCleaned = 'error';
    }

    const durationMs = Date.now() - startTime;

    this.eventBus.emit('kernel:maintenance', {
      timestamp: Date.now(),
      durationMs,
      results,
    });
  }

  // ────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ────────────────────────────────────────────────────────

  /**
   * Run a single initialization step with timeout and error handling.
   * Failures are recorded but do NOT block subsequent steps.
   */
  private async runInitStep(
    step: string,
    fn: () => Promise<void>,
    timeoutMs: number = 5000,
  ): Promise<void> {
    const stepStart = Date.now();

    const stepPromise = fn();

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error(`Init step "${step}" timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      await Promise.race([stepPromise, timeoutPromise]);

      const timing: InitStepTiming = {
        step,
        startTime: stepStart,
        endTime: Date.now(),
        durationMs: Date.now() - stepStart,
        success: true,
      };
      this.initStepTimings.push(timing);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const timing: InitStepTiming = {
        step,
        startTime: stepStart,
        endTime: Date.now(),
        durationMs: Date.now() - stepStart,
        success: false,
        error: errorMessage,
      };
      this.initStepTimings.push(timing);

      console.warn(`[Kernel] Init step "${step}" failed (non-blocking): ${errorMessage}`);

      // Emit step failure event but do NOT throw — subsequent steps continue
      this.eventBus.emit('kernel:init_step_failed', {
        step,
        error: errorMessage,
        durationMs: timing.durationMs,
      });
    }
  }

  /**
   * Get registry counts for all registries.
   */
  private getRegistryCounts(): KernelState['registryCounts'] {
    return {
      agents: this.registries.agents.length,
      brains: this.registries.brainCount,
      models: this.registries.modelCount,
      tools: this.registries.toolCount,
      skills: this.registries.skillCount,
      artifacts: this.registries.artifactCount,
    };
  }
}

// ─── Singleton Export ───
export const kernel = new AgenticKernel();

// Also export the class for testing or custom instances
export { AgenticKernel };
