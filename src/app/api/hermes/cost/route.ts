import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Pricing Table — cost per 1K tokens
// ---------------------------------------------------------------------------

interface ModelPricing {
  inputPer1K: number;
  outputPer1K: number;
}

const PRICING: Record<string, ModelPricing> = {
  "gpt-4": { inputPer1K: 0.03, outputPer1K: 0.06 },
  "gpt-4-turbo": { inputPer1K: 0.01, outputPer1K: 0.03 },
  "gpt-3.5-turbo": { inputPer1K: 0.0005, outputPer1K: 0.0015 },
  "claude-3-opus": { inputPer1K: 0.015, outputPer1K: 0.075 },
  "claude-3-sonnet": { inputPer1K: 0.003, outputPer1K: 0.015 },
  "claude-3-haiku": { inputPer1K: 0.00025, outputPer1K: 0.00125 },
  "hermes-3": { inputPer1K: 0.0001, outputPer1K: 0.0002 },
  "mixtral-8x7b": { inputPer1K: 0.0005, outputPer1K: 0.0005 },
  "llama-3-70b": { inputPer1K: 0.0008, outputPer1K: 0.0008 },
};

// ---------------------------------------------------------------------------
// In-memory storage
// ---------------------------------------------------------------------------

interface CostTransaction {
  id: string;
  timestamp: string;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  taskName?: string;
}

interface BudgetSettings {
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number; // Percentage (0–1) at which to trigger alert
  hardStop: boolean; // If true, block transactions over budget
  updatedAt: string;
}

let transactions: CostTransaction[] = [];
let transactionCounter = 0;

const defaultBudget: BudgetSettings = {
  dailyLimit: 50,
  monthlyLimit: 1000,
  alertThreshold: 0.8,
  hardStop: false,
  updatedAt: new Date().toISOString(),
};

let budgetSettings: BudgetSettings = { ...defaultBudget };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordTransactionBody {
  action: "record";
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  taskName?: string;
}

interface SetBudgetBody {
  action: "set-budget";
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number;
  hardStop: boolean;
}

interface GetBudgetBody {
  action: "get-budget";
}

interface OptimizeBody {
  action: "optimize";
}

type CostRequestBody =
  | RecordTransactionBody
  | SetBudgetBody
  | GetBudgetBody
  | OptimizeBody;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) {
    // Default to hermes-3 pricing for unknown models
    const fallback = PRICING["hermes-3"]!;
    return (inputTokens / 1000) * fallback.inputPer1K + (outputTokens / 1000) * fallback.outputPer1K;
  }
  return (inputTokens / 1000) * pricing.inputPer1K + (outputTokens / 1000) * pricing.outputPer1K;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

function getTodayTransactions(): CostTransaction[] {
  const today = getTodayStr();
  return transactions.filter((t) => t.timestamp.startsWith(today));
}

function getMonthTransactions(): CostTransaction[] {
  const month = getMonthStr();
  return transactions.filter((t) => t.timestamp.startsWith(month));
}

function getDailySpend(): number {
  return getTodayTransactions().reduce((sum, t) => sum + t.cost, 0);
}

function getMonthlySpend(): number {
  return getMonthTransactions().reduce((sum, t) => sum + t.cost, 0);
}

function calculateBurnRate(): number {
  // Cost per hour based on last 24 hours
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const recentTransactions = transactions.filter(
    (t) => new Date(t.timestamp).getTime() >= twentyFourHoursAgo,
  );
  const totalCost = recentTransactions.reduce((sum, t) => sum + t.cost, 0);

  // Find the actual time span of these transactions
  if (recentTransactions.length === 0) return 0;

  const oldestTs = new Date(recentTransactions[0]!.timestamp).getTime();
  const newestTs = new Date(recentTransactions[recentTransactions.length - 1]!.timestamp).getTime();
  const spanHours = Math.max((newestTs - oldestTs) / (1000 * 60 * 60), 1);

  return Math.round((totalCost / spanHours) * 100) / 100;
}

