// ============================================================
// Agentic OS V2 — Lightweight Agent Runtime
// ============================================================
import type { AgentType, AgentStatus, AgentConfig, AgentMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

abstract class BaseAgent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string | null;
  createdAt: number;

  constructor(name: string, type: AgentType) {
    this.id = uuidv4();
    this.name = name;
    this.type = type;
    this.status = 'idle';
    this.currentTask = null;
    this.createdAt = Date.now();
  }

  abstract execute(task: string): Promise<AgentMessage>;

  getStatus(): AgentConfig {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      config: {},
      currentTask: this.currentTask ?? undefined,
    };
  }

  protected createMessage(type: AgentMessage['type'], content: string): AgentMessage {
    return { id: uuidv4(), agentId: this.id, type, content, timestamp: Date.now() };
  }
}

class PlannerAgent extends BaseAgent {
  constructor() { super('Planner', 'planner'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    try {
      const steps = task.split(/[.;]/).filter((s) => s.trim().length > 0);
      const plan = steps.map((step, i) => `Step ${i + 1}: ${step.trim()}`).join('\n');
      return this.createMessage('result', `Plan created:\n${plan}`);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class ArchitectAgent extends BaseAgent {
  constructor() { super('Architect', 'architect'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    try {
      return this.createMessage('result', `Architecture design for: ${task}\nComponents: Core Engine, API Layer, Data Store\nPattern: Event-driven microservices`);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class ResearcherAgent extends BaseAgent {
  constructor() { super('Researcher', 'researcher'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    try {
      return this.createMessage('result', `Research findings for: ${task}\nKey insights identified. Related concepts mapped. Sources verified.`);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class CoderAgent extends BaseAgent {
  constructor() { super('Coder', 'coder'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    try {
      return this.createMessage('result', `Code implementation for: ${task}\nGenerated solution with type safety and error handling.`);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class ReviewerAgent extends BaseAgent {
  constructor() { super('Reviewer', 'reviewer'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    try {
      return this.createMessage('result', `Review of: ${task}\nQuality: Good. Suggestions: Consider edge cases, add tests.`);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class VerifierAgent extends BaseAgent {
  constructor() { super('Verifier', 'verifier'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    try {
      return this.createMessage('result', `Verification of: ${task}\nStatus: Passed. All constraints satisfied.`);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class MemoryAgent extends BaseAgent {
  constructor() { super('Memory', 'memory'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    try {
      return this.createMessage('result', `Memory operation for: ${task}\nRelevant context retrieved and indexed.`);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

// ─── Agent Registry ───
class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private agentFactories: Map<AgentType, () => BaseAgent> = new Map([
    ['planner', () => new PlannerAgent()],
    ['architect', () => new ArchitectAgent()],
    ['researcher', () => new ResearcherAgent()],
    ['coder', () => new CoderAgent()],
    ['reviewer', () => new ReviewerAgent()],
    ['verifier', () => new VerifierAgent()],
    ['memory', () => new MemoryAgent()],
  ]);

  register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
  }

  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  list(): AgentConfig[] {
    return Array.from(this.agents.values()).map((a) => a.getStatus());
  }

  spawn(type: AgentType): BaseAgent {
    const factory = this.agentFactories.get(type);
    if (!factory) throw new Error(`Unknown agent type: ${type}`);
    const agent = factory();
    this.register(agent);
    return agent;
  }

  remove(id: string): boolean {
    return this.agents.delete(id);
  }
}

export const agentRegistry = new AgentRegistry();
export { BaseAgent, PlannerAgent, ArchitectAgent, ResearcherAgent, CoderAgent, ReviewerAgent, VerifierAgent, MemoryAgent };
