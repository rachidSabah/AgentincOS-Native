// ============================================================
// Agentic OS X — Agent Runtime with DNA System
// ============================================================
import type {
  ExtendedAgentType,
  AgentStatus,
  AgentConfig,
  AgentMessage,
  AgentDNA,
  AgentMemory,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { modelRouter } from './model-router';

// ─── Agent Skills ────────────────────────────────────────────
const AGENT_SKILLS: Record<ExtendedAgentType, string[]> = {
  planner: ['task_decomposition', 'prioritization', 'scheduling', 'resource_allocation'],
  architect: ['system_design', 'pattern_selection', 'component_modeling', 'api_design'],
  researcher: ['web_search', 'document_analysis', 'data_extraction', 'synthesis'],
  coder: ['code_generation', 'debugging', 'refactoring', 'testing'],
  reviewer: ['code_review', 'quality_assessment', 'best_practices', 'feedback'],
  verifier: ['validation', 'compliance_check', 'assertion_testing', 'certification'],
  memory: ['context_retrieval', 'knowledge_indexing', 'summarization', 'association'],
  devops: ['ci_cd_pipeline', 'infrastructure_as_code', 'monitoring', 'containerization'],
  security: ['vulnerability_scanning', 'penetration_testing', 'threat_modeling', 'compliance_audit'],
  testing: ['unit_testing', 'integration_testing', 'e2e_testing', 'performance_testing'],
  uiux: ['user_research', 'wireframing', 'prototyping', 'accessibility_audit'],
  seo: ['keyword_analysis', 'content_optimization', 'technical_seo', 'analytics'],
  automation: ['workflow_design', 'script_generation', 'task_automation', 'orchestration'],
  business: ['market_analysis', 'strategy_planning', 'roi_calculation', 'stakeholder_communication'],
  recruitment: ['candidate_screening', 'interview_design', 'skill_assessment', 'onboarding'],
  aviation: ['flight_planning', 'weather_analysis', 'route_optimization', 'safety_compliance'],
  database: ['schema_design', 'query_optimization', 'migration_planning', 'data_modeling'],
  documentation: ['api_documentation', 'technical_writing', 'diagram_generation', 'onboarding_guides'],
  deployment: ['release_management', 'rollback_planning', 'environment_config', 'feature_flags'],
};

// ─── Agent Tools ─────────────────────────────────────────────
const AGENT_TOOLS: Record<ExtendedAgentType, string[]> = {
  planner: ['llm', 'scheduler', 'calendar'],
  architect: ['llm', 'diagram_generator', 'schema_validator'],
  researcher: ['llm', 'web_search', 'document_parser'],
  coder: ['llm', 'code_runner', 'file_system', 'version_control'],
  reviewer: ['llm', 'linter', 'diff_viewer'],
  verifier: ['llm', 'test_runner', 'assertion_engine'],
  memory: ['llm', 'vector_store', 'graph_database'],
  devops: ['llm', 'docker', 'kubernetes', 'terraform'],
  security: ['llm', 'scanner', 'dependency_auditor'],
  testing: ['llm', 'test_runner', 'coverage_analyzer', 'mock_generator'],
  uiux: ['llm', 'design_tool', 'color_palette', 'typography_engine'],
  seo: ['llm', 'keyword_tool', 'page_analyzer', 'rank_tracker'],
  automation: ['llm', 'script_engine', 'scheduler', 'webhook_manager'],
  business: ['llm', 'spreadsheet', 'chart_generator', 'report_builder'],
  recruitment: ['llm', 'resume_parser', 'skill_matcher', 'scheduler'],
  aviation: ['llm', 'weather_api', 'chart_plotter', 'notam_reader'],
  database: ['llm', 'query_runner', 'migration_tool', 'schema_analyzer'],
  documentation: ['llm', 'markdown_renderer', 'diagram_generator', 'api_inspector'],
  deployment: ['llm', 'release_manager', 'env_manager', 'health_checker'],
};

// ─── Agent System Prompts ────────────────────────────────────
const AGENT_SYSTEM_PROMPTS: Record<ExtendedAgentType, string> = {
  planner:
    'You are a Planning Agent. Decompose tasks into actionable steps, set priorities, allocate resources, and create schedules. Think systematically and produce clear, ordered plans.',
  architect:
    'You are an Architecture Agent. Design system architectures, select patterns, model components, and design APIs. Focus on scalability, maintainability, and clean separation of concerns.',
  researcher:
    'You are a Research Agent. Search the web, analyze documents, extract data, and synthesize findings. Provide well-sourced, accurate, and comprehensive research results.',
  coder:
    'You are a Coding Agent. Generate code, debug issues, refactor for quality, and write tests. Produce clean, type-safe, well-documented code following best practices.',
  reviewer:
    'You are a Review Agent. Review code for quality, assess adherence to best practices, and provide constructive feedback. Be thorough but actionable.',
  verifier:
    'You are a Verification Agent. Validate outputs against requirements, check compliance, run assertions, and certify results. Ensure correctness and completeness.',
  memory:
    'You are a Memory Agent. Retrieve relevant context, index knowledge, summarize information, and form associations. Help other agents access the right information at the right time.',
  devops:
    'You are a DevOps Agent. Design CI/CD pipelines, manage infrastructure as code, set up monitoring, and handle containerization. Ensure reliable, automated deployment workflows.',
  security:
    'You are a Security Agent. Scan for vulnerabilities, perform penetration testing, model threats, and audit compliance. Prioritize risk mitigation and secure-by-default practices.',
  testing:
    'You are a Testing Agent. Write and execute unit tests, integration tests, E2E tests, and performance tests. Ensure comprehensive coverage and reliable test suites.',
  uiux:
    'You are a UI/UX Agent. Conduct user research, create wireframes, build prototypes, and audit accessibility. Design intuitive, inclusive, and delightful user experiences.',
  seo:
    'You are an SEO Agent. Analyze keywords, optimize content, handle technical SEO, and track analytics. Improve search visibility and organic traffic.',
  automation:
    'You are an Automation Agent. Design workflows, generate scripts, automate repetitive tasks, and orchestrate multi-step processes. Maximize efficiency and minimize manual effort.',
  business:
    'You are a Business Agent. Analyze markets, plan strategies, calculate ROI, and communicate with stakeholders. Provide data-driven business insights and recommendations.',
  recruitment:
    'You are a Recruitment Agent. Screen candidates, design interviews, assess skills, and plan onboarding. Match talent to roles efficiently and fairly.',
  aviation:
    'You are an Aviation Agent. Plan flights, analyze weather, optimize routes, and ensure safety compliance. Follow aviation regulations and best practices.',
  database:
    'You are a Database Agent. Design schemas, optimize queries, plan migrations, and model data. Ensure data integrity, performance, and scalability.',
  documentation:
    'You are a Documentation Agent. Write API docs, technical guides, generate diagrams, and create onboarding materials. Produce clear, accurate, and well-structured documentation.',
  deployment:
    'You are a Deployment Agent. Manage releases, plan rollbacks, configure environments, and handle feature flags. Ensure smooth, safe, and repeatable deployments.',
};

// ─── Agent Display Names ─────────────────────────────────────
const AGENT_NAMES: Record<ExtendedAgentType, string> = {
  planner: 'Planner',
  architect: 'Architect',
  researcher: 'Researcher',
  coder: 'Coder',
  reviewer: 'Reviewer',
  verifier: 'Verifier',
  memory: 'Memory',
  devops: 'DevOps',
  security: 'Security',
  testing: 'Testing',
  uiux: 'UI/UX',
  seo: 'SEO',
  automation: 'Automation',
  business: 'Business',
  recruitment: 'Recruitment',
  aviation: 'Aviation',
  database: 'Database',
  documentation: 'Documentation',
  deployment: 'Deployment',
};

// ─── DNA Defaults ────────────────────────────────────────────
function createDefaultDNA(agentId: string, type: ExtendedAgentType): AgentDNA {
  return {
    agentId,
    knowledge: [`${type}_fundamentals`, `domain_${type}`],
    skills: [...AGENT_SKILLS[type]],
    tools: [...AGENT_TOOLS[type]],
    successRate: 0,
    failureRate: 0,
    experience: 0,
    learningHistory: [],
    preferredModels: ['openai', 'claude'],
    performanceHistory: [],
  };
}

// ─── Agent Memory Defaults ───────────────────────────────────
function createDefaultMemory(): AgentMemory {
  return {
    shortTerm: [],
    longTerm: [],
  };
}

// ─── Base Agent ──────────────────────────────────────────────
abstract class BaseAgent {
  id: string;
  name: string;
  type: ExtendedAgentType;
  status: AgentStatus;
  currentTask: string | null;
  createdAt: number;
  lastActiveAt: number;
  dna: AgentDNA;
  memory: AgentMemory;

  constructor(name: string, type: ExtendedAgentType) {
    this.id = uuidv4();
    this.name = name;
    this.type = type;
    this.status = 'idle';
    this.currentTask = null;
    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();
    this.dna = createDefaultDNA(this.id, type);
    this.memory = createDefaultMemory();
  }

  /** Get the system prompt for this agent type */
  getSystemPrompt(): string {
    return AGENT_SYSTEM_PROMPTS[this.type];
  }

  /** Get the skills for this agent type */
  getSkills(): string[] {
    return this.dna.skills;
  }

  /** Get the tools for this agent type */
  getTools(): string[] {
    return this.dna.tools;
  }

  /** Execute a task — subclasses may override for custom behavior */
  abstract execute(task: string): Promise<AgentMessage>;

  /** Execute a task using the model router for AI-powered execution */
  protected async executeWithAI(task: string): Promise<string> {
    try {
      const response = await modelRouter.executeWithFailover({
        prompt: `You are a ${this.type} agent. Execute this task: ${task}`,
        systemPrompt: this.getSystemPrompt(),
        temperature: 0.3,
      });
      return response.content;
    } catch {
      return this.fallbackExecute(task);
    }
  }

  /** Fallback when AI execution is unavailable */
  protected fallbackExecute(task: string): string {
    return `[${this.name}] Processed task: ${task}`;
  }

  /** Update DNA after a task execution */
  protected updateDNA(task: string, outcome: 'success' | 'failure', durationMs: number): void {
    const totalTasks = this.dna.experience;
    const currentSuccesses = this.dna.successRate * totalTasks;
    const currentFailures = this.dna.failureRate * totalTasks;

    this.dna.experience += 1;

    if (outcome === 'success') {
      this.dna.successRate = (currentSuccesses + 1) / this.dna.experience;
      this.dna.failureRate = currentFailures / this.dna.experience;
    } else {
      this.dna.failureRate = (currentFailures + 1) / this.dna.experience;
      this.dna.successRate = currentSuccesses / this.dna.experience;
    }

    this.dna.learningHistory.push({
      task,
      outcome,
      timestamp: Date.now(),
    });

    // Keep learning history bounded
    if (this.dna.learningHistory.length > 500) {
      this.dna.learningHistory = this.dna.learningHistory.slice(-250);
    }

    this.dna.performanceHistory.push({
      metric: 'execution_duration_ms',
      value: durationMs,
      timestamp: Date.now(),
    });

    // Keep performance history bounded
    if (this.dna.performanceHistory.length > 1000) {
      this.dna.performanceHistory = this.dna.performanceHistory.slice(-500);
    }

    this.lastActiveAt = Date.now();
  }

  /** Store a short-term memory entry */
  protected storeShortTermMemory(key: string, value: string): void {
    this.memory.shortTerm.push({ key, value, timestamp: Date.now() });
    // Keep short-term memory bounded
    if (this.memory.shortTerm.length > 50) {
      this.memory.shortTerm = this.memory.shortTerm.slice(-25);
    }
  }

  /** Store a long-term memory entry */
  protected storeLongTermMemory(key: string, value: string, importance: number = 0.5): void {
    this.memory.longTerm.push({ key, value, timestamp: Date.now(), importance });
    // Keep long-term memory bounded, evict lowest importance first
    if (this.memory.longTerm.length > 200) {
      this.memory.longTerm.sort((a, b) => b.importance - a.importance);
      this.memory.longTerm = this.memory.longTerm.slice(0, 150);
    }
  }

  /** Retrieve short-term memory */
  getShortTermMemory(key?: string): Array<{ key: string; value: string; timestamp: number }> {
    if (key) return this.memory.shortTerm.filter((m) => m.key === key);
    return [...this.memory.shortTerm];
  }

  /** Retrieve long-term memory */
  getLongTermMemory(key?: string): Array<{ key: string; value: string; timestamp: number; importance: number }> {
    if (key) return this.memory.longTerm.filter((m) => m.key === key);
    return [...this.memory.longTerm];
  }

  /** Get agent status and config */
  getStatus(): AgentConfig {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      config: {},
      currentTask: this.currentTask ?? undefined,
      dna: this.dna,
      memory: this.memory,
    };
  }

  /** Create a message */
  protected createMessage(type: AgentMessage['type'], content: string): AgentMessage {
    return { id: uuidv4(), agentId: this.id, type, content, timestamp: Date.now() };
  }

  /** Get the experience score for swarm priority */
  getExperienceScore(): number {
    return this.dna.experience * this.dna.successRate;
  }
}

