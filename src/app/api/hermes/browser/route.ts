import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  getHermesConfig,
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

interface BrowserStatusResponse {
  backend: string;
  available: string[];
  activeSessions: number;
}

interface BrowserActionRequest {
  action: "connect" | "navigate" | "screenshot" | "close";
  sessionId?: string;
  url?: string;
  backend?: string;
}

/** Well-known browser backends. */
const KNOWN_BACKENDS = [
  "browserbase",
  "browser-use",
  "chromium",
  "cdp",
  "playwright",
  "puppeteer",
];

// ---------------------------------------------------------------------------
// GET handler — list browser configuration and active sessions
// ---------------------------------------------------------------------------

export async function GET() {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // 1. Try Hermes API
  if (running) {
    try {
      const res = await hermesFetch("/v1/browser/status", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          backend: data.backend ?? data.currentBackend ?? "unknown",
          available: data.available ?? data.backends ?? KNOWN_BACKENDS,
          activeSessions: data.activeSessions ?? data.sessions ?? 0,
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
        ["config", "get", "browser"],
        { timeout: 10000 },
      );
      const output = stdout.trim();
      if (output) {
        return NextResponse.json({
          backend: output,
          available: KNOWN_BACKENDS,
          activeSessions: 0,
          source: "cli",
        });
      }
    } catch {
      // CLI failed — fall through to config
    }
  }

  // 3. Parse from config file
  const config = getHermesConfig();
  const webBackend = config?.web?.backend ?? "chromium";

  return NextResponse.json({
    backend: String(webBackend),
    available: KNOWN_BACKENDS,
    activeSessions: 0,
    source: "config",
  });
}

// ---------------------------------------------------------------------------
// POST handler — browser actions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: BrowserActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || !["connect", "navigate", "screenshot", "close"].includes(body.action)) {
    return NextResponse.json(
      { error: "Invalid or missing 'action' — must be 'connect', 'navigate', 'screenshot', or 'close'" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "connect":
      return handleBrowserConnect(body.backend, body.url);
    case "navigate":
      return handleBrowserNavigate(body.sessionId, body.url);
    case "screenshot":
      return handleBrowserScreenshot(body.sessionId);
    case "close":
      return handleBrowserClose(body.sessionId);
  }
}

// ---------------------------------------------------------------------------
// Connect to a browser backend
// ---------------------------------------------------------------------------

async function handleBrowserConnect(
  backend?: string,
  url?: string,
): Promise<NextResponse> {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/browser/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backend, url }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          sessionId: data.sessionId ?? data.session_id ?? data.id,
          backend: data.backend ?? backend,
          message: data.message ?? "Browser connected",
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
      const args = ["browser", "connect"];
      if (backend) args.push("--backend", backend);
      if (url) args.push("--url", url);

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      // Try to extract session ID from output
      const sessionMatch = stdout.match(/session[_\s-]?id[:\s]+([^\s\n]+)/i);
      const sessionId = sessionMatch?.[1] ?? `browser-${Date.now()}`;

      return NextResponse.json({
        success: true,
        sessionId,
        backend: backend ?? "chromium",
        message: stdout.trim() || "Browser connected",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to connect browser via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot connect browser",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Navigate browser session
// ---------------------------------------------------------------------------

async function handleBrowserNavigate(
  sessionId?: string,
  url?: string,
): Promise<NextResponse> {
  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' parameter for navigate action" },
      { status: 400 },
    );
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing 'sessionId' parameter for navigate action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued(
        `/v1/browser/${encodeURIComponent(sessionId)}/navigate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          sessionId,
          url,
          message: data.message ?? "Navigation complete",
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
        ["browser", "navigate", "--session", sessionId, "--url", url],
        { timeout: 30000 },
      );

      return NextResponse.json({
        success: true,
        sessionId,
        url,
        message: stdout.trim() || "Navigation complete",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to navigate browser via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot navigate browser",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Take screenshot
// ---------------------------------------------------------------------------

async function handleBrowserScreenshot(
  sessionId?: string,
): Promise<NextResponse> {
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing 'sessionId' parameter for screenshot action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued(
        `/v1/browser/${encodeURIComponent(sessionId)}/screenshot`,
        {
          method: "GET",
        },
      );
      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";

        // If the response is an image, return it as base64
        if (contentType.includes("image")) {
          const buffer = Buffer.from(await res.arrayBuffer());
          return NextResponse.json({
            success: true,
            sessionId,
            screenshot: `data:${contentType};base64,${buffer.toString("base64")}`,
            source: "hermes",
          });
        }

        // Otherwise treat as JSON
        const data = await res.json();
        return NextResponse.json({
          success: true,
          sessionId,
          screenshot: data.screenshot ?? data.data ?? data.image,
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
        ["browser", "screenshot", "--session", sessionId],
        { timeout: 15000 },
      );

      return NextResponse.json({
        success: true,
        sessionId,
        screenshot: stdout.trim(),
        message: "Screenshot captured",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to take screenshot via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot take screenshot",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Close browser session
// ---------------------------------------------------------------------------

async function handleBrowserClose(
  sessionId?: string,
): Promise<NextResponse> {
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing 'sessionId' parameter for close action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued(
        `/v1/browser/${encodeURIComponent(sessionId)}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          sessionId,
          message: data.message ?? "Browser session closed",
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
        ["browser", "close", "--session", sessionId],
        { timeout: 15000 },
      );

      return NextResponse.json({
        success: true,
        sessionId,
        message: stdout.trim() || "Browser session closed",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to close browser session via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot close browser session",
    },
    { status: 503 },
  );
}
