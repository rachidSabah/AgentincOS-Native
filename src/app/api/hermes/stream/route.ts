import {
  getHermesApiEndpointCached,
  isHermesRunning,
  isHermesProcessRunningAsync,
  measureHermesLatency,
  getHermesModelAsync,
  findHermesBinaryAsync,
  hermesFetch,
} from "@/lib/hermes";

// ---------------------------------------------------------------------------
// GET handler — SSE endpoint for real-time Hermes status updates
// ---------------------------------------------------------------------------

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await sendStatusUpdate(controller, encoder);

      const statusInterval = setInterval(async () => {
        try {
          await sendStatusUpdate(controller, encoder);
        } catch {
          clearInterval(statusInterval);
          clearInterval(latencyInterval);
          clearInterval(keepAliveInterval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 5000);

      const latencyInterval = setInterval(async () => {
        try {
          const latency = await measureHermesLatency();
          sendSSE(controller, encoder, "hermes:latency", { latency, timestamp: Date.now() });
        } catch {
          // retry next interval
        }
      }, 15000);

      const keepAliveInterval = setInterval(() => {
        try {
          sendSSE(controller, encoder, "ping", { timestamp: Date.now() });
        } catch {
          clearInterval(statusInterval);
          clearInterval(latencyInterval);
          clearInterval(keepAliveInterval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 30000);
    },
    cancel() {
      // Client disconnected — intervals are cleaned via the catch blocks above
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown,
) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

async function sendStatusUpdate(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const apiEndpoint = getHermesApiEndpointCached();

  const [apiAlive, processAlive, model] = await Promise.all([
    isHermesRunning(apiEndpoint),
    isHermesProcessRunningAsync(),
    getHermesModelAsync(),
  ]);

  const online = apiAlive || processAlive;

  // Get additional status from Hermes API if available
  let uptime: string | undefined;
  let activeSessions: number | undefined;
  let skillCount: number | undefined;
  let mcpServers: number | undefined;

  if (apiAlive) {
    try {
      const res = await hermesFetch("/v1/status", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        uptime = data.uptime;
        activeSessions = data.active_sessions;
        skillCount = data.skill_count ?? data.skills_count;
        mcpServers = data.mcp_servers_count ?? data.mcp_count;
      }
    } catch {
      // Not available
    }
  }

  sendSSE(controller, encoder, "hermes:status", {
    online,
    apiAlive,
    processAlive,
    ...(model && { model }),
    ...(uptime && { uptime }),
    ...(activeSessions !== undefined && { activeSessions }),
    ...(skillCount !== undefined && { skillCount }),
    ...(mcpServers !== undefined && { mcpServers }),
    timestamp: Date.now(),
  });
}
