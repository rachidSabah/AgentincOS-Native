import { NextRequest, NextResponse } from "next/server";
import {
  getHermesConfig,
  getHermesApiEndpointCached,
  isHermesRunning,
  findHermesBinaryAsync,
  hermesFetch,
  hermesFetchQueued,
  HERMES_CONFIG_PATH,
} from "@/lib/hermes";
import { existsSync, readFileSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MCPServer {
  name: string;
  transport: "stdio" | "http";
  command?: string;
  url?: string;
  tools?: MCPTool[];
  connected?: boolean;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface ConnectMCPRequest {
  serverName: string;
  transport: "stdio" | "http";
  command?: string;
  url?: string;
}

interface CallMCPToolRequest {
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// GET handler — list MCP servers and their tools
// ---------------------------------------------------------------------------

export async function GET() {
  // Read MCP config from ~/.hermes/config.yaml
  const servers: MCPServer[] = [];

  if (existsSync(HERMES_CONFIG_PATH)) {
    const config = getHermesConfig();
    const mcpServers = config.mcp_servers;

    if (mcpServers && typeof mcpServers === "object") {
      for (const [name, serverConfig] of Object.entries(mcpServers)) {
        if (typeof serverConfig === "object" && serverConfig !== null) {
          const sc = serverConfig as Record<string, unknown>;
          servers.push({
            name,
            transport: sc.url ? "http" : "stdio",
            command: sc.command as string | undefined,
            url: sc.url as string | undefined,
            connected: false,
          });
        }
      }
    }
  }

  // Try to get live MCP server status from Hermes API
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  if (running) {
    try {
      const res = await hermesFetch("/v1/mcp/servers", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        const apiServers = Array.isArray(data) ? data : data.servers ?? [];

        // Merge API data with config data
        for (const apiServer of apiServers) {
          const existing = servers.find((s) => s.name === apiServer.name);
          if (existing) {
            existing.connected = apiServer.connected ?? apiServer.status === "connected";
            existing.tools = apiServer.tools ?? apiServer.functions;
          } else {
            servers.push({
              name: apiServer.name,
              transport: apiServer.transport ?? (apiServer.url ? "http" : "stdio"),
              command: apiServer.command,
              url: apiServer.url,
              tools: apiServer.tools ?? apiServer.functions,
              connected: apiServer.connected ?? apiServer.status === "connected",
            });
          }
        }
      }
    } catch {
      // API failed — use config-only data
    }
  }

  // Also try CLI for MCP server listing
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const { stdout } = await execFileAsync(bin, ["mcp", "list", "--json"], {
        timeout: 10000,
      });
      const output = stdout.trim();
      if (output) {
        const parsed = JSON.parse(output);
        const cliServers = Array.isArray(parsed) ? parsed : parsed.servers ?? [];
        for (const cliServer of cliServers) {
          const existing = servers.find((s) => s.name === cliServer.name);
          if (existing && !existing.tools) {
            existing.tools = cliServer.tools ?? cliServer.functions;
            existing.connected = cliServer.connected ?? cliServer.status === "connected";
          } else if (!existing) {
            servers.push({
              name: cliServer.name,
              transport: cliServer.transport ?? (cliServer.url ? "http" : "stdio"),
              command: cliServer.command,
              url: cliServer.url,
              tools: cliServer.tools ?? cliServer.functions,
              connected: cliServer.connected ?? cliServer.status === "connected",
            });
          }
        }
      }
    } catch {
      // CLI failed — use config/API data
    }
  }

  return NextResponse.json({
    servers,
    total: servers.length,
    connected: servers.filter((s) => s.connected).length,
  });
}

// ---------------------------------------------------------------------------
// POST handler — connect to an MCP server or call a tool
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: ConnectMCPRequest | CallMCPToolRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Determine action type based on body shape
  if ("toolName" in body && "arguments" in body) {
    return handleCallTool(body as CallMCPToolRequest);
  } else if ("serverName" in body && "transport" in body) {
    return handleConnectServer(body as ConnectMCPRequest);
  } else {
    return NextResponse.json(
      { error: "Invalid request body — expected connect or call tool format" },
      { status: 400 },
    );
  }
}

// ---------------------------------------------------------------------------
// Connect to an MCP server
// ---------------------------------------------------------------------------

async function handleConnectServer(body: ConnectMCPRequest) {
  if (!body.serverName || typeof body.serverName !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'serverName' string" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ ...data, source: "hermes" });
      }
    } catch {
      // API failed — fall through to CLI
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const args = ["mcp", "connect", body.serverName];
      if (body.transport === "http" && body.url) {
        args.push("--url", body.url);
      } else if (body.transport === "stdio" && body.command) {
        args.push("--command", body.command);
      }

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      return NextResponse.json({
        success: true,
        serverName: body.serverName,
        output: stdout.trim(),
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json({
        success: false,
        serverName: body.serverName,
        error: "Failed to connect via CLI",
        output: (execError.stdout ?? "").trim(),
        stderr: (execError.stderr ?? "").trim(),
        source: "cli",
      }, { status: 502 });
    }
  }

  return NextResponse.json(
    {
      error: "Hermes is not available — cannot connect to MCP server",
      hint: "Start Hermes API or install the Hermes CLI",
    },
    { status: 503 },
  );
}

// ---------------------------------------------------------------------------
// Call an MCP tool
// ---------------------------------------------------------------------------

async function handleCallTool(body: CallMCPToolRequest) {
  if (!body.serverName || typeof body.serverName !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'serverName' string" },
      { status: 400 },
    );
  }

  if (!body.toolName || typeof body.toolName !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'toolName' string" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/mcp/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server_name: body.serverName,
          tool_name: body.toolName,
          arguments: body.arguments,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ ...data, source: "hermes" });
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
        ["mcp", "call", body.serverName, body.toolName, JSON.stringify(body.arguments)],
        { timeout: 30000 },
      );

      return NextResponse.json({
        success: true,
        result: stdout.trim(),
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json({
        success: false,
        error: "Failed to call MCP tool via CLI",
        output: (execError.stdout ?? "").trim(),
        stderr: (execError.stderr ?? "").trim(),
        source: "cli",
      }, { status: 502 });
    }
  }

  return NextResponse.json(
    {
      error: "Hermes is not available — cannot call MCP tool",
      hint: "Start Hermes API or install the Hermes CLI",
    },
    { status: 503 },
  );
}
