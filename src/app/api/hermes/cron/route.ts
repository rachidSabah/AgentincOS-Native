import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  findHermesBinaryAsync,
  hermesFetch,
  hermesFetchQueued,
} from "@/lib/hermes";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CronJob {
  id: string;
  schedule: string;
  command: string;
  lastRun?: string;
  nextRun?: string;
  enabled: boolean;
}

interface CronListResponse {
  jobs: CronJob[];
}

interface CronActionRequest {
  action: "create" | "update" | "delete" | "toggle";
  id?: string;
  schedule?: string;
  command?: string;
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// GET handler — list scheduled jobs
// ---------------------------------------------------------------------------

export async function GET() {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // 1. Try Hermes API
  if (running) {
    try {
      const res = await hermesFetch("/v1/cron/jobs", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        const apiJobs: CronJob[] = Array.isArray(data)
          ? data
          : data.jobs ?? data.items ?? [];

        return NextResponse.json({
          jobs: apiJobs.map(normalizeCronJob),
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI
    }
  }

  // 2. Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const { stdout } = await execFileAsync(
        bin,
        ["cron", "list", "--json"],
        { timeout: 10000 },
      );
      const output = stdout.trim();
      if (output) {
        try {
          const parsed = JSON.parse(output);
          const cliJobs: CronJob[] = Array.isArray(parsed)
            ? parsed
            : parsed.jobs ?? parsed.items ?? [];

          return NextResponse.json({
            jobs: cliJobs.map(normalizeCronJob),
            source: "cli",
          });
        } catch {
          // Not JSON — parse text output
          const jobs = parseCronTextOutput(output);
          return NextResponse.json({
            jobs,
            source: "cli",
          });
        }
      }
    } catch {
      // CLI failed — fall through to empty
    }
  }

  // 3. Default — no jobs
  return NextResponse.json({
    jobs: [],
    source: "default",
  });
}

// ---------------------------------------------------------------------------
// POST handler — create/update/delete/toggle cron jobs
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: CronActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || !["create", "update", "delete", "toggle"].includes(body.action)) {
    return NextResponse.json(
      { error: "Invalid or missing 'action' — must be 'create', 'update', 'delete', or 'toggle'" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "create":
      return handleCronCreate(body.schedule, body.command);
    case "update":
      return handleCronUpdate(body.id, body.schedule, body.command, body.enabled);
    case "delete":
      return handleCronDelete(body.id);
    case "toggle":
      return handleCronToggle(body.id, body.enabled);
  }
}

// ---------------------------------------------------------------------------
// Create cron job
// ---------------------------------------------------------------------------

async function handleCronCreate(
  schedule?: string,
  command?: string,
): Promise<NextResponse> {
  if (!schedule || !command) {
    return NextResponse.json(
      { error: "Missing 'schedule' and/or 'command' parameters for create action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/cron/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, command }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          job: normalizeCronJob(data.job ?? data),
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const { stdout } = await execFileAsync(
        bin,
        ["cron", "add", "--schedule", schedule, "--command", command],
        { timeout: 15000 },
      );

      const output = stdout.trim();
      const idMatch = output.match(/id[:\s]+([^\s\n]+)/i);
      const id = idMatch?.[1] ?? `cron-${Date.now()}`;

      return NextResponse.json({
        success: true,
        job: {
          id,
          schedule,
          command,
          enabled: true,
        },
        message: output || "Cron job created",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to create cron job via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot create cron job",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Update cron job
// ---------------------------------------------------------------------------

async function handleCronUpdate(
  id?: string,
  schedule?: string,
  command?: string,
  enabled?: boolean,
): Promise<NextResponse> {
  if (!id) {
    return NextResponse.json(
      { error: "Missing 'id' parameter for update action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued(
        `/v1/cron/jobs/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule, command, enabled }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          job: normalizeCronJob(data.job ?? data),
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const args = ["cron", "update", id];
      if (schedule) args.push("--schedule", schedule);
      if (command) args.push("--command", command);
      if (enabled !== undefined) args.push("--enabled", String(enabled));

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      return NextResponse.json({
        success: true,
        job: {
          id,
          schedule: schedule ?? "*",
          command: command ?? "",
          enabled: enabled ?? true,
        },
        message: stdout.trim() || "Cron job updated",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to update cron job via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot update cron job",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Delete cron job
// ---------------------------------------------------------------------------

async function handleCronDelete(id?: string): Promise<NextResponse> {
  if (!id) {
    return NextResponse.json(
      { error: "Missing 'id' parameter for delete action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued(
        `/v1/cron/jobs/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          message: data.message ?? "Cron job deleted",
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const { stdout } = await execFileAsync(
        bin,
        ["cron", "delete", id],
        { timeout: 15000 },
      );

      return NextResponse.json({
        success: true,
        message: stdout.trim() || "Cron job deleted",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to delete cron job via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot delete cron job",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Toggle cron job enabled/disabled
// ---------------------------------------------------------------------------

async function handleCronToggle(
  id?: string,
  enabled?: boolean,
): Promise<NextResponse> {
  if (!id) {
    return NextResponse.json(
      { error: "Missing 'id' parameter for toggle action" },
      { status: 400 },
    );
  }

  if (enabled === undefined) {
    return NextResponse.json(
      { error: "Missing 'enabled' parameter for toggle action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued(
        `/v1/cron/jobs/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          job: normalizeCronJob(data.job ?? data),
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const args = ["cron", "toggle", id, "--enabled", String(enabled)];

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      return NextResponse.json({
        success: true,
        job: {
          id,
          schedule: "*",
          command: "",
          enabled,
        },
        message: stdout.trim() || `Cron job ${enabled ? "enabled" : "disabled"}`,
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to toggle cron job via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot toggle cron job",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeCronJob(raw: CronJob | Record<string, unknown>): CronJob {
  const r = raw as Record<string, unknown>;
  const lastRunVal = r.lastRun ?? r.last_run ?? r.lastRunAt;
  const nextRunVal = r.nextRun ?? r.next_run ?? r.nextRunAt;
  return {
    id: String(r.id ?? r.job_id ?? r.name ?? "unknown"),
    schedule: String(r.schedule ?? r.cron ?? r.expression ?? "*"),
    command: String(r.command ?? r.cmd ?? r.task ?? ""),
    lastRun: typeof lastRunVal === "string" ? lastRunVal : undefined,
    nextRun: typeof nextRunVal === "string" ? nextRunVal : undefined,
    enabled: Boolean(r.enabled ?? r.active ?? r.is_active ?? true),
  };
}

function parseCronTextOutput(output: string): CronJob[] {
  const jobs: CronJob[] = [];
  const lines = output.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    // Skip header/separator lines
    if (/^[=-\s]+$/.test(line) || /id|schedule|command/i.test(line.split(/\s{2,}/)[0] ?? "")) {
      continue;
    }

    const parts = line.split(/\s{2,}/).filter(Boolean);
    if (parts.length >= 3) {
      jobs.push({
        id: parts[0]?.trim() ?? `cron-${jobs.length}`,
        schedule: parts[1]?.trim() ?? "*",
        command: parts.slice(2).join("  ").trim(),
        enabled: !line.toLowerCase().includes("disabled"),
      });
    }
  }

  return jobs;
}
