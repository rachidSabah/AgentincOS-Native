// ═══════════════════════════════════════════════════════
// AGENTIC OS — Model Load Balancer
// Kubernetes-style model load balancing that treats models
// as compute nodes with health tracking, failover, and
// weighted routing based on capabilities and load
// ═══════════════════════════════════════════════════════

// ─── Core Types ────────────────────────────────────────

/** Represents a model as a compute node in the load balancing pool */
export interface ModelNode {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  capabilityScore: number; // 0-100 composite score
  currentLoad: number;     // 0-100
  health: 'healthy' | 'degraded' | 'offline';
  latency: number;         // ms
  successRate: number;     // 0-1
  costPerToken: number;
  maxConcurrent: number;
  activeRequests: number;
  totalRequests: number;
  lastUsed: number;
}

/** Result of model selection including fallback chain and load distribution */
export interface LoadBalanceResult {
  primaryModel: ModelNode;
  fallbackChain: ModelNode[];
  distribution: Record<string, number>; // modelId -> percentage of load
  reasoning: string;
}

/** Record of a failover event */
export interface FailoverEvent {
  from: string;
  to: string;
  reason: string;
  timestamp: number;
  taskState?: string; // preserved execution state
}

// ─── Default Model Nodes ───────────────────────────────

const DEFAULT_NODES: ModelNode[] = [
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    provider: 'google',
    capabilities: ['reasoning', 'coding', 'research', 'tool-use', 'agent-control', 'workflow', 'streaming'],
    capabilityScore: 82,
    currentLoad: 0,
    health: 'healthy',
    latency: 800,
    successRate: 0.97,
    costPerToken: 0,
    maxConcurrent: 10,
    activeRequests: 0,
    totalRequests: 0,
    lastUsed: 0,
  },
  {
    id: 'gemini-api',
    name: 'Gemini API',
    provider: 'google',
    capabilities: ['reasoning', 'coding', 'research', 'long-context', 'streaming'],
    capabilityScore: 78,
    currentLoad: 0,
    health: 'healthy',
    latency: 1200,
    successRate: 0.95,
    costPerToken: 0.00001,
    maxConcurrent: 8,
    activeRequests: 0,
    totalRequests: 0,
    lastUsed: 0,
  },
  {
    id: 'openrouter-mistral',
    name: 'OpenRouter Mistral',
    provider: 'openrouter',
    capabilities: ['coding', 'reasoning', 'function-calling', 'streaming'],
    capabilityScore: 72,
    currentLoad: 0,
    health: 'healthy',
    latency: 2000,
    successRate: 0.90,
    costPerToken: 0.00003,
    maxConcurrent: 5,
    activeRequests: 0,
    totalRequests: 0,
    lastUsed: 0,
  },
  {
    id: 'claude-api',
    name: 'Claude API',
    provider: 'anthropic',
    capabilities: ['reasoning', 'coding', 'analysis', 'long-context', 'streaming'],
    capabilityScore: 88,
    currentLoad: 0,
    health: 'healthy',
    latency: 2500,
    successRate: 0.96,
    costPerToken: 0.00005,
    maxConcurrent: 5,
    activeRequests: 0,
    totalRequests: 0,
    lastUsed: 0,
  },
  {
    id: 'gpt-api',
    name: 'GPT API',
    provider: 'openai',
    capabilities: ['reasoning', 'coding', 'vision', 'function-calling', 'streaming'],
    capabilityScore: 80,
    currentLoad: 0,
    health: 'healthy',
    latency: 1800,
    successRate: 0.94,
    costPerToken: 0.00004,
    maxConcurrent: 6,
    activeRequests: 0,
    totalRequests: 0,
    lastUsed: 0,
  },
  {
    id: 'internal-reasoning',
    name: 'Internal Reasoning Engine',
    provider: 'internal',
    capabilities: ['reasoning', 'analysis', 'logic'],
    capabilityScore: 55,
    currentLoad: 0,
    health: 'healthy',
    latency: 50,
    successRate: 0.80,
    costPerToken: 0,
    maxConcurrent: 100,
    activeRequests: 0,
    totalRequests: 0,
    lastUsed: 0,
  },
];

// ─── Scoring Constants ─────────────────────────────────

