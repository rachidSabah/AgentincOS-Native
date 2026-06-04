import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduledReport {
  id: string;
  type: string;
  schedule: string;
  delivery: "dashboard" | "email" | "slack" | "obsidian";
  createdAt: number;
  lastRun?: number;
  nextRun: number;
  active: boolean;
}

interface ReportData {
  id: string;
  type: string;
  generatedAt: number;
  dateRange: { from: string; to: string };
  summary: {
    tasksCompleted: number;
    tasksFailed: number;
    totalCost: number;
    costBreakdown: Record<string, number>;
    avgResponseTime: number;
    uptime: number;
  };
  agentPerformance: {
    agentId: string;
    name: string;
    tasksCompleted: number;
    successRate: number;
    totalCost: number;
    avgLatency: number;
  }[];
  skillUsage: {
    skill: string;
    count: number;
    successRate: number;
    avgCost: number;
  }[];
  errors: {
    type: string;
    count: number;
    lastOccurrence: number;
    message: string;
  }[];
  recommendations: string[];
  metrics: Record<string, number>;
}

// ---------------------------------------------------------------------------
// In-memory stores — simulated metric data
// ---------------------------------------------------------------------------

const scheduledReports = new Map<string, ScheduledReport>();
const generatedReports = new Map<string, ReportData>();

// Simulated in-memory cost, task, and metric data
const taskMetrics = {
  totalCompleted: 1284,
  totalFailed: 43,
  todayCompleted: 67,
  todayFailed: 2,
};

const costMetrics: Record<string, number> = {
  "gpt-4": 12.45,
  "gpt-4-turbo": 8.32,
  "gpt-3.5-turbo": 1.23,
  "claude-3-opus": 15.67,
  "claude-3-sonnet": 4.89,
  "claude-3-haiku": 0.45,
  "hermes-3": 0.12,
  "mixtral-8x7b": 0.89,
  "llama-3-70b": 0.56,
};

const agentData = [
  { agentId: "agent-research-01", name: "Research Agent", tasksCompleted: 234, successRate: 0.94, totalCost: 18.45, avgLatency: 2300 },
  { agentId: "agent-code-01", name: "Code Agent", tasksCompleted: 456, successRate: 0.91, totalCost: 12.67, avgLatency: 1800 },
  { agentId: "agent-chat-01", name: "Chat Agent", tasksCompleted: 389, successRate: 0.98, totalCost: 3.21, avgLatency: 450 },
  { agentId: "agent-analysis-01", name: "Analysis Agent", tasksCompleted: 123, successRate: 0.89, totalCost: 7.89, avgLatency: 3100 },
  { agentId: "agent-creative-01", name: "Creative Agent", tasksCompleted: 82, successRate: 0.96, totalCost: 1.44, avgLatency: 2100 },
];

const skillData = [
  { skill: "web-search", count: 345, successRate: 0.97, avgCost: 0.02 },
  { skill: "code-execution", count: 278, successRate: 0.93, avgCost: 0.05 },
  { skill: "data-analysis", count: 156, successRate: 0.91, avgCost: 0.08 },
  { skill: "summarization", count: 234, successRate: 0.99, avgCost: 0.01 },
  { skill: "translation", count: 89, successRate: 0.96, avgCost: 0.02 },
  { skill: "image-generation", count: 67, successRate: 0.88, avgCost: 0.12 },
  { skill: "file-operations", count: 115, successRate: 0.95, avgCost: 0.01 },
];

const errorData = [
  { type: "timeout", count: 12, lastOccurrence: Date.now() - 3600000, message: "Request timed out after 30s" },
  { type: "rate-limit", count: 8, lastOccurrence: Date.now() - 7200000, message: "API rate limit exceeded" },
  { type: "model-error", count: 5, lastOccurrence: Date.now() - 14400000, message: "Model returned invalid response" },
  { type: "auth-failure", count: 2, lastOccurrence: Date.now() - 86400000, message: "Authentication token expired" },
  { type: "memory-limit", count: 3, lastOccurrence: Date.now() - 43200000, message: "Context window exceeded" },
];

