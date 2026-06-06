// ============================================================
// Agentic OS X — Enhanced Swarm Engine
// Multi-Swarm Network with Roles, Levels, Parallel Execution,
// Shared Memory, Auto-Formation, and Real-Time Map Data
// ============================================================
import type {
  TaskComplexity,
  SwarmConfig,
  SwarmStatus,
  SwarmLevel,
  SwarmRole,
  SwarmRoleType,
  SwarmMemoryEntry,
  SwarmMapData,
  SwarmMapNode,
  SwarmMapEdge,
  ExtendedAgentType,
} from './types';
import { agentRegistry } from './agent-runtime';
import { v4 as uuidv4 } from 'uuid';

// ─── Swarm Role Definitions ─────────────────────────────────
const ROLE_DESCRIPTIONS: Record<SwarmRoleType, string> = {
  leader: 'Orchestrates the swarm, makes final decisions',
  coordinator: 'Manages communication between agents',
  worker: 'Executes tasks',
  reviewer: 'Reviews work quality',
  verifier: 'Verifies correctness',
  memory_agent: 'Manages shared memory',
  knowledge_agent: 'Retrieves knowledge from the knowledge engine',
};

// ─── Swarm Level Composition ────────────────────────────────
interface SwarmLevelConfig {
  level: SwarmLevel;
  minComplexity: TaskComplexity;
  agentComposition: Array<{ role: SwarmRoleType; agentType: ExtendedAgentType }>;
  canParallelize: boolean;
}

const SWARM_LEVELS: SwarmLevelConfig[] = [
  {
    level: 'single_agent',
    minComplexity: 'simple',
    agentComposition: [{ role: 'worker', agentType: 'coder' }],
    canParallelize: false,
  },
  {
    level: 'light',
    minComplexity: 'medium',
    agentComposition: [
      { role: 'leader', agentType: 'planner' },
      { role: 'worker', agentType: 'coder' },
      { role: 'reviewer', agentType: 'reviewer' },
    ],
    canParallelize: false,
  },
  {
    level: 'standard',
    minComplexity: 'complex',
    agentComposition: [
      { role: 'leader', agentType: 'planner' },
      { role: 'worker', agentType: 'coder' },
      { role: 'worker', agentType: 'researcher' },
      { role: 'reviewer', agentType: 'reviewer' },
      { role: 'verifier', agentType: 'verifier' },
    ],
    canParallelize: true,
  },
  {
    level: 'enterprise',
    minComplexity: 'enterprise',
    agentComposition: [
      { role: 'leader', agentType: 'planner' },
      { role: 'coordinator', agentType: 'architect' },
      { role: 'worker', agentType: 'coder' },
      { role: 'worker', agentType: 'researcher' },
      { role: 'reviewer', agentType: 'reviewer' },
      { role: 'verifier', agentType: 'verifier' },
      { role: 'memory_agent', agentType: 'memory' },
      { role: 'knowledge_agent', agentType: 'researcher' },
    ],
    canParallelize: true,
  },
  {
    level: 'multi_swarm',
    minComplexity: 'multi_swarm',
    agentComposition: [
      { role: 'leader', agentType: 'planner' },
      { role: 'coordinator', agentType: 'architect' },
      { role: 'worker', agentType: 'coder' },
      { role: 'worker', agentType: 'researcher' },
      { role: 'reviewer', agentType: 'reviewer' },
      { role: 'verifier', agentType: 'verifier' },
      { role: 'memory_agent', agentType: 'memory' },
      { role: 'knowledge_agent', agentType: 'researcher' },
    ],
    canParallelize: true,
  },
];

// ─── Dependency Graph for Parallel Execution ────────────────
interface TaskDependencyNode {
  agentId: string;
  role: SwarmRoleType;
  dependsOn: SwarmRoleType[];
  phase: number; // Execution phase: 0 = can run immediately
}

// Phase-based execution order:
// Phase 0: leader, knowledge_agent, memory_agent (can start immediately)
// Phase 1: workers, coordinator (depend on leader's plan)
// Phase 2: reviewer (depends on workers' output)
// Phase 3: verifier (depends on reviewer's output)
const ROLE_PHASES: Record<SwarmRoleType, { phase: number; dependsOn: SwarmRoleType[] }> = {
  leader: { phase: 0, dependsOn: [] },
  knowledge_agent: { phase: 0, dependsOn: [] },
  memory_agent: { phase: 0, dependsOn: [] },
  coordinator: { phase: 1, dependsOn: ['leader'] },
  worker: { phase: 1, dependsOn: ['leader'] },
  reviewer: { phase: 2, dependsOn: ['worker'] },
  verifier: { phase: 3, dependsOn: ['reviewer'] },
};

