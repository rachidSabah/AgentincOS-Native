import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  isHermesProcessRunningAsync,
  findHermesBinaryAsync,
  getHermesConfig,
  hermesFetchQueued,
  HERMES_DATA_DIR,
} from "@/lib/hermes";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcessInfoResponse {
  running: boolean;
  pid?: number;
  uptime?: string;
  mode?: string;
  port?: number;
}

interface ProcessActionRequest {
  action: "start" | "stop" | "restart";
  mode?: "gateway" | "api";
  port?: number;
}

// ---------------------------------------------------------------------------
// Helper — parse uptime from /proc or ps
// ---------------------------------------------------------------------------

async function getProcessDetails(): Promise<{
  pid?: number;
  uptime?: string;
  mode?: string;
}> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-af", "hermes"], {
      timeout: 3000,
    });
    const lines = stdout.trim().split("\n").filter(Boolean);

    if (lines.length === 0) return {};

    // Parse first matching line
    const firstLine = lines[0]!;
    const parts = firstLine.split(/\s+/);
    const pid = parseInt(parts[0] ?? "0", 10);

    // Determine mode from command line
    const cmdLine = parts.slice(1).join(" ");
    let mode = "api";
    if (cmdLine.includes("gateway")) mode = "gateway";
    else if (cmdLine.includes("web")) mode = "web";

    // Try to get uptime from /proc
    let uptime: string | undefined;
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf-8");
      const startTime = parseInt(stat.split(" ")[21] ?? "0", 10);
      if (startTime > 0) {
        // Convert clock ticks to seconds (assuming 100 Hz)
        const uptimeSeconds = Math.floor(process.uptime() - startTime / 100);
        if (uptimeSeconds > 0) {
          uptime = formatUptime(uptimeSeconds);
        }
      }
    } catch {
      // /proc not available — skip uptime
    }

    return { pid: pid > 0 ? pid : undefined, uptime, mode };
  } catch {
    return {};
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ---------------------------------------------------------------------------
// GET handler — get Hermes process info
// ---------------------------------------------------------------------------

export async function GET() {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);
  const processRunning = await isHermesProcessRunningAsync();

  const config = getHermesConfig();
  const port = config?.api_server?.port ?? 8000;

  // If API is responding, try to get more details
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/gateway/status", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        const details = await getProcessDetails();

        return NextResponse.json({
          running: true,
          pid: details.pid ?? data.pid ?? undefined,
          uptime: details.uptime ?? data.uptime ?? undefined,
          mode: details.mode ?? data.mode ?? "gateway",
          port,
          source: "hermes",
        });
      }
    } catch {
      // API status failed — fall through
    }
  }

  // Check process level
  if (processRunning) {
    const details = await getProcessDetails();

    return NextResponse.json({
      running: processRunning,
      pid: details.pid,
      uptime: details.uptime,
      mode: details.mode ?? "unknown",
      port,
      source: "process",
    });
  }

  // Try CLI fallback for more info
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const { stdout } = await execFileAsync(
        bin,
        ["gateway", "status", "--json"],
        { timeout: 5000 },
      );
      const output = stdout.trim();
      if (output) {
        try {
          const data = JSON.parse(output);
          return NextResponse.json({
            running: data.running !== undefined ? Boolean(data.running) : data.status === "running",
            pid: data.pid ?? undefined,
            uptime: data.uptime ?? undefined,
            mode: data.mode ?? "gateway",
            port: data.port ?? port,
            source: "cli",
          });
        } catch {
          // Not JSON — parse text
          const isRunning = /running|active|online/i.test(output);
          return NextResponse.json({
            running: isRunning,
            mode: "gateway",
            port,
            source: "cli",
          });
        }
      }
    } catch {
      // CLI failed — return basic info
    }
  }

  // Default — not running
  return NextResponse.json({
    running: false,
    port,
    source: "default",
  });
}

