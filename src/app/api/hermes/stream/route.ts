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
      // Send initial status
      await sendStatusUpdate(controller, encoder);

      // Set up periodic updates
      const statusInterval = setInterval(async () => {
        try {
          await sendStatusUpdate(controller, encoder);
        } catch {
          // Client disconnected or error
          clearInterval(statusInterval);
          clearInterval(latencyInterval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 5000);

      // Latency measurement every 15 seconds
      const latencyInterval = setInterval(async () => {
        try {
          const latency = await measureHermesLatency();
          sendSSE(controller, encoder, "hermes:latency", { latency, timestamp: Date.now() });
        } catch {
          // Ignore — will retry next interval
        }
      }, 15000);

      // Keep-alive ping every 30 seconds
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

      // Clean up on abort signal
      // Note: In Next.js App Router, we don't have direct access to the
      // request signal in the stream start callback. Cleanup happens when
      // the controller is closed or errors occur.
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
