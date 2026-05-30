import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  hermesFetch,
  hermesFetchQueued,
} from "@/lib/hermes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KanbanTask {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignedTo?: string;
  createdAt?: number;
}

interface CreateTaskRequest {
  title: string;
  priority?: "low" | "medium" | "high";
  assignedTo?: string;
}

interface UpdateTaskRequest {
  taskId: string;
  status?: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  assignedTo?: string;
}

// ---------------------------------------------------------------------------
// Local in-memory store (fallback when Hermes API unavailable)
// ---------------------------------------------------------------------------

let localTasks: KanbanTask[] = [];
let localTasksLoaded = false;

function ensureLocalTasksLoaded(): void {
  if (localTasksLoaded) return;
  localTasksLoaded = true;
  // Pre-populate with some default tasks
  localTasks = [
    {
      id: "kt-local-1",
      title: "Deploy Hermes v3.2 to production",
      status: "in_progress",
      priority: "high",
      assignedTo: "hermes",
      createdAt: Date.now() - 86400000,
    },
    {
      id: "kt-local-2",
      title: "Implement cross-agent memory sharing",
      status: "todo",
      priority: "high",
      assignedTo: "openclaw",
      createdAt: Date.now() - 172800000,
    },
    {
      id: "kt-local-3",
      title: "Optimize vault query latency",
      status: "done",
      priority: "medium",
      assignedTo: "vault",
      createdAt: Date.now() - 259200000,
    },
  ];
}

// ---------------------------------------------------------------------------
// GET handler — list tasks
// ---------------------------------------------------------------------------

export async function GET() {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try Hermes API first
  if (running) {
    try {
      const res = await hermesFetch("/v1/kanban", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        const tasks = Array.isArray(data) ? data : data.tasks ?? data.items ?? [];
        // Sync to local store
        localTasks = tasks;
        localTasksLoaded = true;
        return NextResponse.json({ tasks, source: "hermes" });
      }
    } catch {
      // API failed — fall through to local store
    }
  }

  // Fallback to local store
  ensureLocalTasksLoaded();
  return NextResponse.json({ tasks: localTasks, source: "local" });
}

// ---------------------------------------------------------------------------
// POST handler — create task
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: CreateTaskRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'title' string" },
      { status: 400 },
    );
  }

  const newTask: KanbanTask = {
    id: `kt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: body.title,
    status: "todo",
    priority: body.priority ?? "medium",
    assignedTo: body.assignedTo,
    createdAt: Date.now(),
  };

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try Hermes API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        const data = await res.json();
        const createdTask = data.task ?? data ?? newTask;
        // Also add to local store
        ensureLocalTasksLoaded();
        localTasks.push(createdTask);
        return NextResponse.json({ task: createdTask, source: "hermes" });
      }
    } catch {
      // API failed — fall through to local store
    }
  }

  // Fallback to local store
  ensureLocalTasksLoaded();
  localTasks.push(newTask);
  return NextResponse.json({ task: newTask, source: "local" });
}

// ---------------------------------------------------------------------------
// PATCH handler — update task status
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  let body: UpdateTaskRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.taskId || typeof body.taskId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'taskId' string" },
      { status: 400 },
    );
  }

  const updates: Partial<KanbanTask> = {};
  if (body.status) updates.status = body.status;
  if (body.priority) updates.priority = body.priority;
  if (body.assignedTo) updates.assignedTo = body.assignedTo;

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try Hermes API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: body.taskId, ...updates }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedTask = data.task ?? data;
        // Also update local store
        ensureLocalTasksLoaded();
        const idx = localTasks.findIndex((t) => t.id === body.taskId);
        if (idx >= 0) {
          localTasks[idx] = { ...localTasks[idx], ...updatedTask };
        }
        return NextResponse.json({ task: updatedTask, source: "hermes" });
      }
    } catch {
      // API failed — fall through to local store
    }
  }

  // Fallback to local store
  ensureLocalTasksLoaded();
  const idx = localTasks.findIndex((t) => t.id === body.taskId);
  if (idx < 0) {
    return NextResponse.json(
      { error: `Task '${body.taskId}' not found` },
      { status: 404 },
    );
  }
  localTasks[idx] = { ...localTasks[idx], ...updates };
  return NextResponse.json({ task: localTasks[idx], source: "local" });
}
