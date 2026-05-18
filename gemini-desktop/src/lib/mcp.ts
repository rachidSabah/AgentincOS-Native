import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { db } from "@/lib/db";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: "sse" | "stdio";
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

// Global cached client connections for serverless API routes
const globalClients = (global as any).mcpClients || {};
(global as any).mcpClients = globalClients;

export class McpClientManager {
  static async getServers(): Promise<McpServerConfig[]> {
    try {
      const entry = await db.settings.findUnique({
        where: { key: "mcp_servers" },
      });
      if (entry) {
        return JSON.parse(entry.value) as McpServerConfig[];
      }
    } catch (e) {
      console.error("Failed to load MCP servers from database settings:", e);
    }
    return [];
  }

  static async saveServers(servers: McpServerConfig[]): Promise<void> {
    await db.settings.upsert({
      where: { key: "mcp_servers" },
      update: { value: JSON.stringify(servers) },
      create: { key: "mcp_servers", value: JSON.stringify(servers) },
    });
  }

  static async getClient(config: McpServerConfig): Promise<Client> {
    if (globalClients[config.id]) {
      return globalClients[config.id];
    }

    console.log(`Connecting to MCP server: ${config.name} (${config.transport})`);
    
    let transport;
    if (config.transport === "sse" && config.url) {
      transport = new SSEClientTransport(new URL(config.url));
    } else if (config.transport === "stdio" && config.command) {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: {
          ...process.env,
          ...(config.env || {}),
        } as Record<string, string>,
      });
    } else {
      throw new Error(`Unsupported MCP transport type: ${config.transport}`);
    }

    const client = new Client(
      {
        name: "ClawHub Desktop Client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    globalClients[config.id] = client;
    return client;
  }

  static async disconnectAll(): Promise<void> {
    for (const key of Object.keys(globalClients)) {
      try {
        await globalClients[key].close();
      } catch {}
      delete globalClients[key];
    }
  }

  static async listAllTools(): Promise<any[]> {
    const servers = await this.getServers();
    const enabledServers = servers.filter((s) => s.enabled);
    const allTools: any[] = [];

    await Promise.all(
      enabledServers.map(async (server) => {
        try {
          const client = await this.getClient(server);
          const response = await client.listTools();
          if (response && response.tools) {
            const mapped = response.tools.map((t: any) => ({
              name: t.name,
              description: t.description || "",
              inputSchema: t.inputSchema || {},
              serverId: server.id,
              serverName: server.name,
            }));
            allTools.push(...mapped);
          }
        } catch (e: any) {
          console.error(`Failed to list tools for MCP server ${server.name}:`, e.message || e);
        }
      })
    );

    return allTools;
  }

  static async executeTool(serverId: string, toolName: string, args: any): Promise<any> {
    const servers = await this.getServers();
    const server = servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error(`MCP Server with ID ${serverId} not found`);
    }

    const client = await this.getClient(server);
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });
    return result;
  }
}
