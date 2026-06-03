// ═══════════════════════════════════════════════════════
// AGENTIC OS — Self-Evolving Swarm Kernel
// Continuously analyzes, optimizes, and evolves swarm
// composition, model routing, and performance heuristics
// ═══════════════════════════════════════════════════════

import type { SwarmTier } from './swarm-orchestrator';

// ─── Core Types ────────────────────────────────────────

/** Represents a complete swarm execution from planning through completion */
export interface SwarmExecution {
  id: string;
  task: string;
  tier: SwarmTier;
  agents: SwarmAgentExecution[];
  startTime: number;
  endTime?: number;
  status: 'planning' | 'executing' | 'validating' | 'completed' | 'failed';
  result?: string;
  metrics: ExecutionMetrics;
  improvements: ImprovementPattern[];
}

/** Individual agent execution within a swarm */
export interface SwarmAgentExecution {
  agentId: string;
  role: string;
  model: string;
  brain: number; // 1-7 which brain layer
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  latency: number;
  tokensUsed: number;
  quality: number; // 0-1
}

/** Aggregate metrics for a swarm execution */
export interface ExecutionMetrics {
  totalLatency: number;
  totalTokens: number;
  successRate: number;
  qualityScore: number;
  modelEfficiency: Record<string, number>;
  brainUtilization: number[]; // 7 values for 7 brains
}

/** A detected improvement pattern that can be applied to future executions */
export interface ImprovementPattern {
  type: 'model-switch' | 'role-adjustment' | 'brain-reorder' | 'parallel-boost' | 'failover-tuning';
  description: string;
  confidence: number;
  appliedAt?: number;
  result?: 'improved' | 'neutral' | 'degraded';
}

/** Kernel statistics for monitoring */
export interface SwarmKernelStats {
  executions: number;
  avgQuality: number;
  avgLatency: number;
  topModel: string;
  evolutionCount: number;
}

// ─── Learning Rate Constants ───────────────────────────

const LEARNING_RATE = 0.05;
const QUALITY_WEIGHT = 0.6;
const LATENCY_WEIGHT = 0.3;
const COST_WEIGHT = 0.1;
const MIN_EXECUTIONS_FOR_EVOLUTION = 3;
const IMPROVEMENT_CONFIDENCE_THRESHOLD = 0.7;
const MAX_HISTORY_SIZE = 500;
const BRAIN_COUNT = 7;

// ─── Default Model Scores ──────────────────────────────

const DEFAULT_MODEL_SCORES: Record<string, number> = {
  'gemini-2.5-pro': 0.82,
  'gemini-2.5-flash': 0.75,
  'gemini-2.5-flash-lite': 0.65,
  'gemini-3-pro-preview': 0.88,
  'claude-sonnet-4-20250514': 0.85,
  'deepseek-chat': 0.72,
  'gpt-4o': 0.78,
  'mistral-large-latest': 0.70,
  'glm-4-plus': 0.68,
};

// ─── Role-to-Model Affinity Map ────────────────────────

const ROLE_MODEL_AFFINITY: Record<string, Record<string, number>> = {
  planner: { 'gemini-2.5-pro': 0.9, 'gemini-3-pro-preview': 0.95, 'claude-sonnet-4-20250514': 0.7 },
  architect: { 'claude-sonnet-4-20250514': 0.95, 'gemini-2.5-pro': 0.8, 'gemini-3-pro-preview': 0.85 },
  coder: { 'deepseek-chat': 0.9, 'claude-sonnet-4-20250514': 0.8, 'gpt-4o': 0.75 },
  researcher: { 'gemini-2.5-pro': 0.85, 'glm-4-plus': 0.8, 'gpt-4o': 0.75 },
  reviewer: { 'claude-sonnet-4-20250514': 0.9, 'gpt-4o': 0.8, 'gemini-2.5-pro': 0.75 },
  verifier: { 'gpt-4o': 0.85, 'claude-sonnet-4-20250514': 0.8 },
  security: { 'mistral-large-latest': 0.85, 'claude-sonnet-4-20250514': 0.8 },
  executor: { 'deepseek-chat': 0.85, 'gemini-2.5-flash': 0.8, 'gpt-4o': 0.7 },
};

// ─── Task Type Keywords ────────────────────────────────

