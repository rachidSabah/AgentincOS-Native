import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  isHermesProcessRunningAsync,
  measureHermesLatency,
  getHermesModelAsync,
  findHermesBinaryAsync,
  hermesFetch,
  getCachedStatus,
  setCachedStatus,
  type HermesStatusResult,
} from "@/lib/hermes";

const execFileAsync = promisify(execFile);

export async function GET() {
  // Check cache first
  const cached = getCachedStatus();
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const apiEndpoint = getHermesApiEndpointCached();
    const [apiAlive, processAlive, latency, model] = await Promise.all([
      isHermesRunning(apiEndpoint),
      isHermesProcessRunningAsync(),
      measureHermesLatency(apiEndpoint),
      getHermesModelAsync(),
    ]);

    const online = apiAlive || processAlive;

    // Attempt to get uptime via CLI (async)
    let uptime: string | undefined;
    const bin = await findHermesBinaryAsync();
    if (bin && online) {
      try {
        const { stdout } = await execFileAsync(
          bin,
          ["gateway", "status", "--json"],
          { timeout: 5000 },
        );
        const out = stdout.trim();
        if (out) {
          try {
            const parsed = JSON.parse(out);
            uptime = parsed.uptime ?? parsed.uptime_seconds
              ? formatUptime(parsed.uptime_seconds)
              : undefined;
          } catch {
            // Try fallback command
          }
        }
      } catch {
        // Try alternative status command
        try {
          const { stdout } = await execFileAsync(
            bin,
            ["status", "--json"],
            { timeout: 5000 },
          );
          const out = stdout.trim();
          if (out) {
            const parsed = JSON.parse(out);
            uptime = parsed.uptime ?? parsed.uptime_seconds
              ? formatUptime(parsed.uptime_seconds)
              : undefined;
          }
        } catch {
          // Not available
        }
      }
    }

    // Attempt to count active sessions (async)
    let activeSessions: number | undefined;
    if (bin && online) {
      try {
        const { stdout } = await execFileAsync(
          bin,
          ["sessions", "list", "--json"],
          { timeout: 5000 },
        );
        const out = stdout.trim();
        if (out) {
          const parsed = JSON.parse(out);
          if (Array.isArray(parsed)) {
            activeSessions = parsed.length;
          } else if (typeof parsed.count === "number") {
            activeSessions = parsed.count;
          } else if (Array.isArray(parsed.sessions)) {
            activeSessions = parsed.sessions.length;
          }
        }
      } catch {
        // Not available
      }
    }

    // Try to get uptime from the API
    if (!uptime && apiAlive) {
      try {
        const res = await hermesFetch("/v1/status", {
          method: "GET",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.uptime) uptime = data.uptime;
          if (data.uptime_seconds) uptime = formatUptime(data.uptime_seconds);
          if (data.active_sessions && activeSessions === undefined) {
            activeSessions = data.active_sessions;
          }
        }
      } catch {
        // Not available
      }
    }

    const result: HermesStatusResult = {
      online,
      ...(uptime && { uptime }),
      ...(activeSessions !== undefined && { activeSessions }),
      ...(model && { model }),
      ...(latency !== undefined && { latency }),
    };

    // Cache the status
    setCachedStatus(result);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        online: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  if (seconds < 86400) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }
  const days = Math.floor(seconds / 86400);
  const hrs = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hrs}h`;
}
