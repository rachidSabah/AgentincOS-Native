// ============================================================
// Agentic OS X — On-Demand Swarm Engine
// Prebuilt Templates, Auto-Destruction, Resource Cleanup,
// Phase-Based Parallel Execution, Shared Memory, Real-Time Map
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
  SwarmTemplateName,
  SwarmTemplate,
  SwarmTemplateAgentSlot,
} from './types';
import { agentRegistry } from './agent-runtime';
import { v4 as uuidv4 } from 'uuid';

// ─── Constants ──────────────────────────────────────────────
const DEFAULT_RETENTION_COMPLETED_MS = 60_000;   // 60 seconds
const DEFAULT_RETENTION_FAILED_MS    = 300_000;   // 300 seconds (5 min)
const CLEANUP_INTERVAL_MS            = 15_000;    // Run cleanup every 15 seconds
const SWARM_SPAWN_TARGET_MS          = 2_000;     // Performance target

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

// ─── Prebuilt Swarm Templates ───────────────────────────────
const SWARM_TEMPLATES: Record<SwarmTemplateName, SwarmTemplate> = {
  software_factory: {
    name: 'Software Factory',
    description: 'Full-stack software development pipeline: planning, coding, reviewing, and verification for production-grade applications.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Tech Lead' },
      { role: 'coordinator', agentType: 'architect', label: 'Architect' },
      { role: 'worker', agentType: 'coder', label: 'Backend Developer' },
      { role: 'worker', agentType: 'coder', label: 'Frontend Developer' },
      { role: 'worker', agentType: 'researcher', label: 'Dev Researcher' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Code Reviewer' },
      { role: 'verifier', agentType: 'verifier', label: 'QA Engineer' },
      { role: 'memory_agent', agentType: 'memory', label: 'Context Keeper' },
    ],
    complexity: 'complex',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  research: {
    name: 'Research Swarm',
    description: 'Deep research and analysis team: discovers sources, synthesizes findings, and produces comprehensive reports.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Research Director' },
      { role: 'worker', agentType: 'researcher', label: 'Primary Researcher' },
      { role: 'worker', agentType: 'researcher', label: 'Secondary Researcher' },
      { role: 'knowledge_agent', agentType: 'researcher', label: 'Knowledge Specialist' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Peer Reviewer' },
      { role: 'memory_agent', agentType: 'memory', label: 'Research Librarian' },
    ],
    complexity: 'medium',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  marketing: {
    name: 'Marketing Swarm',
    description: 'End-to-end marketing team: strategy, content creation, SEO optimization, and campaign management.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Marketing Director' },
      { role: 'coordinator', agentType: 'architect', label: 'Campaign Manager' },
      { role: 'worker', agentType: 'coder', label: 'Content Creator' },
      { role: 'worker', agentType: 'seo', label: 'SEO Specialist' },
      { role: 'worker', agentType: 'business', label: 'Brand Strategist' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Brand Reviewer' },
      { role: 'memory_agent', agentType: 'memory', label: 'Asset Librarian' },
    ],
    complexity: 'medium',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  recruitment: {
    name: 'Recruitment Swarm',
    description: 'Talent acquisition team: job description creation, candidate sourcing, screening, and interview coordination.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Recruitment Lead' },
      { role: 'coordinator', agentType: 'architect', label: 'HR Coordinator' },
      { role: 'worker', agentType: 'recruitment', label: 'Sourcer' },
      { role: 'worker', agentType: 'recruitment', label: 'Screening Specialist' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Hiring Manager' },
      { role: 'memory_agent', agentType: 'memory', label: 'Candidate Tracker' },
    ],
    complexity: 'medium',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  security: {
    name: 'Security Swarm',
    description: 'Cybersecurity team: threat analysis, vulnerability scanning, penetration testing, and security hardening.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Security Lead' },
      { role: 'coordinator', agentType: 'architect', label: 'SOC Coordinator' },
      { role: 'worker', agentType: 'security', label: 'Threat Analyst' },
      { role: 'worker', agentType: 'security', label: 'Pen Tester' },
      { role: 'worker', agentType: 'security', label: 'Hardening Specialist' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Security Auditor' },
      { role: 'verifier', agentType: 'verifier', label: 'Compliance Checker' },
      { role: 'memory_agent', agentType: 'memory', label: 'Threat Intel DB' },
    ],
    complexity: 'complex',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  data: {
    name: 'Data Swarm',
    description: 'Data engineering and analytics team: ETL pipelines, data modeling, statistical analysis, and visualization.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Data Lead' },
      { role: 'coordinator', agentType: 'architect', label: 'Data Architect' },
      { role: 'worker', agentType: 'database', label: 'Data Engineer' },
      { role: 'worker', agentType: 'researcher', label: 'Data Analyst' },
      { role: 'worker', agentType: 'coder', label: 'Pipeline Developer' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Data Quality Reviewer' },
      { role: 'verifier', agentType: 'verifier', label: 'Data Validator' },
      { role: 'memory_agent', agentType: 'memory', label: 'Metadata Store' },
    ],
    complexity: 'complex',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  knowledge: {
    name: 'Knowledge Swarm',
    description: 'Knowledge management team: document processing, indexing, retrieval optimization, and knowledge graph construction.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Knowledge Director' },
      { role: 'worker', agentType: 'researcher', label: 'Content Analyst' },
      { role: 'worker', agentType: 'documentation', label: 'Documentation Specialist' },
      { role: 'knowledge_agent', agentType: 'researcher', label: 'Knowledge Engineer' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Quality Reviewer' },
      { role: 'memory_agent', agentType: 'memory', label: 'Index Manager' },
    ],
    complexity: 'medium',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  devops: {
    name: 'DevOps Swarm',
    description: 'DevOps and SRE team: CI/CD pipelines, infrastructure automation, monitoring, and incident response.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'DevOps Lead' },
      { role: 'coordinator', agentType: 'architect', label: 'Release Manager' },
      { role: 'worker', agentType: 'devops', label: 'CI/CD Engineer' },
      { role: 'worker', agentType: 'devops', label: 'Infrastructure Engineer' },
      { role: 'worker', agentType: 'automation', label: 'Automation Specialist' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Change Reviewer' },
      { role: 'verifier', agentType: 'verifier', label: 'Deployment Validator' },
      { role: 'memory_agent', agentType: 'memory', label: 'Config Store' },
    ],
    complexity: 'complex',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  cloud_infrastructure: {
    name: 'Cloud Infrastructure Swarm',
    description: 'Cloud architecture and infrastructure team: multi-cloud provisioning, cost optimization, scalability, and disaster recovery.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Cloud Architect Lead' },
      { role: 'coordinator', agentType: 'architect', label: 'Cloud Coordinator' },
      { role: 'worker', agentType: 'devops', label: 'Cloud Provisioner' },
      { role: 'worker', agentType: 'security', label: 'Cloud Security Specialist' },
      { role: 'worker', agentType: 'database', label: 'Cloud DBA' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Cost Optimizer' },
      { role: 'verifier', agentType: 'verifier', label: 'Infrastructure Validator' },
      { role: 'memory_agent', agentType: 'memory', label: 'State Manager' },
    ],
    complexity: 'complex',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  wordpress: {
    name: 'WordPress Swarm',
    description: 'WordPress development team: theme development, plugin engineering, performance tuning, and security hardening.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'WP Project Lead' },
      { role: 'worker', agentType: 'coder', label: 'Theme Developer' },
      { role: 'worker', agentType: 'coder', label: 'Plugin Developer' },
      { role: 'worker', agentType: 'security', label: 'WP Security Specialist' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Code Reviewer' },
      { role: 'memory_agent', agentType: 'memory', label: 'WP Config Store' },
    ],
    complexity: 'medium',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  moodle: {
    name: 'Moodle Swarm',
    description: 'Moodle LMS team: course design, plugin development, user management, and platform optimization.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Moodle Lead' },
      { role: 'worker', agentType: 'coder', label: 'Moodle Developer' },
      { role: 'worker', agentType: 'researcher', label: 'Instructional Designer' },
      { role: 'worker', agentType: 'database', label: 'DB Specialist' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Platform Reviewer' },
      { role: 'memory_agent', agentType: 'memory', label: 'Course Data Store' },
    ],
    complexity: 'medium',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  aviation_recruitment: {
    name: 'Aviation Recruitment Swarm',
    description: 'Aviation industry talent acquisition: pilot sourcing, crew recruitment, regulatory compliance, and safety qualification verification.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Aviation Recruitment Director' },
      { role: 'coordinator', agentType: 'architect', label: 'Crew Planning Coordinator' },
      { role: 'worker', agentType: 'aviation', label: 'Pilot Recruiter' },
      { role: 'worker', agentType: 'recruitment', label: 'Cabin Crew Recruiter' },
      { role: 'worker', agentType: 'security', label: 'Compliance & Safety Officer' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Qualification Reviewer' },
      { role: 'verifier', agentType: 'verifier', label: 'License Verifier' },
      { role: 'memory_agent', agentType: 'memory', label: 'Candidate Database' },
    ],
    complexity: 'complex',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  customer_success: {
    name: 'Customer Success Swarm',
    description: 'Customer success and support team: onboarding, issue resolution, health scoring, and retention optimization.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'CS Director' },
      { role: 'coordinator', agentType: 'architect', label: 'Account Coordinator' },
      { role: 'worker', agentType: 'business', label: 'Onboarding Specialist' },
      { role: 'worker', agentType: 'automation', label: 'Support Automation Engineer' },
      { role: 'reviewer', agentType: 'reviewer', label: 'CS Quality Reviewer' },
      { role: 'memory_agent', agentType: 'memory', label: 'Customer Context Store' },
    ],
    complexity: 'medium',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
  executive_planning: {
    name: 'Executive Planning Swarm',
    description: 'Strategic executive team: market analysis, financial modeling, strategic planning, and board-level decision support.',
    agents: [
      { role: 'leader', agentType: 'planner', label: 'Chief Strategy Officer' },
      { role: 'coordinator', agentType: 'architect', label: 'Chief of Staff' },
      { role: 'worker', agentType: 'business', label: 'Market Analyst' },
      { role: 'worker', agentType: 'researcher', label: 'Competitive Intelligence' },
      { role: 'worker', agentType: 'business', label: 'Financial Modeler' },
      { role: 'reviewer', agentType: 'reviewer', label: 'Strategy Reviewer' },
      { role: 'verifier', agentType: 'verifier', label: 'Risk Assessor' },
      { role: 'knowledge_agent', agentType: 'researcher', label: 'Industry Expert' },
      { role: 'memory_agent', agentType: 'memory', label: 'Decision Archive' },
    ],
    complexity: 'complex',
    canParallelize: true,
    retentionMsCompleted: 60_000,
    retentionMsFailed: 300_000,
  },
};

// ─── Dependency Graph for Parallel Execution ────────────────
interface TaskDependencyNode {
  agentId: string;
  role: SwarmRoleType;
  dependsOn: SwarmRoleType[];
  phase: number;
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

// ─── Cleanup Event ──────────────────────────────────────────
interface SwarmCleanupEvent {
  swarmId: string;
  templateName?: SwarmTemplateName;
  status: SwarmStatus;
  lifetimeMs: number;
  agentsRemoved: number;
  memoryCleared: number;
  cleanedUpAt: number;
}

// ─── Retention Tracker ──────────────────────────────────────
interface SwarmRetentionEntry {
  swarmId: string;
  scheduledAt: number;
  destroyAt: number;
  templateName?: SwarmTemplateName;
}

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

    if (this.KEYWORDS_MULTI.test(task) || wordCount > 50) {
      return 'multi_swarm';
    }

    if (this.KEYWORDS_HIGH.test(task) || wordCount > 30) {
      return 'complex';
    }

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
  readonly templateName?: SwarmTemplateName;

  private _status: SwarmStatus;
  private _completedAt?: number;

  get completedAt(): number | undefined {
    return this._completedAt;
  }

  constructor(
    task: string,
    complexity: TaskComplexity,
    level: SwarmLevel,
    roles: SwarmRole[],
    agentIds: string[],
    parentSwarmId?: string,
    templateName?: SwarmTemplateName,
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
    this.templateName = templateName;
    this._status = 'forming';
  }

  get status(): SwarmStatus {
    return this._status;
  }

  set status(value: SwarmStatus) {
    this._status = value;
    if (value === 'completed' || value === 'failed' || value === 'cancelled') {
      this._completedAt = Date.now();
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
      completedAt: this._completedAt,
      parentSwarmId: this.parentSwarmId,
      childSwarmIds: this.childSwarmIds,
      artifacts: this.artifacts,
    };
  }
}

// ─── Swarm Network (On-Demand) ──────────────────────────────
class SwarmNetwork {
  private swarms: Map<string, Swarm> = new Map();
  private complexityAnalyzer: ComplexityAnalyzer = new ComplexityAnalyzer();

  // On-demand auto-destruction
  private retentionQueue: Map<string, SwarmRetentionEntry> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Event listeners for cleanup and lifecycle events
  private cleanupEventListeners: Array<(event: SwarmCleanupEvent) => void> = [];
  private lifecycleListeners: Array<(event: { swarmId: string; status: SwarmStatus; templateName?: SwarmTemplateName }) => void> = [];

  // Statistics tracking
  private lifetimeHistory: Array<{ swarmId: string; lifetimeMs: number; templateName?: SwarmTemplateName }> = [];
  private templateUsageCount: Record<string, number> = {};
  private totalAgentsSpawned: number = 0;
  private totalAgentsRemoved: number = 0;

  constructor() {
    this.startCleanupTimer();
  }

  // ─── Cleanup Timer ────────────────────────────────────────

  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.runCleanup(), CLEANUP_INTERVAL_MS);
    // Allow the process to exit even if the timer is running
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Run a single cleanup pass — destroy any swarms whose retention
   * period has elapsed.
   */
  private runCleanup(): void {
    const now = Date.now();
    const toDestroy: string[] = [];

    for (const [swarmId, entry] of this.retentionQueue.entries()) {
      if (now >= entry.destroyAt) {
        toDestroy.push(swarmId);
      }
    }

    for (const swarmId of toDestroy) {
      this.destroySwarm(swarmId);
    }
  }

  // ─── Retention Scheduling ─────────────────────────────────

  /**
   * Schedule a completed/failed swarm for auto-destruction after
   * its retention period elapses.
   */
  private scheduleRetention(swarm: Swarm): void {
    const template = swarm.templateName ? SWARM_TEMPLATES[swarm.templateName] : undefined;
    const isFailed = swarm.status === 'failed' || swarm.status === 'cancelled';

    const retentionMs = isFailed
      ? (template?.retentionMsFailed ?? DEFAULT_RETENTION_FAILED_MS)
      : (template?.retentionMsCompleted ?? DEFAULT_RETENTION_COMPLETED_MS);

    const entry: SwarmRetentionEntry = {
      swarmId: swarm.id,
      scheduledAt: Date.now(),
      destroyAt: Date.now() + retentionMs,
      templateName: swarm.templateName,
    };

    this.retentionQueue.set(swarm.id, entry);
  }

  // ─── Swarm Destruction ────────────────────────────────────

  /**
   * Destroy a swarm and release all associated resources.
   * Removes agents (unless shared with other active swarms),
   * clears memory, removes from maps, and emits cleanup events.
   */
  destroySwarm(swarmId: string): boolean {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return false;

    const now = Date.now();
    const lifetimeMs = (swarm.completedAt ?? now) - swarm.createdAt;

    // Track lifetime for statistics
    this.lifetimeHistory.push({
      swarmId: swarm.id,
      lifetimeMs,
      templateName: swarm.templateName,
    });

    // Determine which agents are safe to remove (not shared with other active swarms)
    const agentsInOtherSwarms = new Set<string>();
    for (const [otherId, otherSwarm] of this.swarms.entries()) {
      if (otherId === swarmId) continue;
      if (otherSwarm.status === 'active' || otherSwarm.status === 'forming') {
        for (const agentId of otherSwarm.agentIds) {
          agentsInOtherSwarms.add(agentId);
        }
      }
    }

    let agentsRemoved = 0;
    for (const agentId of swarm.agentIds) {
      if (!agentsInOtherSwarms.has(agentId)) {
        const removed = agentRegistry.remove(agentId);
        if (removed) {
          agentsRemoved++;
          this.totalAgentsRemoved++;
        }
      }
    }

    // Clear swarm memory
    const memoryCleared = swarm.memory.size;
    swarm.memory.clear();

    // Remove from the swarms map
    this.swarms.delete(swarmId);

    // Remove from retention queue
    this.retentionQueue.delete(swarmId);

    // Remove as a child from any parent
    for (const [, parentSwarm] of this.swarms.entries()) {
      const childIdx = parentSwarm.childSwarmIds.indexOf(swarmId);
      if (childIdx !== -1) {
        parentSwarm.childSwarmIds.splice(childIdx, 1);
      }
    }

    // Emit cleanup event
    const cleanupEvent: SwarmCleanupEvent = {
      swarmId,
      templateName: swarm.templateName,
      status: swarm.status,
      lifetimeMs,
      agentsRemoved,
      memoryCleared,
      cleanedUpAt: now,
    };

    for (const listener of this.cleanupEventListeners) {
      try {
        listener(cleanupEvent);
      } catch {
        // Listener errors must not break cleanup
      }
    }

    return true;
  }

  /**
   * Immediately destroy all completed/failed swarms, ignoring retention.
   */
  destroyAllCompleted(): number {
    const toDestroy: string[] = [];
    for (const [id, swarm] of this.swarms.entries()) {
      if (swarm.status === 'completed' || swarm.status === 'failed' || swarm.status === 'cancelled') {
        toDestroy.push(id);
      }
    }
    for (const id of toDestroy) {
      this.destroySwarm(id);
    }
    return toDestroy.length;
  }

  // ─── Event Listeners ──────────────────────────────────────

  onCleanup(listener: (event: SwarmCleanupEvent) => void): () => void {
    this.cleanupEventListeners.push(listener);
    return () => {
      const idx = this.cleanupEventListeners.indexOf(listener);
      if (idx !== -1) this.cleanupEventListeners.splice(idx, 1);
    };
  }

  onLifecycle(listener: (event: { swarmId: string; status: SwarmStatus; templateName?: SwarmTemplateName }) => void): () => void {
    this.lifecycleListeners.push(listener);
    return () => {
      const idx = this.lifecycleListeners.indexOf(listener);
      if (idx !== -1) this.lifecycleListeners.splice(idx, 1);
    };
  }

  private emitLifecycle(swarmId: string, status: SwarmStatus, templateName?: SwarmTemplateName): void {
    for (const listener of this.lifecycleListeners) {
      try {
        listener({ swarmId, status, templateName });
      } catch {
        // Listener errors must not break execution
      }
    }
  }

  // ─── Template Access ──────────────────────────────────────

  /**
   * Get all available swarm templates.
   */
  getTemplates(): Record<SwarmTemplateName, SwarmTemplate> {
    return { ...SWARM_TEMPLATES };
  }

  /**
   * Get a specific template by name.
   */
  getTemplate(name: SwarmTemplateName): SwarmTemplate {
    return SWARM_TEMPLATES[name];
  }

  /**
   * List all template names.
   */
  listTemplateNames(): SwarmTemplateName[] {
    return Object.keys(SWARM_TEMPLATES) as SwarmTemplateName[];
  }

  // ─── Swarm Creation ───────────────────────────────────────

  /**
   * Create a new swarm for a given task, automatically determining
   * the appropriate level based on task characteristics.
   */
  createSwarm(task: string, complexity?: TaskComplexity): SwarmConfig {
    const resolvedComplexity = complexity ?? this.complexityAnalyzer.analyze(task);
    const level = this.complexityAnalyzer.complexityToLevel(resolvedComplexity);
    const levelConfig = this.complexityAnalyzer.getLevelConfig(level);

    const roles: SwarmRole[] = [];
    const agentIds: string[] = [];

    for (const slot of levelConfig.agentComposition) {
      const agent = agentRegistry.spawn(slot.agentType);
      agentIds.push(agent.id);
      roles.push({ agentId: agent.id, role: slot.role });
    }

    this.totalAgentsSpawned += agentIds.length;

    const swarm = new Swarm(task, resolvedComplexity, level, roles, agentIds);
    swarm.status = 'active';

    this.swarms.set(swarm.id, swarm);
    this.emitLifecycle(swarm.id, 'active');

    return swarm.toConfig();
  }

  /**
   * Create a swarm from a prebuilt template.
   * The template defines which agents to spawn, their roles,
   * the complexity level, and whether parallel execution is beneficial.
   */
  createSwarmFromTemplate(templateName: SwarmTemplateName, task: string): SwarmConfig {
    const template = SWARM_TEMPLATES[templateName];
    if (!template) throw new Error(`Unknown swarm template: ${templateName}`);

    const spawnStart = Date.now();

    const roles: SwarmRole[] = [];
    const agentIds: string[] = [];

    for (const slot of template.agents) {
      const agent = agentRegistry.spawn(slot.agentType);
      agentIds.push(agent.id);
      roles.push({ agentId: agent.id, role: slot.role });
    }

    this.totalAgentsSpawned += agentIds.length;

    const level = this.complexityAnalyzer.complexityToLevel(template.complexity);

    const swarm = new Swarm(
      task,
      template.complexity,
      level,
      roles,
      agentIds,
      undefined,
      templateName,
    );
    swarm.status = 'active';

    this.swarms.set(swarm.id, swarm);

    // Track template usage
    this.templateUsageCount[templateName] = (this.templateUsageCount[templateName] ?? 0) + 1;

    this.emitLifecycle(swarm.id, 'active', templateName);

    const spawnDuration = Date.now() - spawnStart;
    if (spawnDuration > SWARM_SPAWN_TARGET_MS) {
      console.warn(
        `[SwarmEngine] Swarm spawn from template "${templateName}" took ${spawnDuration}ms (target: <${SWARM_SPAWN_TARGET_MS}ms)`,
      );
    }

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

    (childSwarm as { parentSwarmId: string }).parentSwarmId = parentSwarmId;
    parent.childSwarmIds.push(config.id);

    return config;
  }

  // ─── Swarm Execution ──────────────────────────────────────

  /**
   * Execute a swarm using phase-based parallel execution.
   * After completion (success or failure), the swarm is scheduled
   * for auto-destruction after its retention period.
   */
  async executeSwarm(swarmId: string, task: string): Promise<SwarmExecutionResult> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) throw new Error(`Swarm not found: ${swarmId}`);

    const startTime = Date.now();
    swarm.status = 'active';
    this.emitLifecycle(swarmId, 'active', swarm.templateName);

    const results: SwarmExecutionResult['results'] = [];
    const phases = swarm.getPhases();
    const maxPhase = Math.max(...Array.from(phases.keys()), 0);

    // Execute phase by phase
    for (let phase = 0; phase <= maxPhase; phase++) {
      const phaseAgents = phases.get(phase) ?? [];
      if (phaseAgents.length === 0) continue;

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
            const rolePrompt = this.buildRolePrompt(task, dep.role, swarm);
            const message = await agent.execute(rolePrompt);
            const durationMs = Date.now() - agentStart;

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

    this.emitLifecycle(swarmId, finalStatus, swarm.templateName);

    // Schedule auto-destruction after retention period
    this.scheduleRetention(swarm);

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
   * Execute a swarm from a template in a single call.
   * Creates the swarm, executes it, and returns the result.
   * The swarm will be auto-destroyed after its retention period.
   */
  async executeFromTemplate(
    templateName: SwarmTemplateName,
    task: string,
  ): Promise<{ config: SwarmConfig; result: SwarmExecutionResult }> {
    const config = this.createSwarmFromTemplate(templateName, task);
    const result = await this.executeSwarm(config.id, task);
    return { config, result };
  }

  /**
   * Execute multiple swarms in parallel (for multi-swarm network tasks).
   */
  async executeMultiSwarm(
    tasks: Array<{ task: string; complexity?: TaskComplexity }>,
  ): Promise<Array<{ swarm: SwarmConfig; result: SwarmExecutionResult }>> {
    const swarmConfigs = tasks.map((t) => this.createSwarm(t.task, t.complexity));

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

  // ─── Swarm Query ──────────────────────────────────────────

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

  /** Cancel a swarm — also schedules it for retention-based cleanup */
  cancelSwarm(swarmId: string): boolean {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return false;
    if (swarm.status !== 'active' && swarm.status !== 'forming') return false;
    swarm.status = 'cancelled';

    this.emitLifecycle(swarmId, 'cancelled', swarm.templateName);
    this.scheduleRetention(swarm);

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

  /** Get retention queue status */
  getRetentionQueue(): SwarmRetentionEntry[] {
    return Array.from(this.retentionQueue.values());
  }

  // ─── Swarm Map / Visualization ────────────────────────────

  /**
   * Generate real-time swarm map data for visualization.
   */
  getSwarmMap(swarmId: string): SwarmMapData {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return { nodes: [], edges: [] };

    const nodes: SwarmMapNode[] = [];
    const edges: SwarmMapEdge[] = [];

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

    if (reviewerId && verifierId) {
      edges.push({
        sourceId: reviewerId,
        targetId: verifierId,
        type: 'review',
        label: 'reviewed work',
      });
    }

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

    if (memoryAgentId) {
      edges.push({
        sourceId: memoryAgentId,
        targetId: memoryNodeId,
        type: 'memory_access',
        label: 'read/write',
      });
    }

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

      for (const node of swarmMap.nodes) {
        allNodes.push({
          ...node,
          id: `${swarmId}:${node.id}`,
          x: (node.x ?? 0) + offsetX,
          y: (node.y ?? 0) + offsetY,
        });
      }

      for (const edge of swarmMap.edges) {
        allEdges.push({
          ...edge,
          sourceId: `${swarmId}:${edge.sourceId}`,
          targetId: `${swarmId}:${edge.targetId}`,
        });
      }

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

  // ─── Auto-Swarm Formation ─────────────────────────────────

  /**
   * Automatically determine whether to form a swarm, what level,
   * and potentially create a multi-swarm network based on task analysis.
   */
  autoFormSwarm(task: string, complexity?: TaskComplexity): SwarmConfig {
    const resolvedComplexity = complexity ?? this.complexityAnalyzer.analyze(task);

    if (resolvedComplexity === 'multi_swarm') {
      return this.createMultiSwarmNetwork(task);
    }

    return this.createSwarm(task, resolvedComplexity);
  }

  /**
   * Create a multi-swarm network for complex cross-domain tasks.
   */
  private createMultiSwarmNetwork(task: string): SwarmConfig {
    const parentConfig = this.createSwarm(task, 'enterprise');
    const subTasks = this.decomposeTask(task);

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
   */
  private decomposeTask(task: string): Array<{ task: string; complexity: TaskComplexity }> {
    const subTasks: Array<{ task: string; complexity: TaskComplexity }> = [];
    const parts = task.split(/[;.]\s*/).filter((p) => p.trim().length > 10);

    if (parts.length > 1) {
      for (const part of parts) {
        const partComplexity = this.complexityAnalyzer.analyze(part);
        subTasks.push({ task: part.trim(), complexity: partComplexity });
      }
    } else {
      subTasks.push({ task: `Research and plan: ${task}`, complexity: 'medium' });
      subTasks.push({ task: `Implement: ${task}`, complexity: 'complex' });
      subTasks.push({ task: `Review and verify: ${task}`, complexity: 'medium' });
    }

    return subTasks.slice(0, 5);
  }

  // ─── Utilities ────────────────────────────────────────────

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

    const templateContext = swarm.templateName
      ? `\n\nSwarm template: ${SWARM_TEMPLATES[swarm.templateName].name} — ${SWARM_TEMPLATES[swarm.templateName].description}`
      : '';

    switch (role) {
      case 'leader':
        return `You are the LEADER of this swarm. ${roleDesc}${templateContext}\n\nTask: ${task}\n\nCreate a clear execution plan, decompose the work, and assign responsibilities. Your plan will be shared with all other agents.${memoryContext}`;
      case 'coordinator':
        return `You are the COORDINATOR of this swarm. ${roleDesc}${templateContext}\n\nTask: ${task}\n\nEnsure smooth communication between agents. Resolve conflicts and prioritize work.${leaderContext}${memoryContext}`;
      case 'worker':
        return `You are a WORKER in this swarm. ${roleDesc}${templateContext}\n\nTask: ${task}\n\nExecute your assigned portion of the work thoroughly and precisely.${leaderContext}${memoryContext}`;
      case 'reviewer':
        return `You are the REVIEWER of this swarm. ${roleDesc}${templateContext}\n\nTask: ${task}\n\nReview the work produced by the workers. Check for quality, completeness, and best practices.${leaderContext}${memoryContext}`;
      case 'verifier':
        return `You are the VERIFIER of this swarm. ${roleDesc}${templateContext}\n\nTask: ${task}\n\nVerify the final output against requirements. Confirm correctness and completeness.${leaderContext}${memoryContext}`;
      case 'memory_agent':
        return `You are the MEMORY AGENT of this swarm. ${roleDesc}${templateContext}\n\nTask: ${task}\n\nManage the shared memory. Index important information, retrieve relevant context, and ensure all agents have access to what they need.${memoryContext}`;
      case 'knowledge_agent':
        return `You are the KNOWLEDGE AGENT of this swarm. ${roleDesc}${templateContext}\n\nTask: ${task}\n\nRetrieve relevant knowledge from the knowledge engine. Provide domain expertise and reference information.${memoryContext}`;
    }
  }

  // ─── Enhanced Statistics ──────────────────────────────────

  /**
   * Get aggregate statistics about all swarms, including template
   * usage, average lifetime, and resource usage.
   */
  getStatistics(): {
    totalSwarms: number;
    activeSwarms: number;
    completedSwarms: number;
    failedSwarms: number;
    cancelledSwarms: number;
    byLevel: Record<string, number>;
    byComplexity: Record<string, number>;
    avgDurationMs: number;
    avgLifetimeMs: number;
    totalAgentsUsed: number;
    totalAgentsSpawned: number;
    totalAgentsRemoved: number;
    pendingRetention: number;
    templateUsage: Record<string, number>;
    templateBreakdown: Array<{
      name: SwarmTemplateName;
      displayName: string;
      usageCount: number;
      avgLifetimeMs: number;
    }>;
    resourceUsage: {
      activeAgents: number;
      activeMemoryEntries: number;
      swarmMapSize: number;
    };
  } {
    const allSwarms = Array.from(this.swarms.values());
    const byLevel: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};
    let totalDuration = 0;
    let completedCount = 0;
    let totalAgents = 0;
    let activeMemoryEntries = 0;

    for (const swarm of allSwarms) {
      byLevel[swarm.level] = (byLevel[swarm.level] ?? 0) + 1;
      byComplexity[swarm.complexity] = (byComplexity[swarm.complexity] ?? 0) + 1;
      totalAgents += swarm.agentIds.length;
      activeMemoryEntries += swarm.memory.size;

      if (swarm.status === 'completed' && swarm.completedAt) {
        totalDuration += swarm.completedAt - swarm.createdAt;
        completedCount++;
      }
    }

    // Compute average lifetime from history
    const avgLifetimeMs = this.lifetimeHistory.length > 0
      ? this.lifetimeHistory.reduce((sum, h) => sum + h.lifetimeMs, 0) / this.lifetimeHistory.length
      : 0;

    // Compute template breakdown
    const templateBreakdown: Array<{
      name: SwarmTemplateName;
      displayName: string;
      usageCount: number;
      avgLifetimeMs: number;
    }> = [];

    for (const name of Object.keys(SWARM_TEMPLATES) as SwarmTemplateName[]) {
      const usageCount = this.templateUsageCount[name] ?? 0;
      const templateLifetimes = this.lifetimeHistory
        .filter((h) => h.templateName === name)
        .map((h) => h.lifetimeMs);
      const avgTemplateLifetime = templateLifetimes.length > 0
        ? templateLifetimes.reduce((a, b) => a + b, 0) / templateLifetimes.length
        : 0;

      templateBreakdown.push({
        name,
        displayName: SWARM_TEMPLATES[name].name,
        usageCount,
        avgLifetimeMs: avgTemplateLifetime,
      });
    }

    return {
      totalSwarms: allSwarms.length,
      activeSwarms: allSwarms.filter((s) => s.status === 'active').length,
      completedSwarms: allSwarms.filter((s) => s.status === 'completed').length,
      failedSwarms: allSwarms.filter((s) => s.status === 'failed').length,
      cancelledSwarms: allSwarms.filter((s) => s.status === 'cancelled').length,
      byLevel,
      byComplexity,
      avgDurationMs: completedCount > 0 ? totalDuration / completedCount : 0,
      avgLifetimeMs,
      totalAgentsUsed: totalAgents,
      totalAgentsSpawned: this.totalAgentsSpawned,
      totalAgentsRemoved: this.totalAgentsRemoved,
      pendingRetention: this.retentionQueue.size,
      templateUsage: { ...this.templateUsageCount },
      templateBreakdown,
      resourceUsage: {
        activeAgents: totalAgents,
        activeMemoryEntries,
        swarmMapSize: this.swarms.size,
      },
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /**
   * Gracefully shut down the swarm engine — stops the cleanup
   * timer, destroys all swarms, and releases all references.
   */
  shutdown(): void {
    this.stopCleanupTimer();
    this.destroyAllCompleted();
    // Force-destroy any remaining active swarms
    const remaining = Array.from(this.swarms.keys());
    for (const id of remaining) {
      const swarm = this.swarms.get(id);
      if (swarm) {
        swarm.status = 'cancelled';
        this.destroySwarm(id);
      }
    }
    this.cleanupEventListeners.length = 0;
    this.lifecycleListeners.length = 0;
  }
}

// ─── Singleton Export ───
export const swarmEngine = new SwarmNetwork();
export { SwarmNetwork, SwarmMemory, ComplexityAnalyzer, Swarm };