const TASK_TYPE_PATTERNS: Record<string, RegExp[]> = {
  coding: [/code/i, /build/i, /implement/i, /develop/i, /program/i, /function/i, /debug/i],
  research: [/research/i, /analyze/i, /investigate/i, /study/i, /explore/i],
  architecture: [/architect/i, /design/i, /system/i, /structure/i, /pattern/i],
  review: [/review/i, /audit/i, /verify/i, /validate/i, /check/i],
  deployment: [/deploy/i, /ci.?cd/i, /pipeline/i, /release/i, /publish/i],
  security: [/security/i, /vulnerability/i, /penetration/i, /exploit/i],
  data: [/data/i, /analytics/i, /metrics/i, /dashboard/i, /visualization/i],
  testing: [/test/i, /spec/i, /coverage/i, /qa/i],
};

// ─── SwarmKernel Class ─────────────────────────────────

/**
 * Self-evolving swarm kernel that continuously analyzes execution results,
 * optimizes swarm composition, adjusts agent roles dynamically, improves
 * model routing strategy, and evolves performance heuristics over time.
 *
 * Uses a gradient-descent-like improvement system where each execution
 * adjusts scores up/down based on quality and latency outcomes.
 */
export class SwarmKernel {
  private executionHistory: SwarmExecution[] = [];
  private improvementPatterns: ImprovementPattern[] = [];
  private modelScores: Map<string, number> = new Map();
  private brainScores: number[] = Array.from({ length: BRAIN_COUNT }, () => 0.5);
  private evolutionCount: number = 0;
  private roleModelScores: Map<string, Map<string, number>> = new Map();
  private taskModelScores: Map<string, Map<string, number>> = new Map();
  private lastEvolutionTime: number = 0;

  constructor() {
    // Initialize model scores from defaults
    for (const [model, score] of Object.entries(DEFAULT_MODEL_SCORES)) {
      this.modelScores.set(model, score);
    }
    // Initialize role-model affinity scores
    for (const [role, affinities] of Object.entries(ROLE_MODEL_AFFINITY)) {
      const roleMap = new Map<string, number>();
      for (const [model, affinity] of Object.entries(affinities)) {
        roleMap.set(model, affinity);
      }
      this.roleModelScores.set(role, roleMap);
    }
  }

  // ─── Post-Execution Analysis ─────────────────────────

  /**
   * Analyze a completed execution and generate improvement patterns.
   * This is the core self-evolution method — called after every execution
   * to continuously refine the kernel's heuristics.
   *
   * @param execution - The completed swarm execution to analyze
   * @returns Array of detected improvement patterns
   */
  async postExecutionAnalysis(execution: SwarmExecution): Promise<ImprovementPattern[]> {
    // Store execution in history (bounded)
    this.executionHistory.push(execution);
    if (this.executionHistory.length > MAX_HISTORY_SIZE) {
      this.executionHistory.shift();
    }

    const improvements: ImprovementPattern[] = [];

    // 1. Analyze model performance and adjust scores
    this.adjustModelScores(execution);

    // 2. Analyze brain layer utilization
    this.adjustBrainScores(execution);

    // 3. Detect model-switch improvements
    const modelSwitchImprovement = this.detectModelSwitchOpportunity(execution);
    if (modelSwitchImprovement) {
      improvements.push(modelSwitchImprovement);
    }

    // 4. Detect role-adjustment opportunities
    const roleImprovement = this.detectRoleAdjustmentOpportunity(execution);
    if (roleImprovement) {
      improvements.push(roleImprovement);
    }

    // 5. Detect brain-reorder opportunities
    const brainImprovement = this.detectBrainReorderOpportunity(execution);
    if (brainImprovement) {
      improvements.push(brainImprovement);
    }

    // 6. Detect parallel execution opportunities
    const parallelImprovement = this.detectParallelBoostOpportunity(execution);
    if (parallelImprovement) {
      improvements.push(parallelImprovement);
    }

    // 7. Detect failover tuning opportunities
    const failoverImprovement = this.detectFailoverTuningOpportunity(execution);
    if (failoverImprovement) {
      improvements.push(failoverImprovement);
    }

    // Store improvements
    for (const improvement of improvements) {
      this.improvementPatterns.push(improvement);
    }

    // Trim improvement history
    if (this.improvementPatterns.length > MAX_HISTORY_SIZE) {
      this.improvementPatterns = this.improvementPatterns.slice(-MAX_HISTORY_SIZE);
    }

    // Trigger evolution if enough data accumulated
    if (this.executionHistory.length >= MIN_EXECUTIONS_FOR_EVOLUTION &&
        Date.now() - this.lastEvolutionTime > 30000) {
      this.evolve();
    }

    return improvements;
  }