// ─── Concrete Agent Classes ──────────────────────────────────

class PlannerAgent extends BaseAgent {
  constructor() { super('Planner', 'planner'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`plan:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
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
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`arch:${Date.now()}`, result, 0.8);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
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
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`research:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
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
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`code:${Date.now()}`, result, 0.8);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
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
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`review:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
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
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`verify:${Date.now()}`, result, 0.8);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
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
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`memory:${Date.now()}`, result, 0.6);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class DevOpsAgent extends BaseAgent {
  constructor() { super('DevOps', 'devops'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`devops:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class SecurityAgent extends BaseAgent {
  constructor() { super('Security', 'security'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`security:${Date.now()}`, result, 0.8);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class TestingAgent extends BaseAgent {
  constructor() { super('Testing', 'testing'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`testing:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class UIUXAgent extends BaseAgent {
  constructor() { super('UI/UX', 'uiux'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`uiux:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class SEOAgent extends BaseAgent {
  constructor() { super('SEO', 'seo'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`seo:${Date.now()}`, result, 0.6);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class AutomationAgent extends BaseAgent {
  constructor() { super('Automation', 'automation'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`automation:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class BusinessAgent extends BaseAgent {
  constructor() { super('Business', 'business'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`business:${Date.now()}`, result, 0.6);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class RecruitmentAgent extends BaseAgent {
  constructor() { super('Recruitment', 'recruitment'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`recruitment:${Date.now()}`, result, 0.6);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class AviationAgent extends BaseAgent {
  constructor() { super('Aviation', 'aviation'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`aviation:${Date.now()}`, result, 0.9);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class DatabaseAgent extends BaseAgent {
  constructor() { super('Database', 'database'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`database:${Date.now()}`, result, 0.7);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class DocumentationAgent extends BaseAgent {
  constructor() { super('Documentation', 'documentation'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`docs:${Date.now()}`, result, 0.6);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

class DeploymentAgent extends BaseAgent {
  constructor() { super('Deployment', 'deployment'); }
  async execute(task: string): Promise<AgentMessage> {
    this.status = 'active';
    this.currentTask = task;
    const startTime = Date.now();
    try {
      this.storeShortTermMemory('current_task', task);
      const result = await this.executeWithAI(task);
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'success', durationMs);
      this.storeLongTermMemory(`deploy:${Date.now()}`, result, 0.8);
      return this.createMessage('result', result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateDNA(task, 'failure', durationMs);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return this.createMessage('error', msg);
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }
}

// ─── Agent Factory Map ───────────────────────────────────────
const AGENT_FACTORIES: Record<ExtendedAgentType, () => BaseAgent> = {
  planner: () => new PlannerAgent(),
  architect: () => new ArchitectAgent(),
  researcher: () => new ResearcherAgent(),
  coder: () => new CoderAgent(),
  reviewer: () => new ReviewerAgent(),
  verifier: () => new VerifierAgent(),
  memory: () => new MemoryAgent(),
  devops: () => new DevOpsAgent(),
  security: () => new SecurityAgent(),
  testing: () => new TestingAgent(),
  uiux: () => new UIUXAgent(),
  seo: () => new SEOAgent(),
  automation: () => new AutomationAgent(),
  business: () => new BusinessAgent(),
  recruitment: () => new RecruitmentAgent(),
  aviation: () => new AviationAgent(),
  database: () => new DatabaseAgent(),
  documentation: () => new DocumentationAgent(),
  deployment: () => new DeploymentAgent(),
};

// ─── Agent Registry ──────────────────────────────────────────
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private agentFactories: Map<ExtendedAgentType, () => BaseAgent> = new Map(
    Object.entries(AGENT_FACTORIES) as [ExtendedAgentType, () => BaseAgent][]
  );

  /** Register an agent */
  register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
  }

  /** Get an agent by ID */
  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  /** List all agents */
  list(): AgentConfig[] {
    return Array.from(this.agents.values()).map((a) => a.getStatus());
  }

  /** List agents by type */
  listByType(type: ExtendedAgentType): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((a) => a.type === type)
      .map((a) => a.getStatus());
  }

  /** List agents by status */
  listByStatus(status: AgentStatus): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((a) => a.status === status)
      .map((a) => a.getStatus());
  }

  /** List agents that have a specific capability/skill */
  listByCapability(skill: string): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter((a) => a.dna.skills.includes(skill))
      .map((a) => a.getStatus());
  }

  /** Spawn a new agent of the given type */
  spawn(type: ExtendedAgentType): BaseAgent {
    const factory = this.agentFactories.get(type);
    if (!factory) throw new Error(`Unknown agent type: ${type}`);
    const agent = factory();
    this.register(agent);
    return agent;
  }

  /** Remove an agent by ID */
  remove(id: string): boolean {
    return this.agents.delete(id);
  }

  /** Find the best agent for a given task based on DNA and experience */
  findBestForTask(task: string, preferredType?: ExtendedAgentType): BaseAgent | undefined {
    const candidates = Array.from(this.agents.values()).filter((a) => a.status === 'idle');

    if (candidates.length === 0) return undefined;

    // If a preferred type is specified, prefer agents of that type
    if (preferredType) {
      const typeMatches = candidates.filter((a) => a.type === preferredType);
      if (typeMatches.length > 0) {
        return this.rankAgents(typeMatches, task);
      }
    }

    // Score all idle agents based on experience, success rate, and relevance
    return this.rankAgents(candidates, task);
  }

  /** Rank agents and return the best one */
  private rankAgents(candidates: BaseAgent[], _task: string): BaseAgent {
    return candidates.sort((a, b) => {
      // Primary sort: experience score (experience * successRate)
      const scoreA = a.getExperienceScore();
      const scoreB = b.getExperienceScore();
      if (scoreB !== scoreA) return scoreB - scoreA;

      // Secondary sort: success rate
      if (b.dna.successRate !== a.dna.successRate) return b.dna.successRate - a.dna.successRate;

      // Tertiary sort: most recently active
      return b.lastActiveAt - a.lastActiveAt;
    })[0];
  }

  /** Remove agents that have been idle past the timeout */
  removeIdleAgents(timeoutMs: number = IDLE_TIMEOUT_MS): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, agent] of this.agents.entries()) {
      if (agent.status === 'idle' && now - agent.lastActiveAt > timeoutMs) {
        this.agents.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /** Get aggregate statistics about all agents */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    avgExperience: number;
    avgSuccessRate: number;
    totalTasksCompleted: number;
  } {
    const agents = Array.from(this.agents.values());
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalExperience = 0;
    let totalSuccessRate = 0;
    let totalTasksCompleted = 0;

    for (const agent of agents) {
      byType[agent.type] = (byType[agent.type] ?? 0) + 1;
      byStatus[agent.status] = (byStatus[agent.status] ?? 0) + 1;
      totalExperience += agent.dna.experience;
      totalSuccessRate += agent.dna.successRate;
      totalTasksCompleted += agent.dna.experience;
    }

    const count = agents.length || 1; // avoid divide by zero

    return {
      total: agents.length,
      byType,
      byStatus,
      avgExperience: totalExperience / count,
      avgSuccessRate: totalSuccessRate / count,
      totalTasksCompleted,
    };
  }

  /** Get all supported agent types */
  getSupportedTypes(): ExtendedAgentType[] {
    return Array.from(this.agentFactories.keys());
  }

  /** Get skills for an agent type */
  getSkillsForType(type: ExtendedAgentType): string[] {
    return AGENT_SKILLS[type] ?? [];
  }

  /** Get tools for an agent type */
  getToolsForType(type: ExtendedAgentType): string[] {
    return AGENT_TOOLS[type] ?? [];
  }

  /** Get system prompt for an agent type */
  getSystemPromptForType(type: ExtendedAgentType): string {
    return AGENT_SYSTEM_PROMPTS[type] ?? '';
  }
}

export const agentRegistry = new AgentRegistry();

export {
  BaseAgent,
  PlannerAgent,
  ArchitectAgent,
  ResearcherAgent,
  CoderAgent,
  ReviewerAgent,
  VerifierAgent,
  MemoryAgent,
  DevOpsAgent,
  SecurityAgent,
  TestingAgent,
  UIUXAgent,
  SEOAgent,
  AutomationAgent,
  BusinessAgent,
  RecruitmentAgent,
  AviationAgent,
  DatabaseAgent,
  DocumentationAgent,
  DeploymentAgent,
  AGENT_SKILLS,
  AGENT_TOOLS,
  AGENT_SYSTEM_PROMPTS,
  AGENT_NAMES,
  AGENT_FACTORIES,
};
