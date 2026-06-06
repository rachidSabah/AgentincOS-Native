// ============================================================
// Agentic OS V2 — AI-Powered 7-Brain Reasoning Pipeline
// with Dynamic Overlay Support
// ============================================================
import type { BrainID, BrainInput, BrainOutput, BrainResult, ArtifactData, ModelProviderType } from './types';
import { modelRouter } from './model-router';

// ─── Overlay Types ───
export type BrainOverlayType =
  | 'default'
  | 'claude'
  | 'hermes'
  | 'research'
  | 'coding'
  | 'architect'
  | 'analyst'
  | 'devops'
  | 'security'
  | 'business'
  | 'recruitment'
  | 'aviation'
  | 'custom';

// ─── Brain Step Interface ───
export interface BrainStep {
  id: BrainID;
  name: string;
  description: string;
  systemPrompt: (overlays: BrainOverlayType[]) => string;
  buildPrompt: (input: BrainInput, previousOutputs: BrainOutput[]) => string;
  fallback: (input: BrainInput, previousOutputs: BrainOutput[]) => Record<string, unknown>;
  parseResponse: (raw: string, previousOutputs: BrainOutput[]) => Record<string, unknown>;
}

// ─── Event Types ───
export interface BrainEvent {
  type: 'brain:start' | 'brain:complete' | 'brain:error' | 'brain:fallback' | 'pipeline:complete' | 'pipeline:fallback';
  brainId?: BrainID;
  brainName?: string;
  durationMs?: number;
  overlay?: string;
  error?: string;
  timestamp: number;
}

type BrainEventHandler = (event: BrainEvent) => void;