function checkBudgetAlert(): { alert: boolean; level: "none" | "warning" | "critical"; messages: string[] } {
  const messages: string[] = [];
  let level: "none" | "warning" | "critical" = "none";

  const dailySpend = getDailySpend();
  const monthlySpend = getMonthlySpend();
  const threshold = budgetSettings.alertThreshold;

  if (dailySpend >= budgetSettings.dailyLimit) {
    messages.push(`Daily budget EXCEEDED: $${dailySpend.toFixed(2)} / $${budgetSettings.dailyLimit.toFixed(2)}`);
    level = "critical";
  } else if (dailySpend >= budgetSettings.dailyLimit * threshold) {
    messages.push(`Daily budget warning: $${dailySpend.toFixed(2)} / $${budgetSettings.dailyLimit.toFixed(2)} (${Math.round(dailySpend / budgetSettings.dailyLimit * 100)}%)`);
    level = "warning";
  }

  if (monthlySpend >= budgetSettings.monthlyLimit) {
    messages.push(`Monthly budget EXCEEDED: $${monthlySpend.toFixed(2)} / $${budgetSettings.monthlyLimit.toFixed(2)}`);
    level = "critical";
  } else if (monthlySpend >= budgetSettings.monthlyLimit * threshold && level !== "critical") {
    messages.push(`Monthly budget warning: $${monthlySpend.toFixed(2)} / $${budgetSettings.monthlyLimit.toFixed(2)} (${Math.round(monthlySpend / budgetSettings.monthlyLimit * 100)}%)`);
    if (level !== "critical") level = "warning";
  }

  return { alert: level !== "none", level, messages };
}