// ─── Swarm Memory ───────────────────────────────────────────
class SwarmMemory {
  private entries: Map<string, SwarmMemoryEntry> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  /** Write an entry to swarm memory */
  write(key: string, value: string, writtenBy: string, importance: number = 0.5): void {
    this.entries.set(key, {
      key,
      value,
      timestamp: Date.now(),
      writtenBy,
      importance,
    });

    // Evict least important entries if over capacity
    if (this.entries.size > this.maxSize) {
      const sorted = Array.from(this.entries.entries())
        .sort((a, b) => a[1].importance - b[1].importance);
      const toEvict = sorted.slice(0, Math.floor(this.maxSize * 0.2));
      for (const [k] of toEvict) {
        this.entries.delete(k);
      }
    }
  }

  /** Read an entry from swarm memory */
  read(key: string): SwarmMemoryEntry | undefined {
    return this.entries.get(key);
  }

  /** Read all entries */
  readAll(): SwarmMemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /** Search entries by key prefix */
  search(prefix: string): SwarmMemoryEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.key.startsWith(prefix));
  }

  /** Delete an entry */
  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  /** Get memory snapshot */
  snapshot(): SwarmMemoryEntry[] {
    return this.readAll();
  }

  /** Clear all memory */
  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

// ─── Task Complexity Analyzer ───────────────────────────────
class ComplexityAnalyzer {
  private readonly KEYWORDS_HIGH: RegExp =
    /enterprise|system|architecture|microservice|full.?stack|multi.?agent|distributed|cross.?domain|infrastructure|platform/i;
  private readonly KEYWORDS_MID: RegExp =
    /design|build|create|implement|integrate|refactor|deploy|scale|optimize/i;
  private readonly KEYWORDS_MULTI: RegExp =
    /multi.?swarm|swarm.?network|cross.?domain|parallel.?swarm|coordinated.?effort|organization.?wide|fleet|ensemble/i;

  /**
   * Analyze task description and determine complexity level.
   */
  analyze(task: string): TaskComplexity {
    const words = task.split(/\s+/);
    const wordCount = words.length;

    // Check for multi-swarm indicators first (highest priority)
    if (this.KEYWORDS_MULTI.test(task) || wordCount > 50) {
      return 'multi_swarm';
    }

    // Check for complex/enterprise indicators
    if (this.KEYWORDS_HIGH.test(task) || wordCount > 30) {
      return 'complex';
    }

    // Check for medium indicators
    if (wordCount > 15 || this.KEYWORDS_MID.test(task)) {
      return 'medium';
    }

    return 'simple';
  }

  /**
   * Map complexity to swarm level.
   */
  complexityToLevel(complexity: TaskComplexity): SwarmLevel {
    switch (complexity) {
      case 'simple': return 'single_agent';
      case 'medium': return 'light';
      case 'complex': return 'standard';
      case 'enterprise': return 'enterprise';
      case 'multi_swarm': return 'multi_swarm';
    }
  }

  /**
   * Get the swarm level configuration for a given level.
   */
  getLevelConfig(level: SwarmLevel): SwarmLevelConfig {
    const config = SWARM_LEVELS.find((l) => l.level === level);
    if (!config) throw new Error(`Unknown swarm level: ${level}`);
    return config;
  }
}

// ─── Swarm Execution Result ─────────────────────────────────
export interface SwarmExecutionResult {
  swarmId: string;
  results: Array<{
    agentId: string;
    agentType: string;
    role: SwarmRoleType;
    result: string;
    success: boolean;
    phase: number;
    durationMs: number;
  }>;
  status: SwarmStatus;
  durationMs: number;
  swarmLevel: SwarmLevel;
  parallelPhases: number;
  memorySnapshot: SwarmMemoryEntry[];
}

// ─── Individual Swarm ───────────────────────────────────────
class Swarm {
  readonly id: string;
  readonly task: string;
  readonly complexity: TaskComplexity;
  readonly level: SwarmLevel;
  readonly roles: SwarmRole[];
  readonly agentIds: string[];
  readonly memory: SwarmMemory;
  readonly createdAt: number;
  readonly parentSwarmId?: string;
  readonly childSwarmIds: string[];
  readonly artifacts: string[];