// ─── Overlay System Prompts ───
// Each overlay can modify the system prompt for any brain step.
// Multiple overlays are merged: base prompt + each active overlay's additions.
const OVERLAY_SYSTEM_PROMPTS: Record<BrainOverlayType, Partial<Record<BrainID, string>>> = {
  default: {},
  claude: {
    1: 'Think step-by-step with careful reasoning. Be thorough and precise.',
    2: 'Decompose with exhaustive attention to edge cases and nuance.',
    3: 'Plan with methodical rigor. Consider alternative paths.',
    4: 'Design execution with careful model and tool selection.',
    5: 'Validate rigorously. Challenge assumptions.',
    6: 'Optimize for quality and correctness above speed.',
    7: 'Extract deep insights. Look for non-obvious patterns.',
  },
  hermes: {
    1: 'Use structured symbolic reasoning. Map concepts to archetypes.',
    2: 'Decompose into symbolic sub-problems. Find hidden connections.',
    3: 'Plan as a mythic journey — each step is a stage of transformation.',
    4: 'Select tools as instruments of change. Match means to meaning.',
    5: 'Verify through cross-referencing multiple knowledge domains.',
    6: 'Optimize for elegance and parsimony.',
    7: 'Reflect on the deeper patterns and wisdom gained.',
  },
  research: {
    1: 'Focus on identifying research questions, hypotheses, and methodology cues.',
    2: 'Break down into literature review, data collection, analysis, and synthesis tasks.',
    3: 'Plan with research methodology: define variables, controls, and reproducibility.',
    4: 'Assign research tools: search engines, data scrapers, statistical packages, citation managers.',
    5: 'Validate for methodological soundness, bias, and reproducibility.',
    6: 'Optimize for thoroughness, citation density, and peer-review readiness.',
    7: 'Extract methodological learnings and identify future research directions.',
  },
  coding: {
    1: 'Identify programming intent: build, debug, refactor, test, or review.',
    2: 'Decompose into coding subtasks: setup, implementation, testing, deployment.',
    3: 'Plan with software engineering best practices: DRY, SOLID, design patterns.',
    4: 'Assign code generation tools: linters, compilers, test runners, CI/CD pipelines.',
    5: 'Validate for type safety, test coverage, performance, and security vulnerabilities.',
    6: 'Optimize for code quality, execution speed, and maintainability.',
    7: 'Extract coding patterns and anti-patterns for future reference.',
  },
  architect: {
    1: 'Identify architectural concerns: scalability, modularity, integration, migration.',
    2: 'Decompose into architectural decisions: components, interfaces, data flows, deployment.',
    3: 'Plan with system design principles: separation of concerns, loose coupling, high cohesion.',
    4: 'Assign architecture tools: diagram generators, dependency analyzers, capacity planners.',
    5: 'Validate for architectural fitness: scalability, resilience, maintainability.',
    6: 'Optimize for system-level performance, cost, and operational simplicity.',
    7: 'Extract architectural patterns and trade-off decisions.',
  },
  analyst: {
    1: 'Focus on data-driven intent: metrics, KPIs, trends, comparisons.',
    2: 'Break into analytical tasks: data gathering, cleaning, transformation, visualization.',
    3: 'Plan with analytical rigor: define metrics, baselines, and statistical methods.',
    4: 'Assign analytical tools: SQL engines, BI platforms, statistical packages, visualization libs.',
    5: 'Validate for data quality, statistical significance, and bias.',
    6: 'Optimize for insight depth, accuracy, and actionability.',
    7: 'Extract analytical patterns and data-driven insights.',
  },
  devops: {
    1: 'Identify infrastructure intent: deploy, scale, monitor, troubleshoot, automate.',
    2: 'Break into DevOps tasks: provisioning, configuration, deployment, monitoring, rollback.',
    3: 'Plan with infrastructure-as-code and GitOps principles.',
    4: 'Assign DevOps tools: container runtimes, orchestrators, IaC frameworks, monitoring stacks.',
    5: 'Validate for uptime, resource limits, security groups, and rollback safety.',
    6: 'Optimize for deployment speed, resource efficiency, and zero-downtime.',
    7: 'Extract operational patterns and incident learnings.',
  },
  security: {
    1: 'Analyze intent through a security lens: threat modeling, vulnerability assessment, compliance.',
    2: 'Decompose with security checkpoints at every stage. Identify attack surfaces.',
    3: 'Plan with defense-in-depth: authentication, authorization, encryption, auditing.',
    4: 'Assign security tools: SAST, DAST, dependency scanners, penetration testing frameworks.',
    5: 'Validate against OWASP Top 10, CIS benchmarks, and compliance frameworks.',
    6: 'Optimize for least privilege, attack surface reduction, and incident response speed.',
    7: 'Extract security patterns, threat intelligence, and hardening procedures.',
  },
  business: {
    1: 'Identify business intent: strategy, operations, finance, market analysis.',
    2: 'Decompose into business tasks: research, analysis, planning, execution, review.',
    3: 'Plan with business frameworks: SWOT, Porter\'s Five Forces, Business Model Canvas.',
    4: 'Assign business tools: financial models, market research databases, presentation tools.',
    5: 'Validate for business feasibility, ROI, market fit, and risk.',
    6: 'Optimize for business value, time-to-market, and cost efficiency.',
    7: 'Extract business insights and strategic learnings.',
  },
  recruitment: {
    1: 'Identify recruitment intent: sourcing, screening, interviewing, onboarding.',
    2: 'Decompose into hiring tasks: job design, sourcing, assessment, offer, integration.',
    3: 'Plan with structured hiring methodology and bias mitigation.',
    4: 'Assign recruitment tools: ATS, skill assessment platforms, interview schedulers.',
    5: 'Validate for candidate quality, diversity, and process compliance.',
    6: 'Optimize for hiring speed, candidate experience, and quality of hire.',
    7: 'Extract hiring patterns and workforce planning insights.',
  },
  aviation: {
    1: 'Analyze intent with aviation domain awareness: safety, compliance, operations.',
    2: 'Decompose with aviation safety protocols and regulatory requirements.',
    3: 'Plan with SMS (Safety Management System) principles and ICAO standards.',
    4: 'Assign aviation tools: flight planning systems, weather APIs, compliance checkers.',
    5: 'Validate against aviation regulations, safety standards, and operational limits.',
    6: 'Optimize for safety margins, fuel efficiency, and regulatory compliance.',
    7: 'Extract safety learnings and operational improvement patterns.',
  },
  custom: {},
};

