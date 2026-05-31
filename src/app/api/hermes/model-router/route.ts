import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  contextWindow: number;
  strengths: string[];
  maxTokens: number;
}

interface RoutingRule {
  taskType: string;
  modelId: string;
  priority: number;
}

interface PerformanceEntry {
  modelId: string;
  task: string;
  latency: number;
  success: boolean;
  cost: number;
  timestamp: number;
  qualityScore?: number;
}

interface RoutingDecision {
  modelId: string;
  modelName: string;
  provider: string;
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
  alternatives: {
    modelId: string;
    modelName: string;
    reason: string;
  }[];
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const models = new Map<string, ModelInfo>();
const routingRules = new Map<string, RoutingRule>();
const performanceLog: PerformanceEntry[] = [];

// ---------------------------------------------------------------------------
// Pre-seed models
// ---------------------------------------------------------------------------

const SEED_MODELS: ModelInfo[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "openai",
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
    contextWindow: 8192,
    strengths: ["reasoning", "code", "analysis", "research"],
    maxTokens: 4096,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    contextWindow: 128000,
    strengths: ["reasoning", "code", "speed", "long-context", "research"],
    maxTokens: 4096,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    contextWindow: 16385,
    strengths: ["chat", "speed", "cost", "simple-tasks"],
    maxTokens: 4096,
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "anthropic",
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    contextWindow: 200000,
    strengths: ["reasoning", "research", "analysis", "long-context", "nuance"],
    maxTokens: 4096,
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    contextWindow: 200000,
    strengths: ["code", "speed", "reasoning", "balanced", "long-context"],
    maxTokens: 4096,
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    contextWindow: 200000,
    strengths: ["chat", "speed", "cost", "simple-tasks"],
    maxTokens: 4096,
  },
  {
    id: "hermes-3",
    name: "Hermes 3",
    provider: "nous-research",
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0002,
    contextWindow: 32768,
    strengths: ["chat", "roleplay", "creative", "cost"],
    maxTokens: 4096,
  },
  {
    id: "mixtral-8x7b",
    name: "Mixtral 8x7B",
    provider: "mistral",
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0005,
    contextWindow: 32000,
    strengths: ["code", "speed", "cost", "multilingual"],
    maxTokens: 4096,
  },
  {
    id: "llama-3-70b",
    name: "Llama 3 70B",
    provider: "meta",
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.0008,
    contextWindow: 8192,
    strengths: ["code", "reasoning", "open-source", "cost"],
    maxTokens: 4096,
  },
];

for (const model of SEED_MODELS) {
  models.set(model.id, model);
}

// Default routing rules
const DEFAULT_RULES: RoutingRule[] = [
  { taskType: "research", modelId: "claude-3-opus", priority: 1 },
  { taskType: "code", modelId: "gpt-4-turbo", priority: 1 },
  { taskType: "chat", modelId: "claude-3-haiku", priority: 1 },
  { taskType: "analysis", modelId: "gpt-4", priority: 1 },
  { taskType: "creative", modelId: "hermes-3", priority: 1 },
  { taskType: "reasoning", modelId: "claude-3-opus", priority: 1 },
  { taskType: "speed", modelId: "gpt-3.5-turbo", priority: 1 },
  { taskType: "long-context", modelId: "claude-3-sonnet", priority: 1 },
];

for (const rule of DEFAULT_RULES) {
  routingRules.set(rule.taskType, rule);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TASK_TYPE_MAP: Record<string, string[]> = {
  research: ["research", "retrieval", "search", "find", "investigate"],
  code: ["code", "execute", "implement", "debug", "program", "develop"],
  chat: ["chat", "conversation", "talk", "discuss", "ask"],
  analysis: ["analysis", "analyze", "review", "evaluate", "assess"],
  creative: ["creative", "write", "story", "brainstorm", "imagine"],
  reasoning: ["reasoning", "logic", "deduce", "infer", "solve"],
  speed: ["quick", "fast", "urgent", "immediate"],
  "long-context": ["long", "document", "summarize", "large"],
};

function detectTaskType(task: string): string {
  const lower = task.toLowerCase();

  for (const [type, keywords] of Object.entries(TASK_TYPE_MAP)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return type;
      }
    }
  }

  return "chat"; // default fallback
}