  // ─── Model Score Adjustment (Gradient Descent) ───────

  /**
   * Adjust model scores using a gradient-descent-like approach.
   * High quality + low latency = positive gradient (score increases).
   * Low quality + high latency = negative gradient (score decreases).
   */
  private adjustModelScores(execution: SwarmExecution): void {
    const modelPerformances = new Map<string, { totalQuality: number; totalLatency: number; count: number }>();

    for (const agent of execution.agents) {
      const existing = modelPerformances.get(agent.model);
      if (existing) {
        existing.totalQuality += agent.quality;
        existing.totalLatency += agent.latency;
        existing.count += 1;
      } else {
        modelPerformances.set(agent.model, {
          totalQuality: agent.quality,
          totalLatency: agent.latency,
          count: 1,
        });
      }
    }

    // Apply gradient adjustments
    for (const [model, perf] of modelPerformances) {
      const avgQuality = perf.totalQuality / perf.count;
      const avgLatency = perf.totalLatency / perf.count;

      // Compute reward signal: quality is good, latency is bad
      const normalizedLatency = Math.min(avgLatency / 10000, 1); // normalize to 0-1
      const reward = (QUALITY_WEIGHT * avgQuality) - (LATENCY_WEIGHT * normalizedLatency);

      // Apply gradient step
      const currentScore = this.modelScores.get(model) ?? 0.5;
      const newScore = Math.max(0, Math.min(1, currentScore + LEARNING_RATE * (reward - currentScore)));
      this.modelScores.set(model, newScore);

      // Also update role-specific scores
      for (const agent of execution.agents) {
        if (agent.model === model) {
          const roleMap = this.roleModelScores.get(agent.role);
          if (roleMap) {
            const roleScore = roleMap.get(model) ?? 0.5;
            const newRoleScore = Math.max(0, Math.min(1, roleScore + LEARNING_RATE * (reward - roleScore)));
            roleMap.set(model, newRoleScore);
          }
        }
      }

      // Update task-type-specific scores
      const taskTypes = this.detectTaskTypes(execution.task);
      for (const taskType of taskTypes) {
        const taskMap = this.taskModelScores.get(taskType);
        if (taskMap) {
          const taskScore = taskMap.get(model) ?? 0.5;
          const newTaskScore = Math.max(0, Math.min(1, taskScore + LEARNING_RATE * (reward - taskScore)));
          taskMap.set(model, newTaskScore);
        } else {
          this.taskModelScores.set(taskType, new Map([[model, 0.5 + LEARNING_RATE * (reward - 0.5)]]));
        }
      }
    }
  }

  /**
   * Adjust brain layer scores based on utilization and quality data
   */
  private adjustBrainScores(execution: SwarmExecution): void {
    const metrics = execution.metrics;
    if (metrics.brainUtilization.length === BRAIN_COUNT) {
      for (let i = 0; i < BRAIN_COUNT; i++) {
        const utilization = metrics.brainUtilization[i] ?? 0;
        const quality = execution.agents
          .filter(a => a.brain === i + 1)
          .reduce((sum, a) => sum + a.quality, 0) /
          Math.max(1, execution.agents.filter(a => a.brain === i + 1).length);

        // Brain score goes up if well-utilized and high quality
        const signal = utilization > 0 ? quality * utilization : 0;
        this.brainScores[i] = Math.max(0, Math.min(1,
          this.brainScores[i] + LEARNING_RATE * (signal - this.brainScores[i])
        ));
      }
    }
  }

  // ─── Improvement Detection ───────────────────────────

