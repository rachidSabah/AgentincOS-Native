// ═══════════════════════════════════════════════════════
// AGENTIC OS — Auto-Swarm Orchestrator
// Automatically determines when to escalate to swarm mode
// ═══════════════════════════════════════════════════════

export interface SwarmScoreInput {
  taskComplexity: number;      // 0-10
  domainCount: number;         // 0-10
  toolRequirements: number;    // 0-10
  multiFileImpact: number;     // 0-10
  parallelNeed: number;        // 0-10
  validationRequired: number;  // 0-10
  planningHorizon: number;     // 0-10
}

export type SwarmTier = 'single-agent' | 'light' | 'standard' | 'enterprise' | 'multi-swarm';

export interface SwarmComposition {
  tier: SwarmTier;
  agentCount: number;
  roles: SwarmRole[];
  executionMode: 'sequential' | 'parallel' | 'hybrid';
  modelAssignments: {[role: string]: string};
}

export interface SwarmRole {
  role: string;
  brainMode: string;
  responsibilities: string[];
  model: string;
}

// Hard trigger keywords
const HARD_TRIGGERS = [
  'build', 'create', 'design system', 'architecture',
  // Full applications
  // Multi-page dashboards
  // AI agents
  // DevOps
  // Repository-wide changes
  // Data pipelines
];

// Domain pairs that trigger swarm
const DOMAIN_TRIGGERS: string[][] = [
  ['frontend', 'backend'],
  ['research', 'automation'],
  ['api', 'infrastructure'],
  ['code', 'security'],
  ['data', 'visualization'],
];

export function calculateSwarmScore(input: SwarmScoreInput): number {
  return (
    input.taskComplexity +
    input.domainCount +
    input.toolRequirements +
    input.multiFileImpact +
    input.parallelNeed +
    input.validationRequired +
    input.planningHorizon
  );
}

export function determineSwarmTier(score: number): SwarmTier {
  if (score <= 15) return 'single-agent';
  if (score <= 30) return 'light';
  if (score <= 45) return 'standard';
  if (score <= 60) return 'enterprise';
  return 'multi-swarm';
}

export function shouldTriggerSwarm(task: string, input: SwarmScoreInput): { trigger: boolean; reason: string; score: number; tier: SwarmTier } {
  // Check hard triggers
  const taskLower = task.toLowerCase();
  for (const trigger of HARD_TRIGGERS) {
    if (taskLower.includes(trigger)) {
      return { trigger: true, reason: `Hard trigger: "${trigger}"`, score: 50, tier: 'enterprise' };
    }
  }

  // Check domain multiplicity
  const domains = detectDomains(task);
  if (domains.length >= 2) {
    // Check for domain pair triggers
    for (const pair of DOMAIN_TRIGGERS) {
      if (domains.includes(pair[0]) && domains.includes(pair[1])) {
        return { trigger: true, reason: `Multi-domain trigger: ${pair.join(' + ')}`, score: 40, tier: 'standard' };
      }
    }
    return { trigger: true, reason: `Multi-domain: ${domains.join(', ')}`, score: 35, tier: 'standard' };
  }

  // Check file/repository references
  if (/repositor|folder|multiple files|system architecture|database schema/i.test(task)) {
    return { trigger: true, reason: 'File/Repository reference detected', score: 40, tier: 'standard' };
  }

  // Check long-horizon (Hermes rule)
  if (input.planningHorizon >= 7) {
    return { trigger: true, reason: 'Long-horizon task (Hermes rule)', score: 35, tier: 'standard' };
  }

  // Check engineering complexity (Claude Code rule)
  if (input.multiFileImpact >= 6) {
    return { trigger: true, reason: 'Multi-file impact (Claude Code rule)', score: 40, tier: 'standard' };
  }

  // Check validation requirement
  if (input.validationRequired >= 7) {
    return { trigger: true, reason: 'High validation requirement', score: 35, tier: 'standard' };
  }

  // Calculate score
  const score = calculateSwarmScore(input);
  const tier = determineSwarmTier(score);

  // Failsafe: if uncertainty is high, escalate
  if (score >= 16) {
    return { trigger: true, reason: `Score threshold: ${score}`, score, tier };
  }

  return { trigger: false, reason: 'Single-agent sufficient', score, tier };
}