  private _status: SwarmStatus;
  private completedAt?: number;

  constructor(
    task: string,
    complexity: TaskComplexity,
    level: SwarmLevel,
    roles: SwarmRole[],
    agentIds: string[],
    parentSwarmId?: string,
  ) {
    this.id = uuidv4();
    this.task = task;
    this.complexity = complexity;
    this.level = level;
    this.roles = roles;
    this.agentIds = agentIds;
    this.memory = new SwarmMemory();
    this.createdAt = Date.now();
    this.parentSwarmId = parentSwarmId;
    this.childSwarmIds = [];
    this.artifacts = [];
    this._status = 'forming';
  }

  get status(): SwarmStatus {
    return this._status;
  }

  set status(value: SwarmStatus) {
    this._status = value;
    if (value === 'completed' || value === 'failed' || value === 'cancelled') {
      this.completedAt = Date.now();
    }
  }

  /** Build the dependency graph for parallel execution */
  buildDependencyGraph(): TaskDependencyNode[] {
    return this.roles.map((r) => {
      const phaseConfig = ROLE_PHASES[r.role];
      return {
        agentId: r.agentId,
        role: r.role,
        dependsOn: phaseConfig.dependsOn,
        phase: phaseConfig.phase,
      };
    });
  }

  /** Group agents by execution phase */
  getPhases(): Map<number, TaskDependencyNode[]> {
    const deps = this.buildDependencyGraph();
    const phases = new Map<number, TaskDependencyNode[]>();

    for (const dep of deps) {
      const phaseAgents = phases.get(dep.phase) ?? [];
      phaseAgents.push(dep);
      phases.set(dep.phase, phaseAgents);
    }

    return phases;
  }

  /** Convert to SwarmConfig for persistence/serialization */
  toConfig(): SwarmConfig {
    return {
      id: this.id,
      task: this.task,
      complexity: this.complexity,
      level: this.level,
      agentIds: this.agentIds,
      roles: this.roles,
      status: this._status,
      memory: this.memory.snapshot(),
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      parentSwarmId: this.parentSwarmId,
      childSwarmIds: this.childSwarmIds,
      artifacts: this.artifacts,
    };
  }
}

// ─── Swarm Network ──────────────────────────────────────────
class SwarmNetwork {
  private swarms: Map<string, Swarm> = new Map();
  private complexityAnalyzer: ComplexityAnalyzer = new ComplexityAnalyzer();

  // ─── Swarm Creation ───

  /**
   * Create a new swarm for a given task, automatically determining
   * the appropriate level based on task characteristics.
   */
  createSwarm(task: string, complexity?: TaskComplexity): SwarmConfig {
    const resolvedComplexity = complexity ?? this.complexityAnalyzer.analyze(task);
    const level = this.complexityAnalyzer.complexityToLevel(resolvedComplexity);
    const levelConfig = this.complexityAnalyzer.getLevelConfig(level);

    // Spawn agents based on the level composition
    const roles: SwarmRole[] = [];
    const agentIds: string[] = [];

    for (const slot of levelConfig.agentComposition) {
      const agent = agentRegistry.spawn(slot.agentType);
      agentIds.push(agent.id);
      roles.push({ agentId: agent.id, role: slot.role });
    }

    const swarm = new Swarm(task, resolvedComplexity, level, roles, agentIds);
    swarm.status = 'active';

    this.swarms.set(swarm.id, swarm);
    return swarm.toConfig();
  }

  /**
   * Create a child swarm under a parent (for multi-swarm networks).
   */
  createChildSwarm(parentSwarmId: string, task: string, complexity?: TaskComplexity): SwarmConfig {
    const parent = this.swarms.get(parentSwarmId);
    if (!parent) throw new Error(`Parent swarm not found: ${parentSwarmId}`);

    const config = this.createSwarm(task, complexity);
    const childSwarm = this.swarms.get(config.id)!;

    // Link parent and child
    // We use a reflective update since the Swarm class fields are readonly
    (childSwarm as { parentSwarmId: string }).parentSwarmId = parentSwarmId;
    parent.childSwarmIds.push(config.id);

    return config;
  }

  // ─── Swarm Execution ───