function getModelPerformanceSummary(modelId: string): {
  avgLatency: number;
  successRate: number;
  avgCost: number;
  avgQuality: number;
  totalCalls: number;
} {
  const entries = performanceLog.filter((e) => e.modelId === modelId);

  if (entries.length === 0) {
    return {
      avgLatency: 0,
      successRate: 1,
      avgCost: 0,
      avgQuality: 0.8,
      totalCalls: 0,
    };
  }

  const avgLatency =
    entries.reduce((sum, e) => sum + e.latency, 0) / entries.length;
  const successRate =
    entries.filter((e) => e.success).length / entries.length;
  const avgCost =
    entries.reduce((sum, e) => sum + e.cost, 0) / entries.length;
  const qualityEntries = entries.filter((e) => e.qualityScore !== undefined);
  const avgQuality =
    qualityEntries.length > 0
      ? qualityEntries.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) /
        qualityEntries.length
      : 0.8;

  return {
    avgLatency: Math.round(avgLatency),
    successRate,
    avgCost: Math.round(avgCost * 10000) / 10000,
    avgQuality,
    totalCalls: entries.length,
  };
}

function routeRequest(
  task: string,
  priority: "cost" | "speed" | "quality",
  agentId: string,
): RoutingDecision {
  const taskType = detectTaskType(task);

  // Check explicit routing rules first
  const explicitRule = routingRules.get(taskType);

  // Get all models and score them
  const allModels = Array.from(models.values());
  const scored = allModels.map((model) => {
    let score = 0;
    const perf = getModelPerformanceSummary(model.id);

    // Task match scoring
    const taskStrengthMatch = model.strengths.some((s) =>
      TASK_TYPE_MAP[taskType]?.includes(s),
    );
    if (taskStrengthMatch) score += 30;
    if (model.strengths.includes(taskType)) score += 20;

    // Priority-based scoring
    switch (priority) {
      case "cost":
        // Lower cost = higher score
        const maxCost = Math.max(...allModels.map((m) => m.costPer1kInput + m.costPer1kOutput));
        const costNorm = maxCost > 0 ? (model.costPer1kInput + model.costPer1kOutput) / maxCost : 0;
        score += (1 - costNorm) * 40;
        break;
      case "speed":
        // Faster models (cheaper usually = faster for our sim)
        if (model.strengths.includes("speed")) score += 30;
        if (model.strengths.includes("cost")) score += 10;
        // Penalize very large context windows (slower processing)
        if (model.contextWindow > 100000) score -= 5;
        break;
      case "quality":
        // Higher cost generally correlates with quality
        const minCost = Math.min(...allModels.map((m) => m.costPer1kInput + m.costPer1kOutput));
        const maxCostQ = Math.max(...allModels.map((m) => m.costPer1kInput + m.costPer1kOutput));
        const costRange = maxCostQ - minCost;
        const qualityNorm = costRange > 0 ? (model.costPer1kInput + model.costPer1kOutput - minCost) / costRange : 0;
        score += qualityNorm * 40;
        if (model.strengths.includes("reasoning")) score += 15;
        if (model.strengths.includes("research")) score += 10;
        break;
    }

    // Performance bonus
    score += perf.successRate * 10;
    if (perf.totalCalls > 0) {
      score += perf.avgQuality * 10;
    }

    // Explicit rule bonus
    if (explicitRule && model.id === explicitRule.modelId) {
      score += 25;
    }

    return { model, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const winner = scored[0];
  const alternatives = scored.slice(1, 3).map((s) => ({
    modelId: s.model.id,
    modelName: s.model.name,
    reason: `Score: ${Math.round(s.score)}/100 — ${s.model.strengths.slice(0, 3).join(", ")}`,
  }));

  // Log the routing decision
  performanceLog.push({
    modelId: winner.model.id,
    task: taskType,
    latency: Math.round(Math.random() * 500 + 200), // simulated
    success: true,
    cost: winner.model.costPer1kInput * 0.5 + winner.model.costPer1kOutput * 0.3,
    timestamp: Date.now(),
    qualityScore: priority === "quality" ? 0.95 : priority === "speed" ? 0.7 : 0.85,
  });

  // Keep performance log manageable
  if (performanceLog.length > 1000) {
    performanceLog.splice(0, performanceLog.length - 1000);
  }

  const reasonParts: string[] = [];
  if (explicitRule?.modelId === winner.model.id) {
    reasonParts.push(`Explicit routing rule for '${taskType}'`);
  }
  reasonParts.push(`Task type: ${taskType}`);
  reasonParts.push(`Priority: ${priority}`);
  reasonParts.push(`Score: ${Math.round(winner.score)}/100`);

  return {
    modelId: winner.model.id,
    modelName: winner.model.name,
    provider: winner.model.provider,
    reason: reasonParts.join(" | "),
    estimatedCost:
      Math.round(
        (winner.model.costPer1kInput + winner.model.costPer1kOutput) * 1000,
      ) / 1000,
    estimatedLatency: Math.round(Math.random() * 800 + 200),
    alternatives,
  };
}

// ---------------------------------------------------------------------------
// GET — Return available models, costs, and routing rules
// ---------------------------------------------------------------------------

export async function GET() {
  const modelList = Array.from(models.values()).map((model) => ({
    ...model,
    performance: getModelPerformanceSummary(model.id),
  }));

  const rulesList = Array.from(routingRules.values());

  return NextResponse.json({
    models: modelList,
    routingRules: rulesList,
    taskTypes: Object.keys(TASK_TYPE_MAP),
    totalRoutingDecisions: performanceLog.length,
  });
}

// ---------------------------------------------------------------------------
// POST — Manage routing
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = body.action as string | undefined;

  if (!action) {
    return NextResponse.json(
      { error: "Missing 'action' field" },
      { status: 400 },
    );
  }

  switch (action) {
    case "route":
      return handleRoute(body);
    case "add-model":
      return handleAddModel(body);
    case "set-rule":
      return handleSetRule(body);
    case "get-performance":
      return handleGetPerformance();
    case "suggest-optimizations":
      return handleSuggestOptimizations();
    default:
      return NextResponse.json(
        {
          error: `Unknown action '${action}'. Valid: route, add-model, set-rule, get-performance, suggest-optimizations`,
        },
        { status: 400 },
      );
  }
}

// ---------------------------------------------------------------------------
// route — Return recommended model for a given task
// ---------------------------------------------------------------------------

function handleRoute(
  body: Record<string, unknown>,
): NextResponse {
  const { task, priority, agentId } = body;

  if (!task || typeof task !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'task'" },
      { status: 400 },
    );
  }

  if (
    !priority ||
    !["cost", "speed", "quality"].includes(priority as string)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid 'priority' — must be 'cost', 'speed', or 'quality'" },
      { status: 400 },
    );
  }

  if (!agentId || typeof agentId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'agentId'" },
      { status: 400 },
    );
  }

  const decision = routeRequest(
    task,
    priority as "cost" | "speed" | "quality",
    agentId,
  );

  return NextResponse.json({
    success: true,
    routing: decision,
  });
}

