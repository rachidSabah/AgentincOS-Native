import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// ─── Types ───────────────────────────────────────────────────────────────────

type PluginStatus = "active" | "inactive" | "error";

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: PluginStatus;
  permissions: string[];
  config: Record<string, unknown>;
  installedAt: number;
}

interface AvailablePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  category: string;
  downloads: number;
  rating: number;
}

// ─── File-based Persistence ────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), ".data");
const PLUGINS_FILE = join(DATA_DIR, "plugins.json");

async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function loadPlugins(): Promise<Map<string, Plugin>> {
  const map = new Map<string, Plugin>();
  try {
    if (existsSync(PLUGINS_FILE)) {
      const raw = await readFile(PLUGINS_FILE, "utf-8");
      const arr = JSON.parse(raw) as Plugin[];
      for (const p of arr) {
        map.set(p.id, p);
      }
    }
  } catch {
    // Corrupted file — start fresh
  }
  return map;
}

async function savePlugins(map: Map<string, Plugin>): Promise<void> {
  await ensureDataDir();
  const arr = Array.from(map.values());
  await writeFile(PLUGINS_FILE, JSON.stringify(arr, null, 2), "utf-8");
}

// ─── Available Plugin Registry ───────────────────────────────────────────────

const AVAILABLE_PLUGINS: AvailablePlugin[] = [
  {
    id: "plug_github",
    name: "GitHub Integration",
    version: "1.2.0",
    description:
      "Push code, create pull requests, and manage issues directly from Hermes.",
    author: "AgenticOS Core",
    permissions: ["repo:read", "repo:write", "issues:read", "issues:write"],
    category: "development",
    downloads: 12450,
    rating: 4.8,
  },
  {
    id: "plug_jira",
    name: "Jira Connector",
    version: "1.0.3",
    description:
      "Create and update Jira tickets automatically based on agent workflows.",
    author: "AgenticOS Core",
    permissions: ["jira:read", "jira:write"],
    category: "project-management",
    downloads: 8320,
    rating: 4.5,
  },
  {
    id: "plug_slack",
    name: "Slack Bot",
    version: "2.1.0",
    description:
      "Send notifications and respond to slash commands via Slack integration.",
    author: "AgenticOS Core",
    permissions: ["slack:chat:write", "slack:channels:read"],
    category: "communication",
    downloads: 15670,
    rating: 4.7,
  },
  {
    id: "plug_llm",
    name: "Custom LLM Provider",
    version: "1.1.0",
    description:
      "Add new model endpoints to extend Hermes with custom LLM providers.",
    author: "AgenticOS Core",
    permissions: ["llm:configure", "llm:execute"],
    category: "ai",
    downloads: 6890,
    rating: 4.3,
  },
  {
    id: "plug_obsidian",
    name: "Obsidian Sync",
    version: "1.0.1",
    description: "Bidirectional sync between your Obsidian vault and Hermes.",
    author: "AgenticOS Core",
    permissions: ["vault:read", "vault:write"],
    category: "knowledge",
    downloads: 5430,
    rating: 4.6,
  },
  {
    id: "plug_stripe",
    name: "Stripe Monitor",
    version: "1.0.0",
    description:
      "Monitor Stripe payments and trigger alerts for important events.",
    author: "AgenticOS Core",
    permissions: ["stripe:read", "stripe:webhooks"],
    category: "finance",
    downloads: 3210,
    rating: 4.2,
  },
  {
    id: "plug_email",
    name: "Email Digest",
    version: "1.3.0",
    description: "Generate and send daily or weekly summary digests via email.",
    author: "AgenticOS Core",
    permissions: ["email:send", "email:read"],
    category: "communication",
    downloads: 9870,
    rating: 4.4,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePluginId(): string {
  return `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function findAvailablePlugin(name: string): AvailablePlugin | undefined {
  return AVAILABLE_PLUGINS.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() || p.id === name
  );
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const plugins = await loadPlugins();
  const list = Array.from(plugins.values());
  return NextResponse.json({ plugins: list, total: list.length });
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const plugins = await loadPlugins();

  try {
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      // ── Install ─────────────────────────────────────────────────────────
      case "install": {
        const { name, source, config } = body as {
          name: string;
          source: string;
          config?: Record<string, unknown>;
        };

        if (!name || !source) {
          return NextResponse.json(
            { error: "name and source are required" },
            { status: 400 }
          );
        }

        // Check if already installed
        const existing = Array.from(plugins.values()).find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          // If existing plugin is inactive, reactivate it
          if (existing.status !== "active") {
            existing.status = "active";
            await savePlugins(plugins);
          }
          return NextResponse.json({
            success: true,
            plugin: {
              id: existing.id,
              name: existing.name,
              version: existing.version,
              status: existing.status,
            },
          });
        }

        // Look up in registry or create custom entry
        const available = findAvailablePlugin(name);
        const id = generatePluginId();
        const now = Date.now();

        const plugin: Plugin = {
          id,
          name: available?.name ?? name,
          version: available?.version ?? "0.1.0",
          description:
            available?.description ?? `Custom plugin from ${source}`,
          author: available?.author ?? "Custom",
          status: "active", // Auto-activate on install
          permissions: available?.permissions ?? ["custom:execute"],
          config: config ?? {},
          installedAt: now,
        };

        plugins.set(id, plugin);
        await savePlugins(plugins);

        return NextResponse.json({
          success: true,
          plugin: {
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            status: plugin.status,
          },
        });
      }

      // ── Uninstall ──────────────────────────────────────────────────────
      case "uninstall": {
        const { name } = body as { name: string };

        if (!name) {
          return NextResponse.json(
            { error: "name is required" },
            { status: 400 }
          );
        }

        const entry = Array.from(plugins.entries()).find(
          ([, p]) => p.name.toLowerCase() === name.toLowerCase()
        );

        if (!entry) {
          return NextResponse.json(
            { error: `Plugin "${name}" not found` },
            { status: 404 }
          );
        }

        const [pluginId, plugin] = entry;
        plugins.delete(pluginId);
        await savePlugins(plugins);

        return NextResponse.json({
          success: true,
          message: `Plugin "${plugin.name}" uninstalled`,
        });
      }

      // ── Activate ───────────────────────────────────────────────────────
      case "activate": {
        const { name } = body as { name: string };

        if (!name) {
          return NextResponse.json(
            { error: "name is required" },
            { status: 400 }
          );
        }

        const plugin = Array.from(plugins.values()).find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );

        if (!plugin) {
          return NextResponse.json(
            { error: `Plugin "${name}" not found` },
            { status: 404 }
          );
        }

        plugin.status = "active";
        await savePlugins(plugins);

        return NextResponse.json({
          success: true,
          plugin: {
            id: plugin.id,
            name: plugin.name,
            status: plugin.status,
          },
        });
      }

      // ── Deactivate ─────────────────────────────────────────────────────
      case "deactivate": {
        const { name } = body as { name: string };

        if (!name) {
          return NextResponse.json(
            { error: "name is required" },
            { status: 400 }
          );
        }

        const plugin = Array.from(plugins.values()).find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );

        if (!plugin) {
          return NextResponse.json(
            { error: `Plugin "${name}" not found` },
            { status: 404 }
          );
        }

        plugin.status = "inactive";
        await savePlugins(plugins);

        return NextResponse.json({
          success: true,
          plugin: {
            id: plugin.id,
            name: plugin.name,
            status: plugin.status,
          },
        });
      }

      // ── Configure ──────────────────────────────────────────────────────
      case "configure": {
        const { name, config } = body as {
          name: string;
          config: Record<string, unknown>;
        };

        if (!name || !config) {
          return NextResponse.json(
            { error: "name and config are required" },
            { status: 400 }
          );
        }

        const plugin = Array.from(plugins.values()).find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );

        if (!plugin) {
          return NextResponse.json(
            { error: `Plugin "${name}" not found` },
            { status: 404 }
          );
        }

        plugin.config = { ...plugin.config, ...config };
        await savePlugins(plugins);

        return NextResponse.json({
          success: true,
          plugin: {
            id: plugin.id,
            name: plugin.name,
            config: plugin.config,
          },
        });
      }

      // ── List Available ─────────────────────────────────────────────────
      case "list-available": {
        return NextResponse.json({
          plugins: AVAILABLE_PLUGINS,
          total: AVAILABLE_PLUGINS.length,
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Unknown action. Valid actions: install, uninstall, activate, deactivate, configure, list-available",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