const CAPABILITY_WEIGHT = 0.35;
const LOAD_WEIGHT = 0.25;
const SUCCESS_WEIGHT = 0.25;
const LATENCY_WEIGHT = 0.15;

const MAX_FAILOVER_HISTORY = 200;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const LOAD_DECAY_FACTOR = 0.95; // Load decays 5% per cycle

// ─── ModelLoadBalancer Class ───────────────────────────

/**
 * Kubernetes-style model load balancer that treats models as compute nodes.
 * Implements weighted scoring, health tracking, automatic failover,
 * and load distribution across available models.
 *
 * Scoring formula:
 * capabilityScore * (1 - currentLoad/100) * successRate / (latency/1000 + 1)
 */
export class ModelLoadBalancer {
  private nodes: Map<string, ModelNode> = new Map();
  private failoverHistory: FailoverEvent[] = [];
  private loadDistribution: Map<string, number> = new Map();
  private lastHealthCheck: number = 0;
  private taskCapabilityMap: Map<string, string[]> = new Map();

  constructor() {
    // Initialize with default nodes
    for (const node of DEFAULT_NODES) {
      this.nodes.set(node.id, { ...node });
      this.loadDistribution.set(node.id, 0);
    }

    // Initialize task capability requirements
    this.taskCapabilityMap.set('coding', ['coding', 'reasoning']);
    this.taskCapabilityMap.set('research', ['research', 'reasoning', 'long-context']);
    this.taskCapabilityMap.set('analysis', ['reasoning', 'analysis']);
    this.taskCapabilityMap.set('architecture', ['reasoning', 'analysis', 'long-context']);
    this.taskCapabilityMap.set('review', ['reasoning', 'coding', 'analysis']);
    this.taskCapabilityMap.set('deployment', ['reasoning', 'tool-use']);
    this.taskCapabilityMap.set('security', ['reasoning', 'analysis', 'coding']);
    this.taskCapabilityMap.set('general', ['reasoning', 'coding']);
  }

  // ─── Node Management ────────────────────────────────

  /**
   * Register a model as a compute node in the load balancing pool
   *
   * @param node - The model node configuration to register
   */
  registerNode(node: ModelNode): void {
    this.nodes.set(node.id, { ...node });
    this.loadDistribution.set(node.id, 0);
  }

  /**
   * Update a node's health, load, or performance metrics
   *
   * @param modelId - The ID of the model node to update
   * @param updates - Partial updates to apply to the node
   */
  updateNode(modelId: string, updates: Partial<ModelNode>): void {
    const node = this.nodes.get(modelId);
    if (node) {
      const updated = { ...node, ...updates, lastUsed: updates.currentLoad !== undefined ? Date.now() : node.lastUsed };
      this.nodes.set(modelId, updated);

      // Track load distribution
      if (updates.activeRequests !== undefined) {
        this.loadDistribution.set(modelId, updates.activeRequests);
      }
    }
  }

  /**
   * Report that a request has started on a model node
   *
   * @param modelId - The ID of the model handling the request
   */
  incrementLoad(modelId: string): void {
    const node = this.nodes.get(modelId);
    if (node) {
      const newActive = node.activeRequests + 1;
      const newLoad = Math.min(100, (newActive / node.maxConcurrent) * 100);
      this.nodes.set(modelId, {
        ...node,
        activeRequests: newActive,
        currentLoad: newLoad,
        totalRequests: node.totalRequests + 1,
        lastUsed: Date.now(),
      });
    }
  }

  /**
   * Report that a request has completed on a model node
   *
   * @param modelId - The ID of the model that completed
   * @param success - Whether the request was successful
   * @param latency - The request latency in ms
   */
  decrementLoad(modelId: string, success: boolean, latency: number): void {
    const node = this.nodes.get(modelId);
    if (node) {
      const newActive = Math.max(0, node.activeRequests - 1);
      const newLoad = Math.min(100, (newActive / node.maxConcurrent) * 100);

      // Update success rate with exponential moving average
      const alpha = 0.1;
      const newSuccessRate = success
        ? node.successRate * (1 - alpha) + 1 * alpha
        : node.successRate * (1 - alpha) + 0 * alpha;

      // Update latency with exponential moving average
      const newLatency = node.latency * (1 - alpha) + latency * alpha;

      this.nodes.set(modelId, {
        ...node,
        activeRequests: newActive,
        currentLoad: newLoad,
        successRate: Math.round(newSuccessRate * 1000) / 1000,
        latency: Math.round(newLatency),
      });
    }
  }