// ---------------------------------------------------------------------------
// add-model — Add a new model to the router
// ---------------------------------------------------------------------------

function handleAddModel(
  body: Record<string, unknown>,
): NextResponse {
  const { id, name, provider, costPer1kInput, costPer1kOutput, contextWindow, strengths, maxTokens } =
    body;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'id'" },
      { status: 400 },
    );
  }

  if (models.has(id)) {
    return NextResponse.json(
      { error: `Model '${id}' already exists` },
      { status: 409 },
    );
  }

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'name'" },
      { status: 400 },
    );
  }

  if (!provider || typeof provider !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'provider'" },
      { status: 400 },
    );
  }

  const model: ModelInfo = {
    id,
    name,
    provider,
    costPer1kInput:
      typeof costPer1kInput === "number" ? costPer1kInput : 0,
    costPer1kOutput:
      typeof costPer1kOutput === "number" ? costPer1kOutput : 0,
    contextWindow:
      typeof contextWindow === "number" ? contextWindow : 4096,
    strengths: Array.isArray(strengths)
      ? (strengths as string[])
      : [],
    maxTokens:
      typeof maxTokens === "number" ? maxTokens : 4096,
  };

  models.set(id, model);

  return NextResponse.json(
    {
      success: true,
      model,
      message: `Model '${name}' added to router`,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// set-rule — Set a routing rule for a task type
// ---------------------------------------------------------------------------

function handleSetRule(
  body: Record<string, unknown>,
): NextResponse {
  const { taskType, modelId, priority } = body;

  if (!taskType || typeof taskType !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'taskType'" },
      { status: 400 },
    );
  }

  if (!modelId || typeof modelId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'modelId'" },
      { status: 400 },
    );
  }

  if (!models.has(modelId)) {
    return NextResponse.json(
      {
        error: `Model '${modelId}' not found`,
        availableModels: Array.from(models.keys()),
      },
      { status: 404 },
    );
  }

  const rule: RoutingRule = {
    taskType,
    modelId,
    priority: typeof priority === "number" ? priority : 1,
  };

  routingRules.set(taskType, rule);

  return NextResponse.json({
    success: true,
    rule,
    message: `Routing rule set: '${taskType}' → '${modelId}'`,
  });
}

// ---------------------------------------------------------------------------
// get-performance — Return model performance comparison data
// ---------------------------------------------------------------------------

function handleGetPerformance(): NextResponse {
  const modelPerformance = Array.from(models.keys()).map((modelId) => {
    const model = models.get(modelId)!;
    const perf = getModelPerformanceSummary(modelId);
    return {
      modelId,
      modelName: model.name,
      provider: model.provider,
      ...perf,
    };
  });

  // Sort by success rate desc, then by quality
  modelPerformance.sort(
    (a, b) =>
      b.successRate * b.avgQuality - a.successRate * a.avgQuality,
  );

  const totalCalls = performanceLog.length;
  const totalCost = performanceLog.reduce((sum, e) => sum + e.cost, 0);
  const avgLatency =
    totalCalls > 0
      ? Math.round(
          performanceLog.reduce((sum, e) => sum + e.latency, 0) / totalCalls,
        )
      : 0;

  return NextResponse.json({
    models: modelPerformance,
    summary: {
      totalCalls,
      totalCost: Math.round(totalCost * 100) / 100,
      avgLatency,
    },
    recentDecisions: performanceLog.slice(-20),
  });
}