  /**
   * Detect if a different model would have performed better for a given role
   */
  private detectModelSwitchOpportunity(execution: SwarmExecution): ImprovementPattern | null {
    for (const agent of execution.agents) {
      if (agent.quality < 0.5 && agent.status === 'completed') {
        // Find better model for this role
        const roleMap = this.roleModelScores.get(agent.role);
        if (roleMap) {
          let bestModel = agent.model;
          let bestScore = roleMap.get(agent.model) ?? 0;
          for (const [model, score] of roleMap) {
            if (score > bestScore) {
              bestScore = score;
              bestModel = model;
            }
          }
          if (bestModel !== agent.model) {
            return {
              type: 'model-switch',
              description: `Role "${agent.role}" performed poorly (quality: ${agent.quality.toFixed(2)}) with ${agent.model}. Consider switching to ${bestModel} (score: ${bestScore.toFixed(2)})`,
              confidence: Math.min(0.95, 0.5 + (0.5 - agent.quality)),
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Detect if roles should be adjusted based on execution patterns
   */
  private detectRoleAdjustmentOpportunity(execution: SwarmExecution): ImprovementPattern | null {
    const completedAgents = execution.agents.filter(a => a.status === 'completed');
    const failedAgents = execution.agents.filter(a => a.status === 'failed');

    // If some agents failed while same-role agents succeeded, suggest role adjustment
    if (failedAgents.length > 0 && completedAgents.length > 0) {
      for (const failed of failedAgents) {
        const sameRoleSuccess = completedAgents.find(a =>
          a.role === failed.role && a.agentId !== failed.agentId
        );
        if (sameRoleSuccess && sameRoleSuccess.quality > 0.7) {
          return {
            type: 'role-adjustment',
            description: `Agent ${failed.agentId} failed at role "${failed.role}" while ${sameRoleSuccess.agentId} succeeded. Consider consolidating to successful agent's model (${sameRoleSuccess.model})`,
            confidence: 0.75,
          };
        }
      }
    }

    // Check for underutilized roles (completed very fast with high quality = overkill)
    for (const agent of completedAgents) {
      if (agent.latency < 500 && agent.quality > 0.9 && agent.tokensUsed < 200) {
        return {
          type: 'role-adjustment',
          description: `Role "${agent.role}" completed very fast with high quality using ${agent.model}. Consider using a lighter model to reduce cost`,
          confidence: 0.6,
        };
      }
    }

    return null;
  }

  /**
   * Detect if brain layer ordering should be changed
   */
  private detectBrainReorderOpportunity(execution: SwarmExecution): ImprovementPattern | null {
    // Find brain layers with very low quality that might be better positioned
    const lowQualityBrains = execution.agents
      .filter(a => a.status === 'completed' && a.quality < 0.4)
      .map(a => a.brain);

    if (lowQualityBrains.length > 0) {
      const brain = lowQualityBrains[0]!;
      return {
        type: 'brain-reorder',
        description: `Brain layer ${brain} produced low-quality output. Consider reordering pipeline or providing better context from previous layers`,
        confidence: 0.65,
      };
    }
    return null;
  }

  /**
   * Detect opportunities for parallel execution to speed up pipelines
   */
  private detectParallelBoostOpportunity(execution: SwarmExecution): ImprovementPattern | null {
    const totalLatency = execution.metrics.totalLatency;
    const sumIndividualLatencies = execution.agents.reduce((sum, a) => sum + a.latency, 0);

    // If total latency ≈ sum of individual latencies, there's parallelism opportunity
    if (totalLatency > 0 && sumIndividualLatencies > 0) {
      const parallelismRatio = sumIndividualLatencies / totalLatency;
      if (parallelismRatio < 1.3 && execution.agents.length >= 3) {
        // Sequential execution detected with enough agents — parallel boost possible
        return {
          type: 'parallel-boost',
          description: `Low parallelism detected (ratio: ${parallelismRatio.toFixed(2)}). Consider running independent agents in parallel to reduce total latency`,
          confidence: Math.min(0.9, 0.5 + (1.5 - parallelismRatio) * 0.4),
        };
      }
    }
    return null;
  }

  /**
   * Detect failover tuning opportunities from failure patterns
   */
  private detectFailoverTuningOpportunity(execution: SwarmExecution): ImprovementPattern | null {
    const failedAgents = execution.agents.filter(a => a.status === 'failed');
    if (failedAgents.length > 0) {
      // Check if we've seen this model fail before
      const recentFailures = this.executionHistory.slice(-10).flatMap(e =>
        e.agents.filter(a => a.status === 'failed')
      );

      const modelFailureCounts = new Map<string, number>();
      for (const fail of recentFailures) {
        modelFailureCounts.set(fail.model, (modelFailureCounts.get(fail.model) ?? 0) + 1);
      }

      for (const [model, count] of modelFailureCounts) {
        if (count >= 2) {
          return {
            type: 'failover-tuning',
            description: `Model ${model} has failed ${count} times recently. Adjust failover chain to deprioritize this model`,
            confidence: Math.min(0.95, 0.5 + count * 0.1),
          };
        }
      }
    }
    return null;
  }

  // ─── Public Query Methods ────────────────────────────

  /**
   * Get the optimal model for a given role and task type.
   * Combines general model scores with role-specific and task-specific affinities.
   *
   * @param role - The agent role (e.g., 'planner', 'coder', 'reviewer')
   * @param taskType - The type of task (e.g., 'coding', 'research')
   * @returns The model ID with the highest expected performance
   */
  getOptimalModel(role: string, taskType: string): string {
    const candidates = Array.from(this.modelScores.keys());
    let bestModel = candidates[0] ?? 'gemini-2.5-flash';
    let bestScore = -1;

    for (const model of candidates) {
      const baseScore = this.modelScores.get(model) ?? 0.5;

      // Role affinity
      const roleMap = this.roleModelScores.get(role);
      const roleScore = roleMap?.get(model) ?? baseScore;

      // Task type affinity
      const taskMap = this.taskModelScores.get(taskType);
      const taskScore = taskMap?.get(model) ?? baseScore;

      // Weighted combination
      const combinedScore = 0.3 * baseScore + 0.4 * roleScore + 0.3 * taskScore;

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestModel = model;
      }
    }

    return bestModel;
  }

  /**
   * Get the optimal brain layer sequence for a given task.
   * Returns brain IDs ordered by predicted effectiveness.
   *
   * @param task - The task description
   * @returns Array of brain IDs (1-7) in optimal order
   */
  getOptimalBrainSequence(task: string): number[] {
    const taskTypes = this.detectTaskTypes(task);

    // Determine which brains are most relevant for this task type
    const brainRelevance: number[] = this.brainScores.map((baseScore, idx) => {
      const brainId = idx + 1;
      let relevance = baseScore;

      // Boost relevance based on task type
      for (const taskType of taskTypes) {
        switch (taskType) {
          case 'coding':
            if (brainId === 3 || brainId === 6) relevance += 0.2; // Coding, Execution
            break;
          case 'research':
            if (brainId === 4 || brainId === 5) relevance += 0.2; // Research, Analysis
            break;
          case 'architecture':
            if (brainId === 1 || brainId === 2) relevance += 0.2; // Planning, Architecture
            break;
          case 'review':
            if (brainId === 5 || brainId === 7) relevance += 0.2; // Analysis, Optimization
            break;
          case 'deployment':
            if (brainId === 6 || brainId === 7) relevance += 0.2; // Execution, Optimization
            break;
          case 'security':
            if (brainId === 5 || brainId === 7) relevance += 0.15;
            break;
          case 'testing':
            if (brainId === 5 || brainId === 7) relevance += 0.2;
            break;
        }
      }

      return Math.min(1, relevance);
    });

    // Always start with brain 1 (Planning) — it's foundational
    // Sort remaining brains by relevance, keeping planning first
    const sequence = [1];
    const remaining = brainRelevance
      .map((score, idx) => ({ id: idx + 1, score }))
      .filter(b => b.id !== 1)
      .sort((a, b) => b.score - a.score)
      .map(b => b.id);

    return [...sequence, ...remaining];
  }

  /**
   * Self-evolve: adjust heuristics based on accumulated execution data.
   * This method runs periodically to refine the kernel's internal models.
   * It applies verified improvement patterns and prunes stale data.
   */
  evolve(): void {
    this.evolutionCount++;
    this.lastEvolutionTime = Date.now();

    // 1. Apply verified improvement patterns
    const verifiedPatterns = this.improvementPatterns.filter(
      p => p.result === 'improved' && p.confidence >= IMPROVEMENT_CONFIDENCE_THRESHOLD
    );

    for (const pattern of verifiedPatterns) {
      switch (pattern.type) {
        case 'model-switch': {
          // Extract model names from description
          const fromMatch = pattern.description.match(/with (\S+)/);
          const toMatch = pattern.description.match(/to (\S+)/);
          if (fromMatch && toMatch) {
            const fromModel = fromMatch[1]!;
            const toModel = toMatch[1]!;
            // Boost the target model score
            const currentScore = this.modelScores.get(toModel) ?? 0.5;
            this.modelScores.set(toModel, Math.min(1, currentScore + 0.02));
            // Slightly reduce the source model score
            const fromScore = this.modelScores.get(fromModel) ?? 0.5;
            this.modelScores.set(fromModel, Math.max(0, fromScore - 0.01));
          }
          break;
        }
        case 'failover-tuning': {
          const modelMatch = pattern.description.match(/Model (\S+)/);
          if (modelMatch) {
            const failingModel = modelMatch[1]!;
            const currentScore = this.modelScores.get(failingModel) ?? 0.5;
            this.modelScores.set(failingModel, Math.max(0, currentScore - 0.03));
          }
          break;
        }
        case 'brain-reorder': {
          const brainMatch = pattern.description.match(/layer (\d+)/);
          if (brainMatch) {
            const brainIdx = parseInt(brainMatch[1]!, 10) - 1;
            if (brainIdx >= 0 && brainIdx < BRAIN_COUNT) {
              this.brainScores[brainIdx] = Math.max(0, this.brainScores[brainIdx] - 0.02);
            }
          }
          break;
        }
      }
    }

    // 2. Prune patterns that were degraded (negative signal)
    this.improvementPatterns = this.improvementPatterns.filter(
      p => p.result !== 'degraded'
    );

    // 3. Recalibrate model scores based on recent performance trends
    const recentExecutions = this.executionHistory.slice(-20);
    if (recentExecutions.length >= MIN_EXECUTIONS_FOR_EVOLUTION) {
      const modelRecentPerformance = new Map<string, { quality: number; count: number }>();

      for (const exec of recentExecutions) {
        for (const agent of exec.agents) {
          if (agent.status === 'completed') {
            const existing = modelRecentPerformance.get(agent.model);
            if (existing) {
              existing.quality += agent.quality;
              existing.count += 1;
            } else {
              modelRecentPerformance.set(agent.model, { quality: agent.quality, count: 1 });
            }
          }
        }
      }

      // Apply gentle regression toward recent mean
      for (const [model, perf] of modelRecentPerformance) {
        const avgQuality = perf.quality / perf.count;
        const currentScore = this.modelScores.get(model) ?? 0.5;
        const adjustedScore = currentScore * 0.9 + avgQuality * 0.1;
        this.modelScores.set(model, Math.max(0, Math.min(1, adjustedScore)));
      }
    }

    // 4. Decay old brain scores slightly (forgetting curve)
    for (let i = 0; i < BRAIN_COUNT; i++) {
      this.brainScores[i] = this.brainScores[i] * 0.98 + 0.5 * 0.02;
    }
  }

  /**
   * Get current kernel statistics
   *
   * @returns Object with execution count, average quality, latency, top model, and evolution count
   */
  getStats(): SwarmKernelStats {
    const completedExecutions = this.executionHistory.filter(e => e.status === 'completed');
    const totalExecutions = this.executionHistory.length;

    const avgQuality = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + e.metrics.qualityScore, 0) / completedExecutions.length
      : 0;

    const avgLatency = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + e.metrics.totalLatency, 0) / completedExecutions.length
      : 0;

    // Find top model by score
    let topModel = 'gemini-2.5-flash';
    let topScore = 0;
    for (const [model, score] of this.modelScores) {
      if (score > topScore) {
        topScore = score;
        topModel = model;
      }
    }

    return {
      executions: totalExecutions,
      avgQuality: Math.round(avgQuality * 1000) / 1000,
      avgLatency: Math.round(avgLatency),
      topModel,
      evolutionCount: this.evolutionCount,
    };
  }

  /**
   * Get all improvement patterns
   */
  getImprovementPatterns(): ImprovementPattern[] {
    return [...this.improvementPatterns];
  }

  /**
   * Get execution history (bounded to recent entries)
   */
  getExecutionHistory(limit: number = 50): SwarmExecution[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get model scores for all registered models
   */
  getModelScores(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [model, score] of this.modelScores) {
      result[model] = Math.round(score * 1000) / 1000;
    }
    return result;
  }

  /**
   * Get brain layer scores
   */
  getBrainScores(): number[] {
    return this.brainScores.map(s => Math.round(s * 1000) / 1000);
  }

  /**
   * Mark an improvement pattern as applied with a result
   */
  markImprovementResult(index: number, result: 'improved' | 'neutral' | 'degraded'): void {
    if (index >= 0 && index < this.improvementPatterns.length) {
      this.improvementPatterns[index]!.appliedAt = Date.now();
      this.improvementPatterns[index]!.result = result;
    }
  }

  // ─── Utility Methods ────────────────────────────────

  /**
   * Detect task types from a task description
   */
  private detectTaskTypes(task: string): string[] {
    const types: string[] = [];
    for (const [type, patterns] of Object.entries(TASK_TYPE_PATTERNS)) {
      if (patterns.some(p => p.test(task))) {
        types.push(type);
      }
    }
    if (types.length === 0) {
      types.push('coding'); // default fallback
    }
    return types;
  }

  /**
   * Generate a unique execution ID
   */
  generateExecutionId(): string {
    return `swarm-exec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ─── Singleton Instance ────────────────────────────────

/** Global swarm kernel instance — self-evolving, persistent across the application lifecycle */
export const swarmKernel = new SwarmKernel();
