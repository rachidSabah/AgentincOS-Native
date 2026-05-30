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

interface GatewayPlatform {
  name: string;
  connected: boolean;
  webhookUrl?: string;
}

interface GatewayActionRequest {
  action: "start" | "stop" | "setup";
  platform?: string;
}

/** Well-known messaging platforms supported by Hermes Gateway. */
const KNOWN_PLATFORMS = [
  "telegram",
  "discord",
  "slack",
  "whatsapp",
  "signal",
  "matrix",
  "irc",
  "twitter",
  "email",
  "sms",
  "messenger",
  "teams",
  "webex",
  "zoom",
  "google-chat",
  "rocketchat",
  "zulip",
  "gitter",
  "line",
];

// ---------------------------------------------------------------------------
// GET handler — list gateway status and connected platforms
// ---------------------------------------------------------------------------

export async function GET() {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  const platforms: GatewayPlatform[] = [];

  // 1. Try Hermes API
  if (running) {
    try {
      const res = await hermesFetch("/v1/gateway/status", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        const apiPlatforms: GatewayPlatform[] = Array.isArray(data)
          ? data
          : data.platforms ?? data.connections ?? [];

        if (apiPlatforms.length > 0) {
          return NextResponse.json({
            running: true,
            platforms: apiPlatforms.map((p) => ({
              name: p.name,
              connected: p.connected ?? false,
              webhookUrl: p.webhookUrl,
            })),
            source: "hermes",
          });
        }

        // API returned data but no platforms — merge with known list
        for (const name of KNOWN_PLATFORMS) {
          const match = apiPlatforms.find(
            (p) => p.name.toLowerCase() === name.toLowerCase(),
          );
          platforms.push({
            name,
            connected: match?.connected ?? false,
            webhookUrl: match?.webhookUrl,
          });
        }

        return NextResponse.json({
          running: true,
          platforms,
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
        ["gateway", "status", "--json"],
        { timeout: 10000 },
      );
      const output = stdout.trim();
      if (output) {
        try {
          const parsed = JSON.parse(output);
          const cliPlatforms: GatewayPlatform[] = Array.isArray(parsed)
            ? parsed
            : parsed.platforms ?? parsed.connections ?? [];

          if (cliPlatforms.length > 0) {
            return NextResponse.json({
              running: true,
              platforms: cliPlatforms.map((p) => ({
                name: p.name,
                connected: p.connected ?? false,
                webhookUrl: p.webhookUrl,
              })),
              source: "cli",
            });
          }
        } catch {
          // Not valid JSON — parse text output
          const connectedNames = output
            .split("\n")
            .filter((line) => /connected|active|online/i.test(line))
            .map((line) => line.trim().toLowerCase());

          for (const name of KNOWN_PLATFORMS) {
            platforms.push({
              name,
              connected: connectedNames.some((c) => c.includes(name)),
            });
          }

          return NextResponse.json({
            running: output.toLowerCase().includes("running"),
            platforms,
            source: "cli",
          });
        }
      }
    } catch {
      // CLI failed — fall through to default
    }
  }

  // 3. Default — return all known platforms as disconnected
  for (const name of KNOWN_PLATFORMS) {
    platforms.push({ name, connected: false });
  }

  return NextResponse.json({
    running,
    platforms,
    source: "default",
  });
}

// ---------------------------------------------------------------------------
// POST handler — start/stop gateway or configure platform
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: GatewayActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || !["start", "stop", "setup"].includes(body.action)) {
    return NextResponse.json(
      { error: "Invalid or missing 'action' — must be 'start', 'stop', or 'setup'" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "start":
      return handleGatewayStart(body.platform);
    case "stop":
      return handleGatewayStop();
    case "setup":
      return handleGatewaySetup(body.platform);
  }
}

// ---------------------------------------------------------------------------
// Start gateway
// ---------------------------------------------------------------------------

async function handleGatewayStart(platform?: string): Promise<NextResponse> {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/gateway/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          message: data.message ?? `Gateway started${platform ? ` for ${platform}` : ""}`,
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
      const args = ["gateway", "start"];
      if (platform) args.push("--platform", platform);

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      return NextResponse.json({
        success: true,
        message: stdout.trim() || `Gateway started${platform ? ` for ${platform}` : ""}`,
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to start gateway via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot start gateway",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Stop gateway
// ---------------------------------------------------------------------------

async function handleGatewayStop(): Promise<NextResponse> {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/gateway/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          message: data.message ?? "Gateway stopped",
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
      const { stdout } = await execFileAsync(bin, ["gateway", "stop"], {
        timeout: 15000,
      });

      return NextResponse.json({
        success: true,
        message: stdout.trim() || "Gateway stopped",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to stop gateway via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Hermes is not available — cannot stop gateway",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Setup platform (interactive — return instructions)
// ---------------------------------------------------------------------------

async function handleGatewaySetup(platform?: string): Promise<NextResponse> {
  const bin = await findHermesBinaryAsync();

  const cliCommand = platform
    ? `hermes gateway setup --platform ${platform}`
    : "hermes gateway setup";

  if (bin) {
    try {
      const args = ["gateway", "setup"];
      if (platform) args.push("--platform", platform);

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 5000,
      });

      return NextResponse.json({
        success: true,
        message: stdout.trim() || "Setup instructions returned",
        instruction: `Run '${cliCommand}' in your terminal for interactive setup`,
        source: "cli",
      });
    } catch {
      // Interactive setup likely requires a TTY — return instructions
      return NextResponse.json({
        success: false,
        message: "Gateway setup requires an interactive terminal",
        instruction: `Run '${cliCommand}' in your terminal to configure${platform ? ` ${platform}` : " your platform"}`,
        source: "cli",
      });
    }
  }

  return NextResponse.json({
    success: false,
    message: "Hermes CLI not found — cannot run interactive setup",
    instruction: `Install Hermes and run '${cliCommand}' to configure your platform`,
  });
}