export function composeSwarm(tier: SwarmTier): SwarmComposition {
  switch (tier) {
    case 'single-agent':
      return {
        tier,
        agentCount: 1,
        roles: [{ role: 'executor', brainMode: 'hermes-brain', responsibilities: ['Execute task'], model: 'auto' }],
        executionMode: 'sequential',
        modelAssignments: { executor: 'auto' },
      };
    case 'light':
      return {
        tier,
        agentCount: 3,
        roles: [
          { role: 'planner', brainMode: 'hermes-brain', responsibilities: ['Plan task', 'Decompose steps'], model: 'gemini-2.5-pro' },
          { role: 'executor', brainMode: 'coding-brain', responsibilities: ['Execute implementation'], model: 'deepseek-chat' },
          { role: 'reviewer', brainMode: 'claude-brain', responsibilities: ['Review output', 'Verify quality'], model: 'claude-sonnet-4-20250514' },
        ],
        executionMode: 'sequential',
        modelAssignments: { planner: 'gemini-2.5-pro', executor: 'deepseek-chat', reviewer: 'claude-sonnet-4-20250514' },
      };
    case 'standard':
      return {
        tier,
        agentCount: 5,
        roles: [
          { role: 'planner', brainMode: 'hermes-brain', responsibilities: ['Plan', 'Decompose', 'Coordinate'], model: 'gemini-2.5-pro' },
          { role: 'architect', brainMode: 'architect-brain', responsibilities: ['Design architecture', 'Define patterns'], model: 'claude-sonnet-4-20250514' },
          { role: 'coder', brainMode: 'coding-brain', responsibilities: ['Implement code'], model: 'deepseek-chat' },
          { role: 'researcher', brainMode: 'research-brain', responsibilities: ['Research context', 'Find solutions'], model: 'glm-4-plus' },
          { role: 'reviewer', brainMode: 'claude-brain', responsibilities: ['Review', 'Verify', 'Validate'], model: 'claude-sonnet-4-20250514' },
        ],
        executionMode: 'hybrid',
        modelAssignments: { planner: 'gemini-2.5-pro', architect: 'claude-sonnet-4-20250514', coder: 'deepseek-chat', researcher: 'glm-4-plus', reviewer: 'claude-sonnet-4-20250514' },
      };
    case 'enterprise':
      return {
        tier,
        agentCount: 8,
        roles: [
          { role: 'planner', brainMode: 'hermes-brain', responsibilities: ['Master plan', 'Task decomposition', 'Progress tracking'], model: 'gemini-2.5-pro' },
          { role: 'architect', brainMode: 'architect-brain', responsibilities: ['System design', 'Architecture decisions'], model: 'claude-sonnet-4-20250514' },
          { role: 'coder-1', brainMode: 'coding-brain', responsibilities: ['Implementation - Module A'], model: 'deepseek-chat' },
          { role: 'coder-2', brainMode: 'coding-brain', responsibilities: ['Implementation - Module B'], model: 'deepseek-chat' },
          { role: 'researcher', brainMode: 'research-brain', responsibilities: ['Research & context'], model: 'glm-4-plus' },
          { role: 'reviewer', brainMode: 'claude-brain', responsibilities: ['Code review'], model: 'claude-sonnet-4-20250514' },
          { role: 'verifier', brainMode: 'analyst-brain', responsibilities: ['Testing & verification'], model: 'gpt-4o' },
          { role: 'memory-agent', brainMode: 'hermes-brain', responsibilities: ['Memory & context management'], model: 'gemini-2.5-flash' },
        ],
        executionMode: 'hybrid',
        modelAssignments: { planner: 'gemini-2.5-pro', architect: 'claude-sonnet-4-20250514', 'coder-1': 'deepseek-chat', 'coder-2': 'deepseek-chat', researcher: 'glm-4-plus', reviewer: 'claude-sonnet-4-20250514', verifier: 'gpt-4o', 'memory-agent': 'gemini-2.5-flash' },
      };
    case 'multi-swarm':
      return {
        tier,
        agentCount: 12,
        roles: [
          { role: 'master-planner', brainMode: 'hermes-brain', responsibilities: ['Orchestrate multiple swarms'], model: 'gemini-2.5-pro' },
          { role: 'swarm-1-planner', brainMode: 'hermes-brain', responsibilities: ['Plan sub-swarm 1'], model: 'gemini-2.5-pro' },
          { role: 'swarm-1-coder', brainMode: 'coding-brain', responsibilities: ['Execute sub-swarm 1'], model: 'deepseek-chat' },
          { role: 'swarm-2-planner', brainMode: 'hermes-brain', responsibilities: ['Plan sub-swarm 2'], model: 'gemini-2.5-pro' },
          { role: 'swarm-2-coder', brainMode: 'coding-brain', responsibilities: ['Execute sub-swarm 2'], model: 'deepseek-chat' },
          { role: 'architect', brainMode: 'architect-brain', responsibilities: ['Cross-swarm architecture'], model: 'claude-sonnet-4-20250514' },
          { role: 'researcher', brainMode: 'research-brain', responsibilities: ['Research'], model: 'glm-4-plus' },
          { role: 'reviewer', brainMode: 'claude-brain', responsibilities: ['Review all swarms'], model: 'claude-sonnet-4-20250514' },
          { role: 'verifier', brainMode: 'analyst-brain', responsibilities: ['Verify all outputs'], model: 'gpt-4o' },
          { role: 'security', brainMode: 'claude-brain', responsibilities: ['Security review'], model: 'mistral-large-latest' },
          { role: 'devops', brainMode: 'coding-brain', responsibilities: ['Deployment & CI/CD'], model: 'deepseek-chat' },
          { role: 'memory-agent', brainMode: 'hermes-brain', responsibilities: ['Cross-swarm memory'], model: 'gemini-2.5-flash' },
        ],
        executionMode: 'hybrid',
        modelAssignments: { 'master-planner': 'gemini-2.5-pro', 'swarm-1-planner': 'gemini-2.5-pro', 'swarm-1-coder': 'deepseek-chat', 'swarm-2-planner': 'gemini-2.5-pro', 'swarm-2-coder': 'deepseek-chat', architect: 'claude-sonnet-4-20250514', researcher: 'glm-4-plus', reviewer: 'claude-sonnet-4-20250514', verifier: 'gpt-4o', security: 'mistral-large-latest', devops: 'deepseek-chat', 'memory-agent': 'gemini-2.5-flash' },
      };
  }
}

function detectDomains(task: string): string[] {
  const domains: string[] = [];
  const domainPatterns: {[key: string]: RegExp[]} = {
    frontend: [/frontend/i, /react/i, /vue/i, /ui/i, /component/i, /css/i, /html/i],
    backend: [/backend/i, /api/i, /server/i, /database/i, /endpoint/i],
    research: [/research/i, /analyze/i, /investigate/i, /study/i],
    automation: [/automat/i, /workflow/i, /pipeline/i, /schedule/i],
    security: [/security/i, /vulnerability/i, /audit/i, /penetration/i],
    data: [/data/i, /analytics/i, /metrics/i, /visualization/i],
    infrastructure: [/infrastructure/i, /deploy/i, /devops/i, /docker/i, /kubernetes/i],
  };
  for (const [domain, patterns] of Object.entries(domainPatterns)) {
    if (patterns.some(p => p.test(task))) domains.push(domain);
  }
  return domains;
}