  /**
   * Execute a swarm using phase-based parallel execution.
   * Agents in the same phase run concurrently, phases run sequentially.
   */
  async executeSwarm(swarmId: string, task: string): Promise<SwarmExecutionResult> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) throw new Error(`Swarm not found: ${swarmId}`);

    const startTime = Date.now();
    swarm.status = 'active';

    const results: SwarmExecutionResult['results'] = [];
    const phases = swarm.getPhases();
    const maxPhase = Math.max(...Array.from(phases.keys()), 0);

    // Execute phase by phase
    for (let phase = 0; phase <= maxPhase; phase++) {
      const phaseAgents = phases.get(phase) ?? [];
      if (phaseAgents.length === 0) continue;

      // Run all agents in this phase in parallel
      const phaseResults = await Promise.allSettled(
        phaseAgents.map(async (dep) => {
          const agentStart = Date.now();
          const agent = agentRegistry.get(dep.agentId);

          if (!agent) {
            return {
              agentId: dep.agentId,
              agentType: 'unknown',
              role: dep.role,
              result: `Agent not found: ${dep.agentId}`,
              success: false,
              phase: dep.phase,
              durationMs: Date.now() - agentStart,
            };
          }

          try {
            // Enhance the task prompt based on role
            const rolePrompt = this.buildRolePrompt(task, dep.role, swarm);
            const message = await agent.execute(rolePrompt);
            const durationMs = Date.now() - agentStart;

            // Write result to swarm memory
            swarm.memory.write(
              `result:${dep.role}:${dep.agentId}`,
              message.content,
              dep.agentId,
              dep.role === 'leader' ? 0.9 : 0.6,
            );

            return {
              agentId: dep.agentId,
              agentType: agent.type,
              role: dep.role,
              result: message.content,
              success: true,
              phase: dep.phase,
              durationMs,
            };
          } catch (error) {
            const durationMs = Date.now() - agentStart;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Write error to swarm memory for other agents to see
            swarm.memory.write(
              `error:${dep.role}:${dep.agentId}`,
              errorMessage,
              dep.agentId,
              0.8,
            );

            return {
              agentId: dep.agentId,
              agentType: agent.type,
              role: dep.role,
              result: errorMessage,
              success: false,
              phase: dep.phase,
              durationMs,
            };
          }
        }),
      );

      // Collect results from this phase
      for (const result of phaseResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            agentId: 'unknown',
            agentType: 'unknown',
            role: 'worker',
            result: result.reason instanceof Error ? result.reason.message : 'Unknown phase error',
            success: false,
            phase,
            durationMs: 0,
          });
        }
      }
    }

    // Determine final status
    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);
    const finalStatus: SwarmStatus = allSuccess ? 'completed' : anySuccess ? 'completed' : 'failed';
    swarm.status = finalStatus;

    return {
      swarmId,
      results,
      status: finalStatus,
      durationMs: Date.now() - startTime,
      swarmLevel: swarm.level,
      parallelPhases: maxPhase + 1,
      memorySnapshot: swarm.memory.snapshot(),
    };
  }

  /**
   * Execute multiple swarms in parallel (for multi-swarm network tasks).
   */
  async executeMultiSwarm(
    tasks: Array<{ task: string; complexity?: TaskComplexity }>,
  ): Promise<Array<{ swarm: SwarmConfig; result: SwarmExecutionResult }>> {
    // Create all swarms first
    const swarmConfigs = tasks.map((t) => this.createSwarm(t.task, t.complexity));

    // Execute all swarms in parallel
    const executionResults = await Promise.allSettled(
      swarmConfigs.map((config) => this.executeSwarm(config.id, config.task)),
    );

    return swarmConfigs.map((config, i) => {
      const execResult = executionResults[i]!;
      const result = execResult.status === 'fulfilled'
        ? execResult.value
        : {
            swarmId: config.id,
            results: [],
            status: 'failed' as SwarmStatus,
            durationMs: 0,
            swarmLevel: config.level,
            parallelPhases: 0,
            memorySnapshot: [],
          };

      return { swarm: config, result };
    });
  }

  // ─── Swarm Query ───

  /** Get a swarm by ID */
  getSwarm(id: string): SwarmConfig | undefined {
    return this.swarms.get(id)?.toConfig();
  }

  /** Get all active swarms */
  getActiveSwarms(): SwarmConfig[] {
    return Array.from(this.swarms.values())
      .filter((s) => s.status === 'active')
      .map((s) => s.toConfig());
  }

  /** Get all swarms */
  listSwarms(): SwarmConfig[] {
    return Array.from(this.swarms.values()).map((s) => s.toConfig());
  }

  /** Cancel a swarm */
  cancelSwarm(swarmId: string): boolean {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return false;
    if (swarm.status !== 'active' && swarm.status !== 'forming') return false;
    swarm.status = 'cancelled';
    return true;
  }

  /** Get a swarm's shared memory */
  getSwarmMemory(swarmId: string): SwarmMemoryEntry[] {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return [];
    return swarm.memory.snapshot();
  }

  /** Write to a swarm's shared memory */
  writeSwarmMemory(swarmId: string, key: string, value: string, writtenBy: string, importance?: number): boolean {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return false;
    swarm.memory.write(key, value, writtenBy, importance);
    return true;
  }

  // ─── Swarm Map / Visualization ───

  /**
   * Generate real-time swarm map data for visualization.
   * Includes agent nodes, memory nodes, artifact nodes, and the
   * relationships (edges) between them.
   */
  getSwarmMap(swarmId: string): SwarmMapData {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return { nodes: [], edges: [] };

    const nodes: SwarmMapNode[] = [];
    const edges: SwarmMapEdge[] = [];

    // Layout configuration
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    // Add agent nodes arranged in a circle
    swarm.roles.forEach((r, i) => {
      const angle = (2 * Math.PI * i) / swarm.roles.length - Math.PI / 2;
      const agent = agentRegistry.get(r.agentId);

      nodes.push({
        id: r.agentId,
        type: 'agent',
        label: agent?.name ?? r.role,
        status: agent?.status ?? 'unknown',
        role: r.role,
        agentType: agent?.type,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    // Add memory node at center
    const memoryNodeId = `memory-${swarmId}`;
    nodes.push({
      id: memoryNodeId,
      type: 'memory',
      label: 'Shared Memory',
      status: swarm.memory.size > 0 ? 'active' : 'empty',
      x: centerX,
      y: centerY,
    });

    // Add artifact nodes if any
    swarm.artifacts.forEach((artifactId, i) => {
      const angle = (2 * Math.PI * i) / Math.max(swarm.artifacts.length, 1) + Math.PI / 4;
      nodes.push({
        id: `artifact-${artifactId}`,
        type: 'artifact',
        label: `Artifact ${artifactId.slice(0, 8)}`,
        status: 'stored',
        x: centerX + (radius + 80) * Math.cos(angle),
        y: centerY + (radius + 80) * Math.sin(angle),
      });
    });

    // Build edges based on roles and dependencies
    const leaderId = swarm.roles.find((r) => r.role === 'leader')?.agentId;
    const coordinatorId = swarm.roles.find((r) => r.role === 'coordinator')?.agentId;
    const reviewerId = swarm.roles.find((r) => r.role === 'reviewer')?.agentId;
    const verifierId = swarm.roles.find((r) => r.role === 'verifier')?.agentId;
    const memoryAgentId = swarm.roles.find((r) => r.role === 'memory_agent')?.agentId;

    // Leader assigns tasks to workers
    const workerIds = swarm.roles.filter((r) => r.role === 'worker').map((r) => r.agentId);
    for (const workerId of workerIds) {
      if (leaderId) {
        edges.push({
          sourceId: leaderId,
          targetId: workerId,
          type: 'task_assignment',
          label: 'assign task',
        });
      }
    }

    // Workers deliver results to reviewer
    for (const workerId of workerIds) {
      if (reviewerId) {
        edges.push({
          sourceId: workerId,
          targetId: reviewerId,
          type: 'result_delivery',
          label: 'submit work',
        });
      }
    }

    // Reviewer sends to verifier
    if (reviewerId && verifierId) {
      edges.push({
        sourceId: reviewerId,
        targetId: verifierId,
        type: 'review',
        label: 'reviewed work',
      });
    }

    // Coordinator manages communication
    if (coordinatorId) {
      for (const r of swarm.roles) {
        if (r.agentId !== coordinatorId && r.role !== 'leader') {
          edges.push({
            sourceId: coordinatorId,
            targetId: r.agentId,
            type: 'coordination',
            label: 'coordinate',
          });
        }
      }
    }

    // Memory agent connects to shared memory
    if (memoryAgentId) {
      edges.push({
        sourceId: memoryAgentId,
        targetId: memoryNodeId,
        type: 'memory_access',
        label: 'read/write',
      });
    }

    // All agents can access shared memory (simplified as edges to memory node)
    for (const r of swarm.roles) {
      if (r.role !== 'memory_agent') {
        edges.push({
          sourceId: r.agentId,
          targetId: memoryNodeId,
          type: 'memory_access',
          label: 'access memory',
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Get a network-level map showing all swarms and their relationships.
   */
  getNetworkMap(): SwarmMapData {
    const allNodes: SwarmMapNode[] = [];
    const allEdges: SwarmMapEdge[] = [];

    let swarmIndex = 0;
    const swarmIdList = Array.from(this.swarms.keys());
    const spacing = 600;

    for (const swarmId of swarmIdList) {
      const swarmMap = this.getSwarmMap(swarmId);
      const offsetX = (swarmIndex % 3) * spacing;
      const offsetY = Math.floor(swarmIndex / 3) * spacing;

      // Offset all nodes for this swarm
      for (const node of swarmMap.nodes) {
        allNodes.push({
          ...node,
          id: `${swarmId}:${node.id}`,
          x: (node.x ?? 0) + offsetX,
          y: (node.y ?? 0) + offsetY,
        });
      }

      // Offset all edges for this swarm
      for (const edge of swarmMap.edges) {
        allEdges.push({
          ...edge,
          sourceId: `${swarmId}:${edge.sourceId}`,
          targetId: `${swarmId}:${edge.targetId}`,
        });
      }

      // Add inter-swarm edges (parent-child relationships)
      const swarm = this.swarms.get(swarmId)!;
      if (swarm.parentSwarmId) {
        const parentLeader = this.swarms.get(swarm.parentSwarmId)?.roles.find((r) => r.role === 'leader')?.agentId;
        const childLeader = swarm.roles.find((r) => r.role === 'leader')?.agentId;
        if (parentLeader && childLeader) {
          allEdges.push({
            sourceId: `${swarm.parentSwarmId}:${parentLeader}`,
            targetId: `${swarmId}:${childLeader}`,
            type: 'coordination',
            label: 'parent swarm',
          });
        }
      }

      swarmIndex++;
    }

    return { nodes: allNodes, edges: allEdges };
  }

  // ─── Auto-Swarm Formation ───

  /**
   * Automatically determine whether to form a swarm, what level,
   * and potentially create a multi-swarm network based on task analysis.
   */
  autoFormSwarm(task: string, complexity?: TaskComplexity): SwarmConfig {
    const resolvedComplexity = complexity ?? this.complexityAnalyzer.analyze(task);

    // For multi-swarm complexity, create a parent swarm + child swarms
    if (resolvedComplexity === 'multi_swarm') {
      return this.createMultiSwarmNetwork(task);
    }

    return this.createSwarm(task, resolvedComplexity);
  }

  /**
   * Create a multi-swarm network for complex cross-domain tasks.
   * Decomposes the task into sub-tasks and creates coordinated swarms.
   */
  private createMultiSwarmNetwork(task: string): SwarmConfig {
    // Create the parent/orchestrator swarm
    const parentConfig = this.createSwarm(task, 'enterprise');

    // Decompose task into sub-domains (simplified heuristic)
    const subTasks = this.decomposeTask(task);

    // Create child swarms for each sub-task
    for (const subTask of subTasks) {
      try {
        this.createChildSwarm(parentConfig.id, subTask.task, subTask.complexity);
      } catch {
        // Child swarm creation failed — parent can still operate
      }
    }

    return parentConfig;
  }

  /**
   * Decompose a task into sub-tasks using heuristic analysis.
   * In production, this would use AI-powered decomposition.
   */
  private decomposeTask(task: string): Array<{ task: string; complexity: TaskComplexity }> {
    const subTasks: Array<{ task: string; complexity: TaskComplexity }> = [];

    // Split by common delimiters that indicate sub-tasks
    const parts = task.split(/[;.]\s*/).filter((p) => p.trim().length > 10);

    if (parts.length > 1) {
      for (const part of parts) {
        const partComplexity = this.complexityAnalyzer.analyze(part);
        subTasks.push({ task: part.trim(), complexity: partComplexity });
      }
    } else {
      // Single task — decompose by domain
      subTasks.push({ task: `Research and plan: ${task}`, complexity: 'medium' });
      subTasks.push({ task: `Implement: ${task}`, complexity: 'complex' });
      subTasks.push({ task: `Review and verify: ${task}`, complexity: 'medium' });
    }

    return subTasks.slice(0, 5); // Cap at 5 child swarms
  }

  // ─── Utilities ───

  /**
   * Build a role-specific prompt for an agent in the swarm.
   */
  private buildRolePrompt(task: string, role: SwarmRoleType, swarm: Swarm): string {
    const roleDesc = ROLE_DESCRIPTIONS[role];
    const memoryContext = swarm.memory.size > 0
      ? `\n\nShared memory context:\n${swarm.memory.snapshot()
          .slice(0, 10)
          .map((e) => `- ${e.key}: ${e.value.slice(0, 200)}`)
          .join('\n')}`
      : '';

    const leaderResult = swarm.memory.read('result:leader');
    const leaderContext = leaderResult && role !== 'leader'
      ? `\n\nLeader's plan:\n${leaderResult.value.slice(0, 500)}`
      : '';

    switch (role) {
      case 'leader':
        return `You are the LEADER of this swarm. ${roleDesc}\n\nTask: ${task}\n\nCreate a clear execution plan, decompose the work, and assign responsibilities. Your plan will be shared with all other agents.${memoryContext}`;
      case 'coordinator':
        return `You are the COORDINATOR of this swarm. ${roleDesc}\n\nTask: ${task}\n\nEnsure smooth communication between agents. Resolve conflicts and prioritize work.${leaderContext}${memoryContext}`;
      case 'worker':
        return `You are a WORKER in this swarm. ${roleDesc}\n\nTask: ${task}\n\nExecute your assigned portion of the work thoroughly and precisely.${leaderContext}${memoryContext}`;
      case 'reviewer':
        return `You are the REVIEWER of this swarm. ${roleDesc}\n\nTask: ${task}\n\nReview the work produced by the workers. Check for quality, completeness, and best practices.${leaderContext}${memoryContext}`;
      case 'verifier':
        return `You are the VERIFIER of this swarm. ${roleDesc}\n\nTask: ${task}\n\nVerify the final output against requirements. Confirm correctness and completeness.${leaderContext}${memoryContext}`;
      case 'memory_agent':
        return `You are the MEMORY AGENT of this swarm. ${roleDesc}\n\nTask: ${task}\n\nManage the shared memory. Index important information, retrieve relevant context, and ensure all agents have access to what they need.${memoryContext}`;
      case 'knowledge_agent':
        return `You are the KNOWLEDGE AGENT of this swarm. ${roleDesc}\n\nTask: ${task}\n\nRetrieve relevant knowledge from the knowledge engine. Provide domain expertise and reference information.${memoryContext}`;
    }
  }

  /**
   * Get aggregate statistics about all swarms.
   */
  getStatistics(): {
    totalSwarms: number;
    activeSwarms: number;
    completedSwarms: number;
    failedSwarms: number;
    byLevel: Record<string, number>;
    byComplexity: Record<string, number>;
    avgDurationMs: number;
    totalAgentsUsed: number;
  } {
    const allSwarms = Array.from(this.swarms.values());
    const byLevel: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};
    let totalDuration = 0;
    let completedCount = 0;
    let totalAgents = 0;

    for (const swarm of allSwarms) {
      byLevel[swarm.level] = (byLevel[swarm.level] ?? 0) + 1;
      byComplexity[swarm.complexity] = (byComplexity[swarm.complexity] ?? 0) + 1;
      totalAgents += swarm.agentIds.length;

      if (swarm.status === 'completed' && swarm.completedAt) {
        totalDuration += swarm.completedAt - swarm.createdAt;
        completedCount++;
      }
    }

    return {
      totalSwarms: allSwarms.length,
      activeSwarms: allSwarms.filter((s) => s.status === 'active').length,
      completedSwarms: allSwarms.filter((s) => s.status === 'completed').length,
      failedSwarms: allSwarms.filter((s) => s.status === 'failed').length,
      byLevel,
      byComplexity,
      avgDurationMs: completedCount > 0 ? totalDuration / completedCount : 0,
      totalAgentsUsed: totalAgents,
    };
  }
}

// ─── Singleton Export ───
export const swarmEngine = new SwarmNetwork();
export { SwarmNetwork, SwarmMemory, ComplexityAnalyzer, Swarm };