function generateOptimizationSuggestions(): CostOptimizationSuggestion[] {
  const suggestions: CostOptimizationSuggestion[] = [];

  if (transactions.length === 0) {
    return [{
      type: "info",
      title: "No data yet",
      description: "Start recording transactions to get optimization suggestions.",
      potentialSavings: 0,
    }];
  }

  // 1. Check for expensive model usage that could be downgraded
  const modelCosts: Record<string, { totalCost: number; count: number; totalInputTokens: number; totalOutputTokens: number }> = {};
  for (const t of transactions) {
    if (!modelCosts[t.model]) {
      modelCosts[t.model] = { totalCost: 0, count: 0, totalInputTokens: 0, totalOutputTokens: 0 };
    }
    modelCosts[t.model]!.totalCost += t.cost;
    modelCosts[t.model]!.count += 1;
    modelCosts[t.model]!.totalInputTokens += t.inputTokens;
    modelCosts[t.model]!.totalOutputTokens += t.outputTokens;
  }

  // Suggest cheaper alternatives for expensive models
  const expensiveModels = ["gpt-4", "claude-3-opus"];
  const cheaperAlternatives: Record<string, { model: string; estimatedSavings: number }> = {
    "gpt-4": { model: "gpt-4-turbo", estimatedSavings: 50 },
    "claude-3-opus": { model: "claude-3-sonnet", estimatedSavings: 80 },
  };

  for (const model of expensiveModels) {
    if (modelCosts[model] && modelCosts[model]!.count > 0) {
      const alt = cheaperAlternatives[model]!;
      const currentSpend = modelCosts[model]!.totalCost;
      suggestions.push({
        type: "model-downgrade",
        title: `Consider switching from ${model} to ${alt.model}`,
        description: `${model} is used ${modelCosts[model]!.count} times costing $${currentSpend.toFixed(2)}. ${alt.model} offers similar quality at lower cost for most tasks.`,
        potentialSavings: Math.round(currentSpend * (alt.estimatedSavings / 100) * 100) / 100,
      });
    }
  }

  // 2. Check for high output token usage
  const totalOutputTokens = transactions.reduce((s, t) => s + (t.outputTokens ?? 0), 0);
  const totalInputTokens = transactions.reduce((s, t) => s + (t.inputTokens ?? 0), 0);

  if (totalOutputTokens > totalInputTokens * 2) {
    suggestions.push({
      type: "token-optimization",
      title: "High output token ratio detected",
      description: `Output tokens (${totalOutputTokens.toLocaleString()}) are ${Math.round(totalOutputTokens / Math.max(totalInputTokens, 1))}x input tokens (${totalInputTokens.toLocaleString()}). Consider adding max_tokens limits or more specific prompts to reduce verbose responses.`,
      potentialSavings: Math.round(transactions.reduce((s, t) => s + t.cost, 0) * 0.2 * 100) / 100,
    });
  }

  // 3. Identify agents with highest spend
  const agentCosts: Record<string, number> = {};
  for (const t of transactions) {
    agentCosts[t.agentId] = (agentCosts[t.agentId] ?? 0) + t.cost;
  }

  const sortedAgents = Object.entries(agentCosts).sort((a, b) => b[1] - a[1]);
  if (sortedAgents.length > 1) {
    const topAgent = sortedAgents[0]!;
    const totalSpend = transactions.reduce((s, t) => s + t.cost, 0);
    const topAgentPercent = Math.round((topAgent[1] / totalSpend) * 100);

    if (topAgentPercent > 50) {
      suggestions.push({
        type: "agent-optimization",
        title: `Agent "${topAgent[0]}" dominates spending`,
        description: `This agent accounts for ${topAgentPercent}% of total cost ($${topAgent[1].toFixed(2)}). Consider reviewing its task assignments or using a cheaper model for simpler tasks.`,
        potentialSavings: Math.round(topAgent[1] * 0.3 * 100) / 100,
      });
    }
  }

  // 4. Caching suggestion
  if (transactions.length > 20) {
    suggestions.push({
      type: "caching",
      title: "Implement prompt caching",
      description: `With ${transactions.length} transactions, caching repeated prompts or system messages could reduce input token costs significantly. Many providers offer caching discounts.`,
      potentialSavings: Math.round(totalInputTokens / 1000 * 0.001 * 100) / 100,
    });
  }

  // 5. Budget optimization
  const dailySpend = getDailySpend();
  if (dailySpend < budgetSettings.dailyLimit * 0.3 && budgetSettings.dailyLimit > 10) {
    suggestions.push({
      type: "budget-adjustment",
      title: "Daily budget may be over-provisioned",
      description: `Current daily spend ($${dailySpend.toFixed(2)}) is well below the daily limit ($${budgetSettings.dailyLimit.toFixed(2)}). Consider adjusting to save on allocated budget.`,
      potentialSavings: 0,
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface CostOverview {
  timestamp: string;
  totalCost: number;
  totalTransactions: number;
  costByAgent: Record<string, { cost: number; transactions: number }>;
  costByModel: Record<string, { cost: number; transactions: number; inputTokens: number; outputTokens: number }>;
  costByDay: Record<string, number>;
  burnRate: number;
  budget: {
    dailyLimit: number;
    monthlyLimit: number;
    dailySpend: number;
    monthlySpend: number;
    dailyPercent: number;
    monthlyPercent: number;
    alert: {
      alert: boolean;
      level: "none" | "warning" | "critical";
      messages: string[];
    };
  };
  recentTransactions: CostTransaction[];
}

interface CostOptimizationSuggestion {
  type: string;
  title: string;
  description: string;
  potentialSavings: number;
}

interface BudgetStatus {
  settings: BudgetSettings;
  dailySpend: number;
  monthlySpend: number;
  dailyPercent: number;
  monthlyPercent: number;
  alert: {
    alert: boolean;
    level: "none" | "warning" | "critical";
    messages: string[];
  };
  hardStopTriggered: boolean;
}

// ---------------------------------------------------------------------------
// GET handler — return cost overview
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // Cost by agent
    const costByAgent: CostOverview["costByAgent"] = {};
    for (const t of transactions) {
      if (!costByAgent[t.agentId]) {
        costByAgent[t.agentId] = { cost: 0, transactions: 0 };
      }
      costByAgent[t.agentId]!.cost += t.cost;
      costByAgent[t.agentId]!.transactions += 1;
    }

    // Cost by model
    const costByModel: CostOverview["costByModel"] = {};
    for (const t of transactions) {
      if (!costByModel[t.model]) {
        costByModel[t.model] = { cost: 0, transactions: 0, inputTokens: 0, outputTokens: 0 };
      }
      costByModel[t.model]!.cost += t.cost;
      costByModel[t.model]!.transactions += 1;
      costByModel[t.model]!.inputTokens += t.inputTokens;
      costByModel[t.model]!.outputTokens += t.outputTokens;
    }

    // Cost by day
    const costByDay: CostOverview["costByDay"] = {};
    for (const t of transactions) {
      const day = t.timestamp.slice(0, 10);
      costByDay[day] = (costByDay[day] ?? 0) + t.cost;
    }

    const dailySpend = getDailySpend();
    const monthlySpend = getMonthlySpend();
    const budgetAlert = checkBudgetAlert();

    const overview: CostOverview = {
      timestamp: new Date().toISOString(),
      totalCost: Math.round(transactions.reduce((s, t) => s + t.cost, 0) * 100) / 100,
      totalTransactions: transactions.length,
      costByAgent,
      costByModel,
      costByDay,
      burnRate: calculateBurnRate(),
      budget: {
        dailyLimit: budgetSettings.dailyLimit,
        monthlyLimit: budgetSettings.monthlyLimit,
        dailySpend: Math.round(dailySpend * 100) / 100,
        monthlySpend: Math.round(monthlySpend * 100) / 100,
        dailyPercent: budgetSettings.dailyLimit > 0
          ? Math.round((dailySpend / budgetSettings.dailyLimit) * 10000) / 100
          : 0,
        monthlyPercent: budgetSettings.monthlyLimit > 0
          ? Math.round((monthlySpend / budgetSettings.monthlyLimit) * 10000) / 100
          : 0,
        alert: budgetAlert,
      },
      recentTransactions: transactions.slice(-20).reverse(),
    };

    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to retrieve cost overview",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — record transactions & manage budgets
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: CostRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'action' field" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "record":
      return handleRecord(body as RecordTransactionBody);
    case "set-budget":
      return handleSetBudget(body as SetBudgetBody);
    case "get-budget":
      return handleGetBudget();
    case "optimize":
      return handleOptimize();
    default:
      return NextResponse.json(
        { error: `Unknown action '${body.action}'. Valid actions: record, set-budget, get-budget, optimize` },
        { status: 400 },
      );
  }
}

// ---------------------------------------------------------------------------
// Record a cost transaction
// ---------------------------------------------------------------------------

function handleRecord(body: RecordTransactionBody): NextResponse {
  // Validate required fields
  if (!body.agentId || typeof body.agentId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'agentId'" },
      { status: 400 },
    );
  }
  if (!body.model || typeof body.model !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'model'" },
      { status: 400 },
    );
  }
  if (typeof body.inputTokens !== "number" || body.inputTokens < 0) {
    return NextResponse.json(
      { error: "Missing or invalid 'inputTokens' — must be a non-negative number" },
      { status: 400 },
    );
  }
  if (typeof body.outputTokens !== "number" || body.outputTokens < 0) {
    return NextResponse.json(
      { error: "Missing or invalid 'outputTokens' — must be a non-negative number" },
      { status: 400 },
    );
  }

  const cost = calculateCost(body.model, body.inputTokens, body.outputTokens);

  // Check hard stop
  if (budgetSettings.hardStop) {
    const dailySpend = getDailySpend();
    const monthlySpend = getMonthlySpend();

    if (dailySpend + cost > budgetSettings.dailyLimit) {
      return NextResponse.json(
        {
          error: "Hard stop: daily budget would be exceeded",
          dailySpend: Math.round(dailySpend * 100) / 100,
          dailyLimit: budgetSettings.dailyLimit,
          attemptedCost: Math.round(cost * 100) / 100,
          budgetAlert: checkBudgetAlert(),
        },
        { status: 429 },
      );
    }

    if (monthlySpend + cost > budgetSettings.monthlyLimit) {
      return NextResponse.json(
        {
          error: "Hard stop: monthly budget would be exceeded",
          monthlySpend: Math.round(monthlySpend * 100) / 100,
          monthlyLimit: budgetSettings.monthlyLimit,
          attemptedCost: Math.round(cost * 100) / 100,
          budgetAlert: checkBudgetAlert(),
        },
        { status: 429 },
      );
    }
  }

  // Record the transaction
  transactionCounter += 1;
  const transaction: CostTransaction = {
    id: `txn-${transactionCounter}`,
    timestamp: new Date().toISOString(),
    agentId: body.agentId,
    model: body.model,
    inputTokens: body.inputTokens,
    outputTokens: body.outputTokens,
    cost: Math.round(cost * 100000) / 100000, // 5 decimal precision
    taskName: body.taskName,
  };

  transactions.push(transaction);

  // Check if we need to alert
  const budgetAlert = checkBudgetAlert();

  return NextResponse.json({
    success: true,
    transaction,
    budgetAlert: budgetAlert.alert ? budgetAlert : undefined,
  }, { status: 201 });
}