// ─── Base System Prompts Per Brain ───
const BASE_SYSTEM_PROMPTS: Record<BrainID, string> = {
  1: `You are Brain 1 — Intent Analysis. You analyze user messages to determine their core intent, extract entities, and assess complexity. You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Respond with this exact schema:
{"intent":"string","entities":["string"],"confidence":0.0,"keywords":["string"],"complexity":"simple|medium|complex"}`,

  2: `You are Brain 2 — Task Decomposition. You break down the analyzed intent into a structured list of atomic tasks with priorities. You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Respond with this exact schema:
{"tasks":[{"id":"string","description":"string","priority":1,"dependencies":["string"],"estimatedEffort":"low|medium|high"}],"taskCount":0,"intent":"string","decompositionStrategy":"string"}`,

  3: `You are Brain 3 — Strategic Planning. You create an execution plan with ordered steps and dependency chains. You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Respond with this exact schema:
{"plan":[{"stepId":"string","description":"string","dependsOn":["string"],"estimatedComplexity":"low|medium|high","milestone":true|false}],"totalSteps":0,"parallelizable":true|false,"criticalPath":["string"],"estimatedDuration":"string"}`,

  4: `You are Brain 4 — Execution Design. You determine the specific tools, agents, and models needed for each plan step. You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Respond with this exact schema:
{"strategy":[{"stepId":"string","tool":"string","agent":"string","model":"string","reason":"string"}],"requiresSwarm":true|false,"preferredAgent":"string","resourceRequirements":"string","riskMitigations":["string"]}`,

  5: `You are Brain 5 — Validation. You verify the feasibility and soundness of the entire plan and strategy. You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Respond with this exact schema:
{"feasible":true|false,"riskLevel":"low|medium|high|critical","issues":["string"],"recommendations":["string"],"stepCount":0,"strategyValid":true|false,"gaps":["string"],"confidence":0.0}`,

  6: `You are Brain 6 — Optimization. You optimize the validated plan for speed, cost, and reliability. You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Respond with this exact schema:
{"optimized":true|false,"optimizations":["string"],"estimatedTimeMs":0,"estimatedCost":0.0,"feasible":true|false,"tradeOffs":["string"],"bottlenecks":["string"],"parallelismOpportunities":["string"]}`,

  7: `You are Brain 7 — Reflection & Learning. You reflect on the entire pipeline output and extract learnings for future improvement. You MUST respond with valid JSON only, no markdown, no explanation outside JSON. Respond with this exact schema:
{"learned":true|false,"patterns":["string"],"insight":"string","estimatedTimeMs":0,"shouldCache":true|false,"improvementSuggestions":["string"],"knowledgeGained":["string"]}`,
};

