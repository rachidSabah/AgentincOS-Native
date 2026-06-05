// ============================================================
// Agentic OS V2 — Auto-Swarm Formation Engine
// ============================================================
import type { TaskComplexity, SwarmConfig, SwarmStatus } from './types';
import { agentRegistry } from './agent-runtime';
import type { AgentType } from './types';
import { v4 as uuidv4 } from 'uuid';

const COMPLEXITY_AGENT_MAP: Record<TaskComplexity, AgentType[]> = {
  simple: ['coder'],
  medium: ['planner', 'coder', 'reviewer'],
  complex: ['planner', 'architect', 'researcher', 'coder', 'reviewer', 'verifier', 'memory'],
  enterprise: ['planner', 'architect', 'researcher', 'coder', 'reviewer', 'verifier', 'memory'],
};

class SwarmEngine {
  private swarms: Map<string, SwarmConfig> = new Map();

  analyzeComplexity(task: string): TaskComplexity {
    const words = task.split(' ');
    const hasMultipleSteps = words.length > 15;
    const hasComplexityKeywords = /enterprise|system|architecture|microservice|full.?stack|multi.?agent/i.test(task);
    const hasMediumKeywords = /design|build|create|implement|integrate/i.test(task);

    if (hasComplexityKeywords || words.length > 30) return 'complex';
    if (hasMultipleSteps || hasMediumKeywords) return 'medium';
    return 'simple';
  }

  autoFormSwarm(task: string, complexity?: TaskComplexity): SwarmConfig {
    const resolvedComplexity = complexity ?? this.analyzeComplexity(task);
    const agentTypes = COMPLEXITY_AGENT_MAP[resolvedComplexity];

    // Spawn agents for the swarm
    const agents = agentTypes.map((type) => agentRegistry.spawn(type));
    const agentIds = agents.map((a) => a.id);

    const swarm: SwarmConfig = {
      id: uuidv4(),
      task,
      complexity: resolvedComplexity,
      agentIds,
      status: 'active',
    };

    this.swarms.set(swarm.id, swarm);
    return swarm;
  }

  async executeSwarm(swarmId: string, task: string): Promise<{
    swarmId: string;
    results: Array<{ agentId: string; agentType: string; result: string; success: boolean }>;
    status: SwarmStatus;
    durationMs: number;
  }> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) throw new Error(`Swarm not found: ${swarmId}`);

    const startTime = Date.now();
    swarm.status = 'active';
    const results: Array<{ agentId: string; agentType: string; result: string; success: boolean }> = [];

    for (const agentId of swarm.agentIds) {
      const agent = agentRegistry.get(agentId);
      if (!agent) continue;

      try {
        const message = await agent.execute(task);
        results.push({
          agentId,
          agentType: agent.type,
          result: message.content,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          agentId,
          agentType: agent.type,
          result: errorMessage,
          success: false,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    const finalStatus: SwarmStatus = allSuccess ? 'completed' : 'failed';
    swarm.status = finalStatus;

    return {
      swarmId,
      results,
      status: finalStatus,
      durationMs: Date.now() - startTime,
    };
  }

  getSwarm(id: string): SwarmConfig | undefined {
    return this.swarms.get(id);
  }

  listSwarms(): SwarmConfig[] {
    return Array.from(this.swarms.values());
  }
}

export const swarmEngine = new SwarmEngine();
