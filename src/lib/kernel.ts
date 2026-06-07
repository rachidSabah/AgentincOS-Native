// ============================================================
// Agentic OS V2 — Agentic Kernel (Central Orchestrator)
// ============================================================
// The kernel manages all subsystems: Event Bus, State Manager,
// Scheduler, Registries, Permission Engine, Security Engine,
// and Kernel Lifecycle.
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

import { agentRegistry } from './agent-runtime';
import { modelRouter } from './model-router';
import { memoryEngine } from './memory-engine';
import { brainEngine } from './brain-engine';
import { observabilityEngine } from './observability';
import { selfHealingEngine } from './self-healing';
import { swarmEngine } from './swarm-engine';
import { db } from './db';
import { geminiCLIDiscovery } from './gemini-cli-discovery';

// Conditional import for knowledge-engine — may not exist yet
let knowledgeEngine: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ke = require('./knowledge-engine');
  knowledgeEngine = ke.knowledgeEngine ?? null;
} catch {
  // knowledge-engine not available — kernel can still initialize
}

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
// 4. REGISTRIES — Central registry accessors
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

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeDefaultRegistries();
  }

  // ─── Agent Registry (delegates to agent-runtime) ───
  get agents(): AgentConfig[] {
    return agentRegistry.list();
  }

  getAgent(id: string): AgentConfig | undefined {
    return agentRegistry.get(id)?.getStatus();
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

  // ─── Memory Registry (delegates to memory-engine) ───
  get memoryEngineRef(): typeof memoryEngine {
    return memoryEngine;
  }

  // ─── Knowledge Registry (delegates to knowledge-engine if available) ───
  get knowledgeEngineRef(): any {
    return knowledgeEngine;
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
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [source, entry] of this.rateLimits.entries()) {
      if (now - entry.windowStart > this.defaultWindowMs * 2) {
        this.rateLimits.delete(source);
      }
    }
  }
}

// ============================================================
// 7. AGENTIC KERNEL — Lifecycle management & orchestration
// ============================================================
class AgenticKernel {
  // Subsystems
  readonly eventBus: EventBus;
  readonly stateManager: StateManager;
  readonly scheduler: Scheduler;
  readonly registries: RegistryManager;
  readonly permissions: PermissionEngine;
  readonly security: SecurityEngine;

  // Lifecycle state
  private _status: KernelStatus = 'stopped';
  private _initializedAt: number | null = null;

  // References to external subsystems
  readonly agentRegistry = agentRegistry;
  readonly modelRouter = modelRouter;
  readonly memoryEngine = memoryEngine;
  readonly brainEngine = brainEngine;
  readonly observabilityEngine = observabilityEngine;
  readonly selfHealingEngine = selfHealingEngine;
  readonly swarmEngine = swarmEngine;
  readonly knowledgeEngine = knowledgeEngine;
  readonly geminiCLIDiscovery = geminiCLIDiscovery;
  readonly db = db;

  constructor() {
    this.eventBus = new EventBus();
    this.stateManager = new StateManager(this.eventBus);
    this.scheduler = new Scheduler(this.eventBus);
    this.registries = new RegistryManager(this.eventBus);
    this.permissions = new PermissionEngine(this.eventBus);
    this.security = new SecurityEngine(this.eventBus);
  }

  // ─── Lifecycle ───