// ---------------------------------------------------------------------------
// POST handler — control Hermes process
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: ProcessActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || !["start", "stop", "restart"].includes(body.action)) {
    return NextResponse.json(
      { error: "Invalid or missing 'action' — must be 'start', 'stop', or 'restart'" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "start":
      return handleProcessStart(body.mode, body.port);
    case "stop":
      return handleProcessStop();
    case "restart":
      return handleProcessRestart(body.mode, body.port);
  }
}

// ---------------------------------------------------------------------------
// Start Hermes process
// ---------------------------------------------------------------------------

async function handleProcessStart(
  mode?: "gateway" | "api",
  port?: number,
): Promise<NextResponse> {
  const processMode = mode ?? "gateway";

  // Check if already running
  const alreadyRunning = await isHermesRunning();
  if (alreadyRunning) {
    return NextResponse.json({
      success: true,
      message: "Hermes is already running",
    });
  }

  const bin = await findHermesBinaryAsync();
  if (!bin) {
    return NextResponse.json(
      {
        success: false,
        message: "Hermes binary not found — cannot start process",
      },
      { status: 404 },
    );
  }

  try {
    // Spawn Hermes in background (detached)
    const args = processMode === "gateway" ? ["gateway"] : ["api"];
    if (port) args.push("--port", String(port));

    const child = spawn(bin, args, {
      detached: true,
      stdio: "ignore",
      cwd: HERMES_DATA_DIR,
    });

    // Detach so the child process survives the parent
    child.unref();

    // Give it a moment to start, then verify
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const nowRunning = await isHermesRunning();

    return NextResponse.json({
      success: nowRunning,
      message: nowRunning
        ? `Hermes started in ${processMode} mode${port ? ` on port ${port}` : ""}`
        : `Hermes process spawned but not yet responding — it may still be starting up`,
      mode: processMode,
      port: port ?? (getHermesConfig()?.api_server?.port ?? 8000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to start Hermes: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Stop Hermes process
// ---------------------------------------------------------------------------

async function handleProcessStop(): Promise<NextResponse> {
  const apiEndpoint = getHermesApiEndpointCached();

  // 1. Try graceful shutdown via API
  const running = await isHermesRunning(apiEndpoint);
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/shutdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        // Wait a moment and verify
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const stillRunning = await isHermesRunning(apiEndpoint);

        if (!stillRunning) {
          return NextResponse.json({
            success: true,
            message: "Hermes shut down gracefully via API",
            source: "hermes",
          });
        }
      }
    } catch {
      // API shutdown failed — fall through to CLI
    }
  }

  // 2. Try CLI
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const { stdout } = await execFileAsync(bin, ["gateway", "stop"], {
        timeout: 10000,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      const stillRunning = await isHermesProcessRunningAsync();

      if (!stillRunning) {
        return NextResponse.json({
          success: true,
          message: stdout.trim() || "Hermes stopped via CLI",
          source: "cli",
        });
      }
    } catch {
      // CLI stop failed — fall through to pkill
    }
  }

  // 3. Force kill with pkill
  try {
    await execFileAsync("pkill", ["-f", "hermes"], {
      timeout: 5000,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    const stillRunning = await isHermesProcessRunningAsync();

    return NextResponse.json({
      success: !stillRunning,
      message: stillRunning
        ? "Attempted to kill Hermes process but it may still be running"
        : "Hermes process terminated",
      source: "pkill",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to stop Hermes — no shutdown method available",
      },
      { status: 503 },
    );
  }
}

// ---------------------------------------------------------------------------
// Restart Hermes process
// ---------------------------------------------------------------------------

async function handleProcessRestart(
  mode?: "gateway" | "api",
  port?: number,
): Promise<NextResponse> {
  // Stop first
  const stopResult = await handleProcessStop();

  // If stop failed but not because it wasn't running, return the error
  const stopData = stopResult.body ? await new Response(stopResult.body).json().catch(() => ({})) : {};

  // Wait a moment between stop and start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Start again
  const startResult = await handleProcessStart(mode, port);

  // Combine results
  const startData = startResult.body ? await new Response(startResult.body).json().catch(() => ({})) : {};

  return NextResponse.json({
    success: startData.success ?? false,
    message: startData.success
      ? `Hermes restarted successfully in ${mode ?? "gateway"} mode`
      : `Restart incomplete — stop: ${stopData.message ?? "unknown"}, start: ${startData.message ?? "unknown"}`,
    mode: mode ?? "gateway",
    port: startData.port ?? port,
  });
}