// ─── Brain Step Definitions ───
const BRAIN_STEPS: BrainStep[] = [
  // ─── Brain 1: Intent Analysis ───
  {
    id: 1,
    name: 'IntentAnalysis',
    description: 'Analyzes user intent and extracts structured intent data using AI',
    systemPrompt: (overlays) => buildSystemPrompt(1, overlays),
    buildPrompt: (input, _prev) =>
      `Analyze the intent of this message:\n\n"${input.message}"\n\n${input.context ? `Context: ${JSON.stringify(input.context)}\n\n` : ''}${input.history?.length ? `Conversation history (last 3): ${JSON.stringify(input.history.slice(-3))}\n\n` : ''}Return a JSON object with: intent (string), entities (string[]), confidence (0-1), keywords (string[]), complexity (simple|medium|complex).`,
    fallback: (input, _prev) => {
      const msg = input.message.toLowerCase();
      const intent = msg.includes('create') || msg.includes('build') || msg.includes('make') ? 'creation'
        : msg.includes('analyze') || msg.includes('examine') || msg.includes('investigate') ? 'analysis'
        : msg.includes('fix') || msg.includes('modify') || msg.includes('update') || msg.includes('change') ? 'modification'
        : msg.includes('run') || msg.includes('execute') || msg.includes('start') ? 'command'
        : msg.includes('hello') || msg.includes('hi') || msg.includes('hey') ? 'conversation'
        : 'question';
      return {
        intent,
        entities: [] as string[],
        confidence: 0.6,
        keywords: input.message.split(' ').filter((w) => w.length > 3).slice(0, 5),
        complexity: msg.length > 200 ? 'complex' : msg.length > 50 ? 'medium' : 'simple',
      };
    },
    parseResponse: (raw, _prev) => {
      const parsed = extractJSON(raw);
      return {
        intent: typeof parsed.intent === 'string' ? parsed.intent : 'question',
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        complexity: ['simple', 'medium', 'complex'].includes(parsed.complexity as string) ? (parsed.complexity as 'simple' | 'medium' | 'complex') : 'medium',
      };
    },
  },

  // ─── Brain 2: Task Decomposition ───
  {
    id: 2,
    name: 'TaskDecomposition',
    description: 'Breaks intent into atomic tasks using AI reasoning',
    systemPrompt: (overlays) => buildSystemPrompt(2, overlays),
    buildPrompt: (input, prev) => {
      const intentResult = prev[0]?.result ?? {};
      return `Given the following intent analysis:\n${JSON.stringify(intentResult, null, 2)}\n\nAnd the original message:\n"${input.message}"\n\nDecompose this into atomic tasks. Each task should have: id, description, priority (1=highest), dependencies (task IDs), and estimatedEffort (low|medium|high). Return the full JSON with tasks array, taskCount, intent, and decompositionStrategy.`;
    },
    fallback: (input, prev) => {
      const intentResult = prev[0]?.result ?? {};
      const intent = (intentResult.intent as string) ?? 'question';
      const tasks: Array<{ id: string; description: string; priority: number; dependencies: string[]; estimatedEffort: string }> = [];
      if (intent === 'creation') {
        tasks.push({ id: 't1', description: 'Understand requirements', priority: 1, dependencies: [], estimatedEffort: 'low' });
        tasks.push({ id: 't2', description: 'Design structure', priority: 2, dependencies: ['t1'], estimatedEffort: 'medium' });
        tasks.push({ id: 't3', description: 'Implement solution', priority: 3, dependencies: ['t2'], estimatedEffort: 'high' });
      } else if (intent === 'analysis') {
        tasks.push({ id: 't1', description: 'Gather information', priority: 1, dependencies: [], estimatedEffort: 'low' });
        tasks.push({ id: 't2', description: 'Process and analyze', priority: 2, dependencies: ['t1'], estimatedEffort: 'medium' });
        tasks.push({ id: 't3', description: 'Generate report', priority: 3, dependencies: ['t2'], estimatedEffort: 'low' });
      } else if (intent === 'modification') {
        tasks.push({ id: 't1', description: 'Understand current state', priority: 1, dependencies: [], estimatedEffort: 'low' });
        tasks.push({ id: 't2', description: 'Plan changes', priority: 2, dependencies: ['t1'], estimatedEffort: 'medium' });
        tasks.push({ id: 't3', description: 'Apply modifications', priority: 3, dependencies: ['t2'], estimatedEffort: 'medium' });
      } else {
        tasks.push({ id: 't1', description: 'Process query', priority: 1, dependencies: [], estimatedEffort: 'low' });
        tasks.push({ id: 't2', description: 'Retrieve relevant context', priority: 2, dependencies: ['t1'], estimatedEffort: 'low' });
      }
      return { tasks, taskCount: tasks.length, intent, decompositionStrategy: 'sequential' };
    },
    parseResponse: (raw, prev) => {
      const parsed = extractJSON(raw);
      const intentResult = prev[0]?.result ?? {};
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        taskCount: typeof parsed.taskCount === 'number' ? parsed.taskCount : (Array.isArray(parsed.tasks) ? parsed.tasks.length : 0),
        intent: typeof parsed.intent === 'string' ? parsed.intent : (intentResult.intent as string) ?? 'question',
        decompositionStrategy: typeof parsed.decompositionStrategy === 'string' ? parsed.decompositionStrategy : 'sequential',
      };
    },
  },

  // ─── Brain 3: Strategic Planning ───
  {
    id: 3,
    name: 'StrategicPlanning',
    description: 'Creates execution plan with dependencies using AI',
    systemPrompt: (overlays) => buildSystemPrompt(3, overlays),
    buildPrompt: (input, prev) => {
      const decomposition = prev[1]?.result ?? {};
      const intentResult = prev[0]?.result ?? {};
      return `Given the intent analysis:\n${JSON.stringify(intentResult, null, 2)}\n\nAnd the task decomposition:\n${JSON.stringify(decomposition, null, 2)}\n\nFor the original message:\n"${input.message}"\n\nCreate a strategic execution plan. Define the critical path, determine parallelizability, and estimate duration. Return the full JSON with plan array, totalSteps, parallelizable, criticalPath, and estimatedDuration.`;
    },
    fallback: (_input, prev) => {
      const decomposition = prev[1]?.result ?? {};
      const tasks = (decomposition.tasks as Array<{ id: string; description: string; priority: number; dependencies?: string[] }>) ?? [];
      const steps = tasks.map((t, i) => ({
        stepId: t.id,
        description: t.description,
        dependsOn: i > 0 ? [tasks[i - 1].id] : [] as string[],
        estimatedComplexity: 'low' as string,
        milestone: i === tasks.length - 1,
      }));
      return { plan: steps, totalSteps: steps.length, parallelizable: false, criticalPath: steps.map((s) => s.stepId), estimatedDuration: `${steps.length * 2}s` };
    },
    parseResponse: (raw, prev) => {
      const parsed = extractJSON(raw);
      return {
        plan: Array.isArray(parsed.plan) ? parsed.plan : [],
        totalSteps: typeof parsed.totalSteps === 'number' ? parsed.totalSteps : (Array.isArray(parsed.plan) ? parsed.plan.length : 0),
        parallelizable: typeof parsed.parallelizable === 'boolean' ? parsed.parallelizable : false,
        criticalPath: Array.isArray(parsed.criticalPath) ? parsed.criticalPath : [],
        estimatedDuration: typeof parsed.estimatedDuration === 'string' ? parsed.estimatedDuration : 'unknown',
      };
    },
  },

  // ─── Brain 4: Execution Design ───
  {
    id: 4,
    name: 'ExecutionDesign',
    description: 'Determines tools, agents, and models needed using AI',
    systemPrompt: (overlays) => buildSystemPrompt(4, overlays),
    buildPrompt: (input, prev) => {
      const plan = prev[2]?.result ?? {};
      const intentResult = prev[0]?.result ?? {};
      return `Given the intent:\n${JSON.stringify(intentResult, null, 2)}\n\nAnd the execution plan:\n${JSON.stringify(plan, null, 2)}\n\nFor the original message:\n"${input.message}"\n\nDesign the execution strategy. For each plan step, assign the best tool, agent, and model. Determine if a multi-agent swarm is needed. Identify risks and mitigations. Return the full JSON with strategy array, requiresSwarm, preferredAgent, resourceRequirements, and riskMitigations.`;
    },
    fallback: (_input, prev) => {
      const plan = prev[2]?.result ?? {};
      const steps = (plan.plan as Array<{ stepId: string; description: string }>) ?? [];
      const strategy = steps.map((s) => ({
        stepId: s.stepId,
        tool: 'llm' as string,
        agent: 'coder' as string,
        model: 'default' as string,
        reason: 'Auto-assigned based on fallback logic',
      }));
      return { strategy, requiresSwarm: steps.length > 3, preferredAgent: 'coder', resourceRequirements: 'standard', riskMitigations: ['fallback to deterministic logic'] };
    },
    parseResponse: (raw, _prev) => {
      const parsed = extractJSON(raw);
      return {
        strategy: Array.isArray(parsed.strategy) ? parsed.strategy : [],
        requiresSwarm: typeof parsed.requiresSwarm === 'boolean' ? parsed.requiresSwarm : false,
        preferredAgent: typeof parsed.preferredAgent === 'string' ? parsed.preferredAgent : 'coder',
        resourceRequirements: typeof parsed.resourceRequirements === 'string' ? parsed.resourceRequirements : 'standard',
        riskMitigations: Array.isArray(parsed.riskMitigations) ? parsed.riskMitigations : [],
      };
    },
  },

  // ─── Brain 5: Validation ───
  {
    id: 5,
    name: 'Validation',
    description: 'Validates plan feasibility using AI reasoning',
    systemPrompt: (overlays) => buildSystemPrompt(5, overlays),
    buildPrompt: (input, prev) => {
      const intentResult = prev[0]?.result ?? {};
      const decomposition = prev[1]?.result ?? {};
      const plan = prev[2]?.result ?? {};
      const strategy = prev[3]?.result ?? {};
      return `Given the full pipeline so far:\n\nIntent: ${JSON.stringify(intentResult, null, 2)}\n\nDecomposition: ${JSON.stringify(decomposition, null, 2)}\n\nPlan: ${JSON.stringify(plan, null, 2)}\n\nStrategy: ${JSON.stringify(strategy, null, 2)}\n\nFor the original message:\n"${input.message}"\n\nValidate this plan for feasibility. Identify risks, gaps, and issues. Provide recommendations. Return the full JSON with feasible, riskLevel, issues, recommendations, stepCount, strategyValid, gaps, and confidence.`;
    },
    fallback: (_input, prev) => {
      const plan = prev[2]?.result ?? {};
      const strategy = prev[3]?.result ?? {};
      const steps = (plan.plan as unknown[]) ?? [];
      return {
        feasible: true,
        riskLevel: 'low' as string,
        issues: [] as string[],
        recommendations: ['Proceed with execution'],
        stepCount: steps.length,
        strategyValid: Boolean(strategy.strategy),
        gaps: [] as string[],
        confidence: 0.7,
      };
    },
    parseResponse: (raw, _prev) => {
      const parsed = extractJSON(raw);
      return {
        feasible: typeof parsed.feasible === 'boolean' ? parsed.feasible : true,
        riskLevel: ['low', 'medium', 'high', 'critical'].includes(parsed.riskLevel as string) ? (parsed.riskLevel as 'low' | 'medium' | 'high' | 'critical') : 'medium',
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Proceed with execution'],
        stepCount: typeof parsed.stepCount === 'number' ? parsed.stepCount : 0,
        strategyValid: typeof parsed.strategyValid === 'boolean' ? parsed.strategyValid : true,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    },
  },

  // ─── Brain 6: Optimization ───
  {
    id: 6,
    name: 'Optimization',
    description: 'Optimizes for speed/cost/reliability using AI',
    systemPrompt: (overlays) => buildSystemPrompt(6, overlays),
    buildPrompt: (input, prev) => {
      const validation = prev[4]?.result ?? {};
      const plan = prev[2]?.result ?? {};
      const strategy = prev[3]?.result ?? {};
      return `Given the validated plan:\n\nPlan: ${JSON.stringify(plan, null, 2)}\n\nStrategy: ${JSON.stringify(strategy, null, 2)}\n\nValidation: ${JSON.stringify(validation, null, 2)}\n\nFor the original message:\n"${input.message}"\n\nOptimize this execution plan for speed, cost, and reliability. Identify bottlenecks, parallelism opportunities, and trade-offs. Return the full JSON with optimized, optimizations, estimatedTimeMs, estimatedCost, feasible, tradeOffs, bottlenecks, and parallelismOpportunities.`;
    },
    fallback: (_input, prev) => {
      const verification = prev[4]?.result ?? {};
      return {
        optimized: false,
        optimizations: ['parallel_execution', 'caching_enabled'],
        estimatedTimeMs: 2000,
        estimatedCost: 0.002,
        feasible: verification.feasible ?? true,
        tradeOffs: ['Speed vs. thoroughness'],
        bottlenecks: [] as string[],
        parallelismOpportunities: ['Independent tasks can run in parallel'],
      };
    },
    parseResponse: (raw, _prev) => {
      const parsed = extractJSON(raw);
      return {
        optimized: typeof parsed.optimized === 'boolean' ? parsed.optimized : true,
        optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
        estimatedTimeMs: typeof parsed.estimatedTimeMs === 'number' ? parsed.estimatedTimeMs : 2000,
        estimatedCost: typeof parsed.estimatedCost === 'number' ? parsed.estimatedCost : 0.002,
        feasible: typeof parsed.feasible === 'boolean' ? parsed.feasible : true,
        tradeOffs: Array.isArray(parsed.tradeOffs) ? parsed.tradeOffs : [],
        bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks : [],
        parallelismOpportunities: Array.isArray(parsed.parallelismOpportunities) ? parsed.parallelismOpportunities : [],
      };
    },
  },

  // ─── Brain 7: Reflection & Learning ───
  {
    id: 7,
    name: 'ReflectionLearning',
    description: 'Records outcomes and extracts learnings using AI',
    systemPrompt: (overlays) => buildSystemPrompt(7, overlays),
    buildPrompt: (input, prev) => {
      const summary = prev.map((o, i) => `Brain ${i + 1} (${o.name}): ${JSON.stringify(o.result)}`).join('\n');
      return `Given the full 7-brain pipeline execution for:\n"${input.message}"\n\nPipeline summary:\n${summary}\n\nReflect on this entire pipeline execution. Extract learnings, identify patterns, and suggest improvements for future runs. Determine if this result should be cached. Return the full JSON with learned, patterns, insight, estimatedTimeMs, shouldCache, improvementSuggestions, and knowledgeGained.`;
    },
    fallback: (input, prev) => {
      const intentResult = prev[0]?.result ?? {};
      const optimization = prev[5]?.result ?? {};
      return {
        learned: true,
        patterns: [`intent_${intentResult.intent ?? 'unknown'}`],
        insight: `Processed "${input.message.slice(0, 50)}" successfully`,
        estimatedTimeMs: (optimization.estimatedTimeMs as number) ?? 1000,
        shouldCache: true,
        improvementSuggestions: ['Consider using AI-powered reasoning for richer analysis'],
        knowledgeGained: [`Pattern recognized: ${(intentResult.intent as string) ?? 'unknown'} intent`],
      };
    },
    parseResponse: (raw, _prev) => {
      const parsed = extractJSON(raw);
      return {
        learned: typeof parsed.learned === 'boolean' ? parsed.learned : true,
        patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
        insight: typeof parsed.insight === 'string' ? parsed.insight : 'Pipeline completed',
        estimatedTimeMs: typeof parsed.estimatedTimeMs === 'number' ? parsed.estimatedTimeMs : 0,
        shouldCache: typeof parsed.shouldCache === 'boolean' ? parsed.shouldCache : true,
        improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
        knowledgeGained: Array.isArray(parsed.knowledgeGained) ? parsed.knowledgeGained : [],
      };
    },
  },
];