  /**
   * Initialize the kernel and all subsystems.
   */
  async init(): Promise<void> {
    if (this._status === 'running' || this._status === 'initializing') {
      console.warn('[Kernel] Already initialized or initializing');
      return;
    }

    this._status = 'initializing';
    this.eventBus.emit('kernel:initializing', {});

    try {
      // Connect to the database
      try {
        await db.$connect();
        console.log('[Kernel] Database connected');
      } catch (err) {
        console.warn('[Kernel] Database connection failed (continuing with stub):', err);
      }

      // Initialize observability
      observabilityEngine.trackMetric('kernel_init', 1, { status: 'starting' });

      // Set initial kernel state
      this.stateManager.setState('kernel.status', 'initializing');
      this.stateManager.setState('kernel.startedAt', Date.now());

      // ─── Gemini CLI Auto-Discovery ───
      // Automatically detect and register Gemini CLI on startup
      try {
        console.log('[Kernel] Starting Gemini CLI auto-discovery...');
        this.eventBus.emit('gemini-cli:discovering', {});

        const cliState = await geminiCLIDiscovery.discover();

        if (cliState.discovery.status === 'available' && cliState.health.available) {
          // CLI found and validated — register with model router
          modelRouter.markProviderValidated('gemini-cli');

          const bestModel = geminiCLIDiscovery.selectBestModel('balanced');
          if (bestModel) {
            modelRouter.updateDynamicModel('gemini-cli', bestModel.id, bestModel.contextWindow);
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

          console.log(`[Kernel] Gemini CLI discovered: ${cliState.discovery.version} at ${cliState.discovery.executablePath}`);
          console.log(`[Kernel] Gemini CLI models: ${cliState.models.map((m) => m.id).join(', ')}`);
          this.eventBus.emit('gemini-cli:discovered', {
            version: cliState.discovery.version,
            executablePath: cliState.discovery.executablePath,
            models: cliState.models.map((m) => m.id),
            healthScore: cliState.health.healthScore,
          });
        } else {
          // CLI not available — mark provider as degraded in router
          modelRouter.markProviderDegraded('gemini-cli', cliState.health.degradationReason ?? 'Not found');
          console.log('[Kernel] Gemini CLI not available — using Gemini API fallback');
          this.eventBus.emit('gemini-cli:unavailable', {
            reason: cliState.health.degradationReason,
          });
        }
      } catch (err) {
        // Discovery failure should not block kernel startup
        console.warn('[Kernel] Gemini CLI discovery failed (non-blocking):', err);
        modelRouter.markProviderDegraded('gemini-cli', 'Discovery error');
        this.eventBus.emit('gemini-cli:error', { error: err });
      }

      // Wire up Gemini CLI discovery events to model router
      geminiCLIDiscovery.on('health:recovered', () => {
        modelRouter.markProviderValidated('gemini-cli');
        const bestModel = geminiCLIDiscovery.selectBestModel('balanced');
        if (bestModel) {
          modelRouter.updateDynamicModel('gemini-cli', bestModel.id, bestModel.contextWindow);
        }
        console.log('[Kernel] Gemini CLI recovered — routing restored');
      });

      geminiCLIDiscovery.on('health:degraded', () => {
        modelRouter.markProviderDegraded('gemini-cli');
        console.log('[Kernel] Gemini CLI degraded — failing over to Gemini API');
      });

      // Mark as running
      this._status = 'running';
      this._initializedAt = Date.now();
      this.stateManager.setState('kernel.status', 'running');

      this.eventBus.emit('kernel:initialized', {
        uptime: 0,
        registryCounts: this.getRegistryCounts(),
      });

      observabilityEngine.trackMetric('kernel_init', 1, { status: 'success' });
      console.log('[Kernel] Agentic Kernel initialized successfully');
    } catch (error) {
      this._status = 'stopped';
      this.stateManager.setState('kernel.status', 'error');
      this.eventBus.emit('kernel:init_failed', { error });
      observabilityEngine.trackMetric('kernel_init', 0, { status: 'failed' });
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
        await db.$disconnect();
        console.log('[Kernel] Database disconnected');
      } catch (err) {
        console.warn('[Kernel] Database disconnect failed:', err);
      }

      // Shut down Gemini CLI discovery
      try {
        geminiCLIDiscovery.shutdown();
        console.log('[Kernel] Gemini CLI discovery shut down');
      } catch (err) {
        console.warn('[Kernel] Gemini CLI shutdown failed:', err);
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
