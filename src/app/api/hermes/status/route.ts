import { NextResponse } from "next/server";
import { execSync } from "child_process";
import {
  getHermesApiEndpoint,
  isHermesRunning,
  isHermesProcessRunning,
  measureHermesLatency,
  getHermesModel,
  findHermesBinary,
  type HermesStatusResult,
} from "@/lib/hermes";

export async function GET() {
  try {
    const apiEndpoint = getHermesApiEndpoint();
    const [apiAlive, processAlive, latency, model] = await Promise.all([
      isHermesRunning(apiEndpoint),
      Promise.resolve(isHermesProcessRunning()),
      measureHermesLatency(apiEndpoint),
      Promise.resolve(getHermesModel()),
    ]);

    const online = apiAlive || processAlive;

    // Attempt to get uptime via CLI
    let uptime: string | undefined;
    const bin = findHermesBinary();
    if (bin && online) {
      try {
        const out = execSync(
          `${bin} gateway status --json 2>/dev/null || ${bin} status --json 2>/dev/null`,
          { encoding: "utf-8", timeout: 5000 },
        ).trim();
        if (out) {
          const parsed = JSON.parse(out);
          uptime = parsed.uptime ?? parsed.uptime_seconds
            ? formatUptime(parsed.uptime_seconds)
            : undefined;
        }
      } catch {
        // Not available — leave undefined
      }
    }

    // Attempt to count active sessions
    let activeSessions: number | undefined;
    if (bin && online) {
      try {
        const out = execSync(`${bin} sessions list --json 2>/dev/null`, {
          encoding: "utf-8",
          timeout: 5000,
        }).trim();
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
        // Not available — leave undefined
      }
    }

    // Try to get uptime from the API
    if (!uptime && apiAlive) {
      try {
        const res = await fetch(`${apiEndpoint}/v1/status`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
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