// ─── Helper: Build Merged System Prompt ───
function buildSystemPrompt(brainId: BrainID, overlays: BrainOverlayType[]): string {
  let prompt = BASE_SYSTEM_PROMPTS[brainId];

  for (const overlay of overlays) {
    const overlayPrompt = OVERLAY_SYSTEM_PROMPTS[overlay]?.[brainId];
    if (overlayPrompt) {
      prompt += `\n\n[Overlay: ${overlay}] ${overlayPrompt}`;
    }
  }

  return prompt;
}

// ─── Helper: Extract JSON from AI response ───
function extractJSON(raw: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Continue to extraction attempts
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // Continue
    }
  }

  // Try to find first { ... } block
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // Continue
    }
  }

  // Try to fix common JSON issues: trailing commas, single quotes
  const cleaned = raw
    .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
    .replace(/'/g, '"');              // Single to double quotes
  try {
    return JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
  } catch {
    return {};
  }
}

// ─── Brain Engine Class ───
export class BrainEngine {
  private brains: BrainStep[] = BRAIN_STEPS;
  private activeOverlays: BrainOverlayType[] = ['default'];
  private eventHandlers: BrainEventHandler[] = [];

  /**
   * Execute the full 7-brain pipeline with AI-powered reasoning.
   * If AI fails for a brain step, falls back to deterministic logic (graceful degradation).
   */
  async executePipeline(input: BrainInput, overlays?: BrainOverlayType[]): Promise<BrainResult> {
    const effectiveOverlays = overlays ?? this.activeOverlays;
    const startTime = Date.now();
    const outputs: BrainOutput[] = [];
    const artifacts: ArtifactData[] = [];

    for (const brain of this.brains) {
      const brainStart = Date.now();

      this.emit({
        type: 'brain:start',
        brainId: brain.id,
        brainName: brain.name,
        overlay: effectiveOverlays.join(','),
        timestamp: Date.now(),
      });

      try {
        const result = await this.executeBrainStep(brain, input, outputs, effectiveOverlays);
        const durationMs = Date.now() - brainStart;

        outputs.push({
          brainId: brain.id,
          name: brain.name,
          result,
          durationMs,
          success: true,
        });

        this.emit({
          type: 'brain:complete',
          brainId: brain.id,
          brainName: brain.name,
          durationMs,
          timestamp: Date.now(),
        });
      } catch (error) {
        const durationMs = Date.now() - brainStart;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // ─── Graceful Degradation: Use fallback logic ───
        try {
          const fallbackResult = brain.fallback(input, outputs);
          outputs.push({
            brainId: brain.id,
            name: brain.name,
            result: { ...fallbackResult, _fallback: true, _fallbackReason: errorMessage },
            durationMs,
            success: true,
          });

          this.emit({
            type: 'brain:fallback',
            brainId: brain.id,
            brainName: brain.name,
            durationMs,
            error: errorMessage,
            timestamp: Date.now(),
          });
        } catch {
          // Even fallback failed — record error but CONTINUE pipeline
          outputs.push({
            brainId: brain.id,
            name: brain.name,
            result: {},
            durationMs,
            success: false,
            error: errorMessage,
          });

          this.emit({
            type: 'brain:error',
            brainId: brain.id,
            brainName: brain.name,
            durationMs,
            error: errorMessage,
            timestamp: Date.now(),
          });
        }
        // Continue with remaining brains instead of breaking
      }
    }

    const allSuccess = outputs.every((o) => o.success);
    const someSuccess = outputs.some((o) => o.success);

    // Generate response from the pipeline results
    const intentAnalysis = outputs[0]?.result ?? {};
    const intent = (intentAnalysis.intent as string) ?? 'question';
    const finalResponse = this.generateResponse(input.message, intent, outputs);

    const totalDurationMs = Date.now() - startTime;

    this.emit({
      type: 'pipeline:complete',
      durationMs: totalDurationMs,
      timestamp: Date.now(),
    });

    return {
      input,
      outputs,
      finalResponse,
      artifacts,
      totalDurationMs,
      status: allSuccess ? 'completed' : someSuccess ? 'partial' : 'failed',
    };
  }