// Report templates
const REPORT_TEMPLATES = [
  {
    id: "daily-digest",
    name: "Daily Digest",
    description: "Summary of daily activity, costs, and agent performance",
    defaultMetrics: ["tasks", "cost", "agents", "errors"],
    scheduleOptions: ["every-day", "every-weekday"],
  },
  {
    id: "weekly-analytics",
    name: "Weekly Analytics",
    description: "Comprehensive weekly analysis with trends and comparisons",
    defaultMetrics: ["tasks", "cost", "agents", "skills", "errors", "trends"],
    scheduleOptions: ["every-week", "every-monday"],
  },
  {
    id: "monthly-roi",
    name: "Monthly ROI",
    description: "Monthly return on investment analysis and cost optimization",
    defaultMetrics: ["cost", "roi", "optimization", "trends", "comparison"],
    scheduleOptions: ["every-month", "first-of-month"],
  },
  {
    id: "custom",
    name: "Custom Report",
    description: "Custom report with user-selected metrics and date range",
    defaultMetrics: [],
    scheduleOptions: ["on-demand", "custom"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `rpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseScheduleNextRun(schedule: string): number {
  const now = Date.now();
  switch (schedule) {
    case "every-day":
    case "every-weekday":
      return now + 86400_000;
    case "every-week":
    case "every-monday":
      return now + 7 * 86400_000;
    case "every-month":
    case "first-of-month":
      return now + 30 * 86400_000;
    default:
      return now + 86400_000;
  }
}

function generateReportContent(
  type: string,
  dateRange?: { from: string; to: string },
  metrics?: string[],
): ReportData {
  const id = generateId();
  const now = Date.now();
  const from = dateRange?.from ?? new Date(now - 86400_000).toISOString().split("T")[0];
  const to = dateRange?.to ?? new Date(now).toISOString().split("T")[0];

  const totalCost = Object.values(costMetrics).reduce((sum, c) => sum + c, 0);
  const selectedMetrics = metrics ?? REPORT_TEMPLATES.find((t) => t.id === type)?.defaultMetrics ?? ["tasks", "cost"];

  // Adjust data based on report type
  let multiplier = 1;
  if (type === "weekly-analytics") multiplier = 7;
  if (type === "monthly-roi") multiplier = 30;

  const recommendations: string[] = [];

  // Generate recommendations based on data analysis
  const failedRate = taskMetrics.totalFailed / (taskMetrics.totalCompleted + taskMetrics.totalFailed);
  if (failedRate > 0.05) {
    recommendations.push(
      `Task failure rate is ${(failedRate * 100).toFixed(1)}% — consider reviewing error patterns and improving agent reliability.`,
    );
  }

  const highCostAgent = agentData.reduce((max, a) => (a.totalCost > max.totalCost ? a : max), agentData[0]);
  if (highCostAgent.totalCost > 15) {
    recommendations.push(
      `${highCostAgent.name} has the highest cost ($${highCostAgent.totalCost.toFixed(2)}) — consider switching to a cheaper model for routine tasks.`,
    );
  }

  const lowSuccessSkill = skillData.reduce((min, s) => (s.successRate < min.successRate ? s : min), skillData[0]);
  if (lowSuccessSkill.successRate < 0.9) {
    recommendations.push(
      `${lowSuccessSkill.skill} has a low success rate (${(lowSuccessSkill.successRate * 100).toFixed(0)}%) — investigate and improve reliability.`,
    );
  }

  if (errorData.some((e) => e.type === "rate-limit" && e.count > 5)) {
    recommendations.push(
      "Rate limit errors detected — consider implementing request queuing or upgrading API tiers.",
    );
  }

  if (totalCost > 40) {
    recommendations.push(
      `Total spend is $${totalCost.toFixed(2)} — review model usage for potential cost savings.`,
    );
  }

  recommendations.push(
    "Schedule regular security scans to maintain compliance and data protection standards.",
  );

  const customMetrics: Record<string, number> = {};
  if (selectedMetrics.includes("tasks")) {
    customMetrics.tasksCompleted = taskMetrics.totalCompleted * multiplier;
    customMetrics.tasksFailed = taskMetrics.totalFailed * multiplier;
    customMetrics.taskSuccessRate =
      Math.round(
        (taskMetrics.totalCompleted /
          (taskMetrics.totalCompleted + taskMetrics.totalFailed)) *
          10000,
      ) / 100;
  }
  if (selectedMetrics.includes("cost")) {
    customMetrics.totalCost = Math.round(totalCost * multiplier * 100) / 100;
    customMetrics.avgCostPerTask =
      Math.round((totalCost / taskMetrics.totalCompleted) * 10000 * multiplier) / 10000;
  }
  if (selectedMetrics.includes("roi")) {
    customMetrics.estimatedValue = Math.round(totalCost * 3.2 * multiplier * 100) / 100;
    customMetrics.roi = Math.round((totalCost * 3.2 - totalCost) / totalCost * 10000) / 100;
  }
  if (selectedMetrics.includes("trends")) {
    customMetrics.costTrend = 5.3; // % increase
    customMetrics.taskTrend = 12.7; // % increase
    customMetrics.errorTrend = -2.1; // % decrease (good)
  }

  const report: ReportData = {
    id,
    type,
    generatedAt: now,
    dateRange: { from, to },
    summary: {
      tasksCompleted: taskMetrics.totalCompleted * multiplier,
      tasksFailed: taskMetrics.totalFailed * multiplier,
      totalCost: Math.round(totalCost * multiplier * 100) / 100,
      costBreakdown: Object.fromEntries(
        Object.entries(costMetrics).map(([k, v]) => [
          k,
          Math.round(v * multiplier * 100) / 100,
        ]),
      ),
      avgResponseTime: Math.round(
        agentData.reduce((sum, a) => sum + a.avgLatency, 0) /
          agentData.length,
      ),
      uptime: 99.7,
    },
    agentPerformance: agentData.map((a) => ({
      ...a,
      tasksCompleted: a.tasksCompleted * multiplier,
      totalCost: Math.round(a.totalCost * multiplier * 100) / 100,
    })),
    skillUsage: skillData.map((s) => ({
      ...s,
      count: s.count * multiplier,
      avgCost: Math.round(s.avgCost * multiplier * 10000) / 10000,
    })),
    errors: errorData.map((e) => ({
      ...e,
      count: e.count * multiplier,
    })),
    recommendations,
    metrics: customMetrics,
  };

  generatedReports.set(id, report);
  return report;
}

// ---------------------------------------------------------------------------
// GET — Return available report templates and recent reports
// ---------------------------------------------------------------------------

export async function GET() {
  const recentReports = Array.from(generatedReports.values())
    .sort((a, b) => b.generatedAt - a.generatedAt)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      type: r.type,
      generatedAt: r.generatedAt,
      dateRange: r.dateRange,
      tasksCompleted: r.summary.tasksCompleted,
      totalCost: r.summary.totalCost,
    }));

  return NextResponse.json({
    templates: REPORT_TEMPLATES,
    recentReports,
    scheduledCount: Array.from(scheduledReports.values()).filter(
      (s) => s.active,
    ).length,
    totalGenerated: generatedReports.size,
  });
}

// ---------------------------------------------------------------------------
// POST — Generate reports and manage schedules
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
    case "generate":
      return handleGenerate(body);
    case "schedule":
      return handleSchedule(body);
    case "list-scheduled":
      return handleListScheduled();
    case "cancel":
      return handleCancel(body);
    default:
      return NextResponse.json(
        {
          error: `Unknown action '${action}'. Valid: generate, schedule, list-scheduled, cancel`,
        },
        { status: 400 },
      );
  }
}

// ---------------------------------------------------------------------------
// generate — Generate a report
// ---------------------------------------------------------------------------

function handleGenerate(
  body: Record<string, unknown>,
): NextResponse {
  const { type, dateRange, metrics } = body;

  if (
    !type ||
    !["daily-digest", "weekly-analytics", "monthly-roi", "custom"].includes(
      type as string,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid 'type' — must be 'daily-digest', 'weekly-analytics', 'monthly-roi', or 'custom'",
      },
      { status: 400 },
    );
  }

  const report = generateReportContent(
    type as string,
    dateRange as { from: string; to: string } | undefined,
    metrics as string[] | undefined,
  );

  return NextResponse.json({
    success: true,
    report,
    message: `${type} report generated successfully`,
  });
}

// ---------------------------------------------------------------------------
// schedule — Schedule a recurring report
// ---------------------------------------------------------------------------

function handleSchedule(
  body: Record<string, unknown>,
): NextResponse {
  const { type, schedule, delivery } = body;

  if (!type || typeof type !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'type'" },
      { status: 400 },
    );
  }

  if (!schedule || typeof schedule !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'schedule'" },
      { status: 400 },
    );
  }

  if (
    !delivery ||
    !["dashboard", "email", "slack", "obsidian"].includes(delivery as string)
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid 'delivery' — must be 'dashboard', 'email', 'slack', or 'obsidian'",
      },
      { status: 400 },
    );
  }

  const id = generateId();
  const nextRun = parseScheduleNextRun(schedule);

  const scheduled: ScheduledReport = {
    id,
    type,
    schedule,
    delivery: delivery as ScheduledReport["delivery"],
    createdAt: Date.now(),
    nextRun,
    active: true,
  };

  scheduledReports.set(id, scheduled);

  return NextResponse.json(
    {
      success: true,
      scheduled,
      message: `Report '${type}' scheduled (${schedule}) with delivery to ${delivery}`,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// list-scheduled — Return all scheduled reports
// ---------------------------------------------------------------------------

function handleListScheduled(): NextResponse {
  const list = Array.from(scheduledReports.values());

  return NextResponse.json({
    scheduled: list,
    total: list.length,
    active: list.filter((s) => s.active).length,
  });
}

// ---------------------------------------------------------------------------
// cancel — Cancel a scheduled report
// ---------------------------------------------------------------------------

function handleCancel(
  body: Record<string, unknown>,
): NextResponse {
  const { id } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'id'" },
      { status: 400 },
    );
  }

  const scheduled = scheduledReports.get(id);
  if (!scheduled) {
    return NextResponse.json(
      { error: `Scheduled report '${id}' not found` },
      { status: 404 },
    );
  }

  scheduled.active = false;
  scheduledReports.set(id, scheduled);

  return NextResponse.json({
    success: true,
    scheduled,
    message: `Scheduled report '${scheduled.type}' (${scheduled.schedule}) has been cancelled`,
  });
}
