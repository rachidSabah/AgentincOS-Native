import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkflowNodeType =
  | "agent-call"
  | "condition"
  | "loop"
  | "transform"
  | "webhook"
  | "delay"
  | "human-approval"
  | "output";

interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

type WorkflowStatus = "idle" | "running" | "completed" | "error" | "paused";

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  lastRun: number | null;
  executionState: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ─── In-Memory Storage ───────────────────────────────────────────────────────

const workflows = new Map<string, Workflow>();

// ─── Pre-built Templates ────────────────────────────────────────────────────

const WORKFLOW_TEMPLATES: Array<{
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}> = [
  {
    name: "Research → Analyze → Report",
    description:
      "Hermes researches a topic, Claude analyzes findings, and Vault stores the report.",
    nodes: [
      {
        id: "n1",
        type: "agent-call",
        position: { x: 100, y: 200 },
        data: { agent: "hermes", task: "research" },
      },
      {
        id: "n2",
        type: "agent-call",
        position: { x: 400, y: 200 },
        data: { agent: "claude", task: "analyze" },
      },
      {
        id: "n3",
        type: "agent-call",
        position: { x: 700, y: 200 },
        data: { agent: "vault", task: "store" },
      },
      {
        id: "n4",
        type: "output",
        position: { x: 1000, y: 200 },
        data: { format: "report" },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  },
  {
    name: "Monitor → Alert → Remediate",
    description:
      "Hermes monitors for issues, OpenClaw identifies threats, and Hermes executes remediation.",
    nodes: [
      {
        id: "n1",
        type: "agent-call",
        position: { x: 100, y: 200 },
        data: { agent: "hermes", task: "monitor" },
      },
      {
        id: "n2",
        type: "condition",
        position: { x: 400, y: 200 },
        data: { condition: "threshold_exceeded" },
      },
      {
        id: "n3",
        type: "agent-call",
        position: { x: 700, y: 100 },
        data: { agent: "openclaw", task: "alert" },
      },
      {
        id: "n4",
        type: "agent-call",
        position: { x: 700, y: 300 },
        data: { agent: "hermes", task: "remediate" },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      {
        id: "e2",
        source: "n2",
        target: "n3",
        condition: "threshold_exceeded",
      },
      { id: "e3", source: "n2", target: "n4", condition: "normal" },
    ],
  },
  {
    name: "Daily Standup",
    description:
      "All agents report status, Claude summarizes, and Vault archives the standup.",
    nodes: [
      {
        id: "n1",
        type: "agent-call",
        position: { x: 100, y: 100 },
        data: { agent: "hermes", task: "status_report" },
      },
      {
        id: "n2",
        type: "agent-call",
        position: { x: 100, y: 250 },
        data: { agent: "openclaw", task: "status_report" },
      },
      {
        id: "n3",
        type: "agent-call",
        position: { x: 100, y: 400 },
        data: { agent: "claude", task: "status_report" },
      },
      {
        id: "n4",
        type: "transform",
        position: { x: 400, y: 250 },
        data: { operation: "merge", format: "standup" },
      },
      {
        id: "n5",
        type: "agent-call",
        position: { x: 700, y: 250 },
        data: { agent: "claude", task: "summarize" },
      },
      {
        id: "n6",
        type: "agent-call",
        position: { x: 1000, y: 250 },
        data: { agent: "vault", task: "archive" },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n4" },
      { id: "e2", source: "n2", target: "n4" },
      { id: "e3", source: "n3", target: "n4" },
      { id: "e4", source: "n4", target: "n5" },
      { id: "e5", source: "n5", target: "n6" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function simulateExecution(
  workflow: Workflow,
  input?: Record<string, unknown>
): void {
  workflow.status = "running";
  workflow.executionState = {
    startedAt: Date.now(),
    currentNode: workflow.nodes[0]?.id ?? null,
    input: input ?? {},
    steps: [],
    progress: 0,
  };
  workflow.lastRun = Date.now();

  // Simulate async execution with a short delay
  const totalNodes = workflow.nodes.length;
  let stepIndex = 0;

  const step = () => {
    if (stepIndex >= totalNodes) {
      workflow.status = "completed";
      workflow.executionState = {
        ...workflow.executionState,
        completedAt: Date.now(),
        currentNode: null,
        progress: 100,
      };
      return;
    }

    const currentNode = workflow.nodes[stepIndex];
    const steps = (
      workflow.executionState.steps as Array<Record<string, unknown>>
    ) ?? [];
    steps.push({
      nodeId: currentNode.id,
      type: currentNode.type,
      timestamp: Date.now(),
      status: "completed",
    });

    workflow.executionState = {
      ...workflow.executionState,
      steps,
      currentNode: currentNode.id,
      progress: Math.round(((stepIndex + 1) / totalNodes) * 100),
    };

    stepIndex++;
    setTimeout(step, 300);
  };

  setTimeout(step, 200);
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const list = Array.from(workflows.values()).map((wf) => ({
    id: wf.id,
    name: wf.name,
    nodes: wf.nodes,
    edges: wf.edges,
    status: wf.status,
    lastRun: wf.lastRun,
  }));

  return NextResponse.json({ workflows: list, total: list.length });
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      // ── Create ──────────────────────────────────────────────────────────
      case "create": {
        const { name, description, nodes, edges } = body as {
          name: string;
          description: string;
          nodes: WorkflowNode[];
          edges: WorkflowEdge[];
        };

        if (!name || !description) {
          return NextResponse.json(
            { error: "name and description are required" },
            { status: 400 }
          );
        }

        const id = generateId();
        const now = Date.now();
        const workflow: Workflow = {
          id,
          name,
          description,
          nodes: nodes ?? [],
          edges: edges ?? [],
          status: "idle",
          lastRun: null,
          executionState: {},
          createdAt: now,
          updatedAt: now,
        };

        workflows.set(id, workflow);

        return NextResponse.json({
          success: true,
          workflow: {
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
          },
        });
      }

      // ── Update ──────────────────────────────────────────────────────────
      case "update": {
        const { id, name, nodes, edges } = body as {
          id: string;
          name?: string;
          nodes?: WorkflowNode[];
          edges?: WorkflowEdge[];
        };

        if (!id) {
          return NextResponse.json(
            { error: "id is required" },
            { status: 400 }
          );
        }

        const workflow = workflows.get(id);
        if (!workflow) {
          return NextResponse.json(
            { error: "Workflow not found" },
            { status: 404 }
          );
        }

        if (name !== undefined) workflow.name = name;
        if (nodes !== undefined) workflow.nodes = nodes;
        if (edges !== undefined) workflow.edges = edges;
        workflow.updatedAt = Date.now();

        return NextResponse.json({
          success: true,
          workflow: {
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
          },
        });
      }

      // ── Execute ─────────────────────────────────────────────────────────
      case "execute": {
        const { id, input } = body as {
          id: string;
          input?: Record<string, unknown>;
        };

        if (!id) {
          return NextResponse.json(
            { error: "id is required" },
            { status: 400 }
          );
        }

        const workflow = workflows.get(id);
        if (!workflow) {
          return NextResponse.json(
            { error: "Workflow not found" },
            { status: 404 }
          );
        }

        if (workflow.status === "running") {
          return NextResponse.json(
            { error: "Workflow is already running" },
            { status: 409 }
          );
        }

        simulateExecution(workflow, input);

        return NextResponse.json({
          success: true,
          executionId: `${id}_${Date.now()}`,
          status: "running",
          message: `Workflow "${workflow.name}" execution started`,
        });
      }

      // ── Delete ──────────────────────────────────────────────────────────
      case "delete": {
        const { id } = body as { id: string };

        if (!id) {
          return NextResponse.json(
            { error: "id is required" },
            { status: 400 }
          );
        }

        const deleted = workflows.delete(id);
        if (!deleted) {
          return NextResponse.json(
            { error: "Workflow not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Workflow deleted",
        });
      }

      // ── List Templates ─────────────────────────────────────────────────
      case "list-templates": {
        return NextResponse.json({
          templates: WORKFLOW_TEMPLATES,
          total: WORKFLOW_TEMPLATES.length,
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Unknown action. Valid actions: create, update, execute, delete, list-templates",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