// ---------------------------------------------------------------------------
// Set budget
// ---------------------------------------------------------------------------

function handleSetBudget(body: SetBudgetBody): NextResponse {
  if (typeof body.dailyLimit !== "number" || body.dailyLimit < 0) {
    return NextResponse.json(
      { error: "Invalid 'dailyLimit' — must be a non-negative number" },
      { status: 400 },
    );
  }
  if (typeof body.monthlyLimit !== "number" || body.monthlyLimit < 0) {
    return NextResponse.json(
      { error: "Invalid 'monthlyLimit' — must be a non-negative number" },
      { status: 400 },
    );
  }
  if (typeof body.alertThreshold !== "number" || body.alertThreshold < 0 || body.alertThreshold > 1) {
    return NextResponse.json(
      { error: "Invalid 'alertThreshold' — must be a number between 0 and 1" },
      { status: 400 },
    );
  }
  if (typeof body.hardStop !== "boolean") {
    return NextResponse.json(
      { error: "Invalid 'hardStop' — must be a boolean" },
      { status: 400 },
    );
  }

  budgetSettings = {
    dailyLimit: body.dailyLimit,
    monthlyLimit: body.monthlyLimit,
    alertThreshold: body.alertThreshold,
    hardStop: body.hardStop,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    budget: budgetSettings,
    currentStatus: {
      dailySpend: Math.round(getDailySpend() * 100) / 100,
      monthlySpend: Math.round(getMonthlySpend() * 100) / 100,
      alert: checkBudgetAlert(),
    },
  });
}