// ---------------------------------------------------------------------------
// suggest-optimizations — Analyze usage and suggest model switches
// ---------------------------------------------------------------------------

function handleSuggestOptimizations(): NextResponse {
  const suggestions: {
    type: "cost" | "speed" | "quality";
    current: string;
    suggested: string;
    reason: string;
    estimatedSavings: number;
  }[] = [];

  // Analyze performance data per model
  const modelUsage = new Map<
    string,
    { calls: number; totalCost: number; avgLatency: number; avgQuality: number }
  >();

  for (const entry of performanceLog) {
    const existing = modelUsage.get(entry.modelId) ?? {
      calls: 0,
      totalCost: 0,
      avgLatency: 0,
      avgQuality: 0,
    };
    existing.calls++;
    existing.totalCost += entry.cost;
    existing.avgLatency =
      (existing.avgLatency * (existing.calls - 1) + entry.latency) /
      existing.calls;
    existing.avgQuality =
      (existing.avgQuality * (existing.calls - 1) +
        (entry.qualityScore ?? 0.8)) /
      existing.calls;
    modelUsage.set(entry.modelId, existing);
  }

  const allModels = Array.from(models.values());

  for (const [modelId, usage] of modelUsage.entries()) {
    const currentModel = models.get(modelId);
    if (!currentModel) continue;

    // Find cheaper alternatives with similar quality
    const cheaperAlternatives = allModels.filter(
      (m) =>
        m.id !== modelId &&
        m.costPer1kInput + m.costPer1kOutput <
          currentModel.costPer1kInput + currentModel.costPer1kOutput,
    );

    for (const alt of cheaperAlternatives) {
      const costDiff =
        (currentModel.costPer1kInput +
          currentModel.costPer1kOutput -
          alt.costPer1kInput -
          alt.costPer1kOutput) *
        usage.calls;

      if (costDiff > 0.01) {
        suggestions.push({
          type: "cost",
          current: currentModel.name,
          suggested: alt.name,
          reason: `Switch from ${currentModel.name} ($${currentModel.costPer1kInput + currentModel.costPer1kOutput}/1k) to ${alt.name} ($${alt.costPer1kInput + alt.costPer1kOutput}/1k) for ${usage.calls} calls`,
          estimatedSavings: Math.round(costDiff * 100) / 100,
        });
      }
    }

    // Find faster alternatives
    const fasterAlternatives = allModels.filter(
      (m) =>
        m.id !== modelId &&
        m.strengths.includes("speed") &&
        !currentModel.strengths.includes("speed"),
    );

    for (const alt of fasterAlternatives.slice(0, 1)) {
      suggestions.push({
        type: "speed",
        current: currentModel.name,
        suggested: alt.name,
        reason: `${alt.name} is optimized for speed; current model ${currentModel.name} avg latency is ${Math.round(usage.avgLatency)}ms`,
        estimatedSavings: 0,
      });
    }

    // Find higher quality alternatives for low quality scores
    if (usage.avgQuality < 0.7) {
      const betterModels = allModels.filter(
        (m) =>
          m.id !== modelId &&
          (m.strengths.includes("reasoning") ||
            m.strengths.includes("research")) &&
          m.costPer1kInput + m.costPer1kOutput >
            currentModel.costPer1kInput + currentModel.costPer1kOutput,
      );

      for (const alt of betterModels.slice(0, 1)) {
        suggestions.push({
          type: "quality",
          current: currentModel.name,
          suggested: alt.name,
          reason: `Low quality score (${Math.round(usage.avgQuality * 100)}%) — upgrade to ${alt.name} for better results`,
          estimatedSavings: 0,
        });
      }
    }
  }

  // Deduplicate and limit
  const uniqueSuggestions = suggestions.filter(
    (s, i, arr) =>
      arr.findIndex(
        (x) =>
          x.current === s.current &&
          x.suggested === s.suggested &&
          x.type === s.type,
      ) === i,
  ).slice(0, 10);

  return NextResponse.json({
    suggestions: uniqueSuggestions,
    analysis: {
      modelsAnalyzed: modelUsage.size,
      totalCalls: performanceLog.length,
      totalSpend: Math.round(
        performanceLog.reduce((sum, e) => sum + e.cost, 0) * 100,
      ) / 100,
      potentialSavings: Math.round(
        uniqueSuggestions
          .filter((s) => s.type === "cost")
          .reduce((sum, s) => sum + s.estimatedSavings, 0) * 100,
      ) / 100,
    },
  });
}
