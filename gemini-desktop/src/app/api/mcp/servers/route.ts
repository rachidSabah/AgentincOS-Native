import { NextRequest, NextResponse } from "next/server";
import { McpClientManager } from "@/lib/mcp";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configs = await McpClientManager.getServers();
    const results = await Promise.all(
      configs.map(async (cfg) => {
        if (!cfg.enabled) {
          return {
            ...cfg,
            status: "disabled",
            tools: [],
          };
        }
        try {
          const client = await McpClientManager.getClient(cfg);
          const toolsRes = await client.listTools();
          return {
            ...cfg,
            status: "connected",
            tools: toolsRes.tools || [],
          };
        } catch (e: any) {
          return {
            ...cfg,
            status: "error",
            lastError: e.message || "Failed to connect",
            tools: [],
          };
        }
      })
    );
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const servers = await McpClientManager.getServers();
    
    const newServer: any = {
      id: crypto.randomUUID(),
      name: body.name || "Unnamed Server",
      transport: body.transport || "sse",
      url: body.url || "",
      command: body.command || "",
      args: body.args || [],
      env: body.env || {},
      enabled: body.enabled !== false,
    };
    
    servers.push(newServer);
    await McpClientManager.saveServers(servers);
    return NextResponse.json(newServer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, enabled, ...rest } = body;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    let servers = await McpClientManager.getServers();
    servers = servers.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          ...(enabled !== undefined ? { enabled } : {}),
          ...rest,
        };
      }
      return s;
    });

    await McpClientManager.saveServers(servers);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    
    let servers = await McpClientManager.getServers();
    servers = servers.filter((s) => s.id !== id);
    await McpClientManager.saveServers(servers);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