// ---------------------------------------------------------------------------
// Get budget status
// ---------------------------------------------------------------------------

function handleGetBudget(): NextResponse {
  const dailySpend = getDailySpend();
  const monthlySpend = getMonthlySpend();
  const budgetAlert = checkBudgetAlert();

  const status: BudgetStatus = {
    settings: budgetSettings,
    dailySpend: Math.round(dailySpend * 100) / 100,
    monthlySpend: Math.round(monthlySpend * 100) / 100,
    dailyPercent: budgetSettings.dailyLimit > 0
      ? Math.round((dailySpend / budgetSettings.dailyLimit) * 10000) / 100
      : 0,
    monthlyPercent: budgetSettings.monthlyLimit > 0
      ? Math.round((monthlySpend / budgetSettings.monthlyLimit) * 10000) / 100
      : 0,
    alert: budgetAlert,
    hardStopTriggered: budgetSettings.hardStop && (
      dailySpend >= budgetSettings.dailyLimit || monthlySpend >= budgetSettings.monthlyLimit
    ),
  };

  return NextResponse.json(status);
}

// ---------------------------------------------------------------------------
// Optimize — return cost optimization suggestions
// ---------------------------------------------------------------------------

function handleOptimize(): NextResponse {
  const suggestions = generateOptimizationSuggestions();
  const totalPotentialSavings = suggestions.reduce((s, sug) => s + sug.potentialSavings, 0);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    suggestions,
    totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
    currentMonthlySpend: Math.round(getMonthlySpend() * 100) / 100,
    pricingTable: PRICING,
  });
}