  /**
   * Execute a single brain step using AI with fallback.
   */
  private async executeBrainStep(
    brain: BrainStep,
    input: BrainInput,
    previousOutputs: BrainOutput[],
    overlays: BrainOverlayType[],
  ): Promise<Record<string, unknown>> {
    const systemPrompt = brain.systemPrompt(overlays);
    const prompt = brain.buildPrompt(input, previousOutputs);

    // Attempt AI-powered execution
    const response = await modelRouter.executeWithFailover({
      prompt,
      systemPrompt,
      maxTokens: 2048,
      temperature: 0.4, // Lower temperature for structured reasoning
      metadata: {
        brainId: brain.id,
        brainName: brain.name,
        overlays,
      },
    });

    if (!response.success) {
      // AI failed — trigger fallback
      throw new Error(response.error ?? 'AI model request failed');
    }

    // Parse the AI response into structured output
    const parsed = brain.parseResponse(response.content, previousOutputs);
    return parsed;
  }

  /**
   * Set active overlays that modify brain behavior.
   */
  setOverlays(overlays: BrainOverlayType[]): void {
    this.activeOverlays = overlays.length > 0 ? overlays : ['default'];
  }

  /**
   * Get currently active overlays.
   */
  getOverlays(): BrainOverlayType[] {
    return [...this.activeOverlays];
  }