  // ─── Model Selection ────────────────────────────────

  /**
   * Select the best model for a task considering load, capabilities, and cost.
   * Returns the primary model, a fallback chain, and load distribution info.
   *
   * @param task - The task description
   * @param requirements - Required capabilities for the task
   * @returns Load balance result with primary model, fallbacks, and distribution
   */
  selectModel(task: string, requirements: string[]): LoadBalanceResult {
    // Periodically decay loads
    this.decayLoads();

    const candidates = this.getEligibleNodes(requirements);
    if (candidates.length === 0) {
      // Fall back to any available node
      const allNodes = Array.from(this.nodes.values()).filter(n => n.health !== 'offline');
      if (allNodes.length === 0) {
        // Last resort: internal reasoning engine
        const internal = this.nodes.get('internal-reasoning')!;
        return {
          primaryModel: internal,
          fallbackChain: [],
          distribution: { 'internal-reasoning': 100 },
          reasoning: 'All models unavailable, falling back to internal reasoning engine',
        };
      }
      return this.buildResult(allNodes, task);
    }

    return this.buildResult(candidates, task);
  }

  /**
   * Build the load balance result from eligible candidates
   */
  private buildResult(candidates: ModelNode[], task: string): LoadBalanceResult {
    // Score each candidate
    const scored = candidates.map(node => ({
      node,
      score: this.calculateNodeScore(node, task),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const primary = scored[0]!;
    const fallbacks = scored.slice(1).map(s => s.node);

    // Calculate distribution based on scores
    const totalScore = scored.reduce((sum, s) => sum + s.score, 0);
    const distribution: Record<string, number> = {};
    for (const s of scored) {
      distribution[s.node.id] = totalScore > 0
        ? Math.round((s.score / totalScore) * 100)
        : Math.round(100 / scored.length);
    }

    // Normalize distribution to sum to 100
    const distSum = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (distSum !== 100 && primary) {
      distribution[primary.node.id] = (distribution[primary.node.id] ?? 0) + (100 - distSum);
    }

    const reasoning = this.generateSelectionReasoning(primary.node, primary.score, task);

    return {
      primaryModel: primary.node,
      fallbackChain: fallbacks,
      distribution,
      reasoning,
    };
  }

  /**
   * Calculate the weighted score for a model node.
   *
   * Formula: capabilityScore * (1 - currentLoad/100) * successRate / (latency/1000 + 1)
   */
  private calculateNodeScore(node: ModelNode, task: string): number {
    // Base weighted score
    const loadFactor = 1 - node.currentLoad / 100;
    const latencyFactor = 1 / (node.latency / 1000 + 1);

    const baseScore =
      CAPABILITY_WEIGHT * (node.capabilityScore / 100) +
      LOAD_WEIGHT * loadFactor +
      SUCCESS_WEIGHT * node.successRate +
      LATENCY_WEIGHT * latencyFactor;

    // Apply capability bonus for task-specific requirements
    const taskRequirements = this.inferTaskRequirements(task);
    let capabilityBonus = 0;
    for (const req of taskRequirements) {
      if (node.capabilities.includes(req)) {
        capabilityBonus += 0.05;
      }
    }

    // Apply cost penalty (lower cost is better)
    const costPenalty = node.costPerToken > 0 ? Math.min(0.1, node.costPerToken * 1000) : 0;

    // Apply health penalty
    const healthPenalty = node.health === 'degraded' ? 0.2 : node.health === 'offline' ? 1 : 0;

    return Math.max(0, baseScore + capabilityBonus - costPenalty - healthPenalty);
  }

  /**
   * Infer capability requirements from a task description
   */
  private inferTaskRequirements(task: string): string[] {
    const requirements = new Set<string>(['reasoning']); // Always need reasoning
    const lower = task.toLowerCase();

    if (/code|build|implement|develop|program|function|debug|fix/i.test(lower)) {
      requirements.add('coding');
    }
    if (/research|analyze|investigate|study|explore|search/i.test(lower)) {
      requirements.add('research');
    }
    if (/architecture|design|system|structure|pattern/i.test(lower)) {
      requirements.add('analysis');
    }
    if (/review|audit|verify|validate|check/i.test(lower)) {
      requirements.add('analysis');
      requirements.add('coding');
    }
    if (/deploy|ci.?cd|pipeline|release|publish/i.test(lower)) {
      requirements.add('tool-use');
    }
    if (/visual|image|screenshot|chart|graph/i.test(lower)) {
      requirements.add('vision');
    }
    if (/long|context|document|large|comprehensive/i.test(lower)) {
      requirements.add('long-context');
    }
    if (/workflow|automat|schedule|orchestrate/i.test(lower)) {
      requirements.add('workflow');
    }

    return Array.from(requirements);
  }

  /**
   * Get eligible nodes that meet capability requirements
   */
  private getEligibleNodes(requirements: string[]): ModelNode[] {
    return Array.from(this.nodes.values()).filter(node => {
      if (node.health === 'offline') return false;
      if (node.currentLoad >= 95) return false; // Nearly at capacity

      // Check if node has all required capabilities (at least 60% match)
      if (requirements.length > 0) {
        const matchCount = requirements.filter(r => node.capabilities.includes(r)).length;
        const matchRatio = matchCount / requirements.length;
        if (matchRatio < 0.6) return false;
      }

      return true;
    });
  }

  /**
   * Generate human-readable reasoning for the model selection
   */
  private generateSelectionReasoning(node: ModelNode, score: number, task: string): string {
    const parts: string[] = [];
    parts.push(`Selected ${node.name} (score: ${score.toFixed(3)})`);

    if (node.currentLoad > 0) {
      parts.push(`current load: ${node.currentLoad.toFixed(0)}%`);
    }
    parts.push(`latency: ${node.latency}ms`);
    parts.push(`success rate: ${(node.successRate * 100).toFixed(1)}%`);

    if (node.costPerToken === 0) {
      parts.push('cost: free');
    } else {
      parts.push(`cost: $${node.costPerToken.toFixed(5)}/token`);
    }

    return parts.join(', ');
  }

  // ─── Failover ───────────────────────────────────────

  /**
   * Handle failover when a model fails. Preserves execution state
   * and instantly reroutes to the best available alternative.
   *
   * @param failedModelId - The ID of the model that failed
   * @param taskState - The current execution state to preserve
   * @returns The best alternative model node
   */
  handleFailover(failedModelId: string, taskState: string): ModelNode {
    // Mark failed node as degraded
    const failedNode = this.nodes.get(failedModelId);
    if (failedNode) {
      const degradedHealth = failedNode.health === 'offline' ? 'offline' : 'degraded';
      this.nodes.set(failedModelId, {
        ...failedNode,
        health: degradedHealth,
        successRate: Math.max(0, failedNode.successRate - 0.05),
      });
    }

    // Find best alternative
    const alternatives = Array.from(this.nodes.values())
      .filter(n => n.id !== failedModelId && n.health !== 'offline')
      .sort((a, b) => this.calculateNodeScore(b, '') - this.calculateNodeScore(a, ''));

    const fallback = alternatives[0] ?? this.nodes.get('internal-reasoning')!;

    // Record failover event
    const event: FailoverEvent = {
      from: failedModelId,
      to: fallback.id,
      reason: failedNode?.health === 'offline'
        ? 'Model went offline'
        : `Model degraded (success rate: ${((failedNode?.successRate ?? 0) * 100).toFixed(1)}%)`,
      timestamp: Date.now(),
      taskState,
    };
    this.failoverHistory.push(event);

    // Trim history
    if (this.failoverHistory.length > MAX_FAILOVER_HISTORY) {
      this.failoverHistory.shift();
    }

    // Increment load on fallback
    this.incrementLoad(fallback.id);

    return fallback;
  }

  // ─── Load Balancing ─────────────────────────────────

  /**
   * Rebalance load across all available models.
   * Redistributes requests based on current scores and capacity.
   */
  rebalance(): void {
    const healthyNodes = Array.from(this.nodes.values()).filter(n => n.health !== 'offline');
    if (healthyNodes.length === 0) return;

    // Decay loads first
    this.decayLoads();

    // Check for overloaded nodes and suggest redistribution
    for (const node of healthyNodes) {
      if (node.currentLoad > 80) {
        // Find underloaded nodes to offload to
        const underloaded = healthyNodes.filter(n => n.currentLoad < 30 && n.id !== node.id);
        if (underloaded.length > 0) {
          // Mark some load for redistribution
          const loadToShift = node.currentLoad * 0.3;
          const perTarget = loadToShift / underloaded.length;

          for (const target of underloaded) {
            const targetNode = this.nodes.get(target.id);
            if (targetNode) {
              this.nodes.set(target.id, {
                ...targetNode,
                currentLoad: Math.min(100, targetNode.currentLoad + perTarget),
              });
            }
          }

          // Reduce load on overloaded node
          const updatedNode = this.nodes.get(node.id);
          if (updatedNode) {
            this.nodes.set(node.id, {
              ...updatedNode,
              currentLoad: Math.max(0, updatedNode.currentLoad - loadToShift),
            });
          }
        }
      }
    }

    // Recover degraded nodes if they've had time to rest
    for (const [id, node] of this.nodes) {
      if (node.health === 'degraded' && node.currentLoad < 20) {
        const timeSinceLastUse = Date.now() - node.lastUsed;
        if (timeSinceLastUse > 30000) { // 30 seconds rest
          this.nodes.set(id, {
            ...node,
            health: 'healthy',
            successRate: Math.min(1, node.successRate + 0.02),
          });
        }
      }
    }

    // Update load distribution map
    const totalLoad = healthyNodes.reduce((sum, n) => sum + n.currentLoad, 0);
    for (const node of healthyNodes) {
      this.loadDistribution.set(
        node.id,
        totalLoad > 0 ? (node.currentLoad / totalLoad) * 100 : 0
      );
    }
  }

  /**
   * Decay load on all nodes (simulates load reduction over time)
   */
  private decayLoads(): void {
    const now = Date.now();
    if (now - this.lastHealthCheck < HEALTH_CHECK_INTERVAL) return;
    this.lastHealthCheck = now;

    for (const [id, node] of this.nodes) {
      if (node.activeRequests === 0 && node.currentLoad > 0) {
        this.nodes.set(id, {
          ...node,
          currentLoad: Math.max(0, node.currentLoad * LOAD_DECAY_FACTOR),
        });
      }
    }
  }

  // ─── Query Methods ──────────────────────────────────

  /**
   * Get all registered model nodes with current stats
   */
  getNodes(): ModelNode[] {
    return Array.from(this.nodes.values()).map(n => ({ ...n }));
  }

  /**
   * Get a specific node by ID
   */
  getNode(id: string): ModelNode | undefined {
    const node = this.nodes.get(id);
    return node ? { ...node } : undefined;
  }

  /**
   * Get failover history
   */
  getFailoverHistory(): FailoverEvent[] {
    return [...this.failoverHistory];
  }

  /**
   * Get current load distribution across models
   */
  getLoadDistribution(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [id, load] of this.loadDistribution) {
      result[id] = Math.round(load * 100) / 100;
    }
    return result;
  }

  /**
   * Get overall load balancer health summary
   */
  getHealthSummary(): {
    totalNodes: number;
    healthyNodes: number;
    degradedNodes: number;
    offlineNodes: number;
    avgLoad: number;
    totalActiveRequests: number;
  } {
    const nodes = Array.from(this.nodes.values());
    return {
      totalNodes: nodes.length,
      healthyNodes: nodes.filter(n => n.health === 'healthy').length,
      degradedNodes: nodes.filter(n => n.health === 'degraded').length,
      offlineNodes: nodes.filter(n => n.health === 'offline').length,
      avgLoad: nodes.reduce((sum, n) => sum + n.currentLoad, 0) / nodes.length,
      totalActiveRequests: nodes.reduce((sum, n) => sum + n.activeRequests, 0),
    };
  }

  /**
   * Get the best model for a specific capability
   */
  getBestModelForCapability(capability: string): ModelNode | undefined {
    const candidates = Array.from(this.nodes.values())
      .filter(n => n.capabilities.includes(capability) && n.health !== 'offline')
      .sort((a, b) => this.calculateNodeScore(b, '') - this.calculateNodeScore(a, ''));

    return candidates[0] ? { ...candidates[0] } : undefined;
  }
}

// ─── Singleton Instance ────────────────────────────────

/** Global model load balancer instance — manages model routing, failover, and load distribution */
export const modelLoadBalancer = new ModelLoadBalancer();