  /**
   * Get brain step configurations.
   */
  getBrains(): BrainStep[] {
    return [...this.brains];
  }

  /**
   * Register an event handler for brain pipeline events.
   */
  onEvent(handler: BrainEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Emit an event to all registered handlers.
   */
  private emit(event: BrainEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Event handler errors should not disrupt the pipeline
      }
    }
  }

  /**
   * Generate a human-readable response from pipeline results.
   */
  private generateResponse(message: string, intent: string, outputs: BrainOutput[]): string {
    const taskCount = (outputs[1]?.result?.taskCount as number) ?? 0;
    const feasible = (outputs[4]?.result?.feasible as boolean) ?? true;
    const optimized = (outputs[5]?.result?.optimized as boolean) ?? false;
    const riskLevel = (outputs[4]?.result?.riskLevel as string) ?? 'low';
    const fallbacksUsed = outputs.filter((o) => o.result?._fallback).length;

    // Build overlay awareness into the response
    const overlayNote = this.activeOverlays.length > 0 && !this.activeOverlays.includes('default')
      ? ` [Mode: ${this.activeOverlays.join(' + ')}]`
      : '';

    if (!feasible) {
      return `I analyzed your request "${message.slice(0, 80)}" but found potential issues with execution feasibility (risk: ${riskLevel}). Let me suggest an alternative approach.${overlayNote}`;
    }

    const intentResponses: Record<string, string> = {
      creation: `I'll help you create that. I've broken this down into ${taskCount} tasks and developed an execution plan. ${optimized ? 'The plan has been optimized for efficiency.' : ''} Let me proceed with implementation.${overlayNote}`,
      analysis: `I've analyzed your request and identified ${taskCount} steps needed. Let me gather the relevant information and provide you with a comprehensive analysis.${overlayNote}`,
      modification: `I understand you want to modify something. I've planned ${taskCount} steps for this change. ${optimized ? 'Execution has been optimized.' : ''} Ready to proceed.${overlayNote}`,
      command: `I've parsed your command and prepared an execution strategy with ${taskCount} steps. Ready to execute when you confirm.${overlayNote}`,
      question: `Great question! I've analyzed your query through my reasoning pipeline. Based on ${taskCount} processing steps, here's what I found:\n\nThe system has processed your request through all 7 brain stages, from intent analysis to learning reflection. Each stage contributed to building a comprehensive understanding of your needs.${overlayNote}`,
      conversation: `I'm here to help! I've processed your message through my reasoning pipeline. What would you like to explore further?${overlayNote}`,
    };

    const base = intentResponses[intent] ?? intentResponses['question'] ?? `I've processed your request through the 7-brain pipeline. Let me know if you'd like me to elaborate on any aspect.${overlayNote}`;

    if (fallbacksUsed > 0) {
      return `${base}\n\n⚠️ ${fallbacksUsed} brain step(s) used fallback reasoning (AI was unavailable). Results may be less detailed.`;
    }

    return base;
  }
}

// ─── Singleton Export ───
export const brainEngine = new BrainEngine();
