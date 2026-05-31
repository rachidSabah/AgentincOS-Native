import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  findHermesBinaryAsync,
  hermesFetch,
  hermesFetchQueued,
  HERMES_DATA_DIR,
} from "@/lib/hermes";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoryProvider {
  name: string;
  configured: boolean;
}

interface MemoryStatusResponse {
  activeProvider: string;
  providers: MemoryProvider[];
}

interface MemoryActionRequest {
  action: "search" | "store" | "delete";
  query?: string;
  content?: string;
  id?: string;
  provider?: string;
}

/** Well-known memory providers. */
const KNOWN_PROVIDERS = [
  "honcho",
  "openviking",
  "mem0",
  "hindsight",
  "holographic",
  "retaindb",
  "byterover",
  "supermemory",
  "built-in",
];

// ---------------------------------------------------------------------------
// Helper — paths for built-in memory files
// ---------------------------------------------------------------------------

function getMemoryFilePath(): string {
  return join(HERMES_DATA_DIR, "MEMORY.md");
}

function getUserFilePath(): string {
  return join(HERMES_DATA_DIR, "USER.md");
}

// ---------------------------------------------------------------------------
// GET handler — list memory configuration and providers
// ---------------------------------------------------------------------------

export async function GET() {
  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // 1. Try Hermes API
  if (running) {
    try {
      const res = await hermesFetch("/v1/memory/providers", {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        const apiProviders: MemoryProvider[] = Array.isArray(data)
          ? data
          : data.providers ?? [];

        if (apiProviders.length > 0) {
          const activeProvider = data.activeProvider ?? data.active ?? data.current ?? "built-in";
          return NextResponse.json({
            activeProvider,
            providers: apiProviders,
            source: "hermes",
          });
        }
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
        ["config", "get", "memory"],
        { timeout: 10000 },
      );
      const output = stdout.trim();
      if (output) {
        const providers = KNOWN_PROVIDERS.map((name) => ({
          name,
          configured: name === output || name === "built-in",
        }));

        return NextResponse.json({
          activeProvider: output,
          providers,
          source: "cli",
        });
      }
    } catch {
      // CLI failed — fall through to built-in check
    }
  }

  // 3. Fallback — check built-in memory files
  const providers = KNOWN_PROVIDERS.map((name) => {
    if (name === "built-in") {
      return {
        name,
        configured: existsSync(getMemoryFilePath()) || existsSync(getUserFilePath()),
      };
    }
    return { name, configured: false };
  });

  return NextResponse.json({
    activeProvider: "built-in",
    providers,
    source: "default",
  });
}

// ---------------------------------------------------------------------------
// POST handler — memory operations
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: MemoryActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || !["search", "store", "delete"].includes(body.action)) {
    return NextResponse.json(
      { error: "Invalid or missing 'action' — must be 'search', 'store', or 'delete'" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "search":
      return handleMemorySearch(body.query, body.provider);
    case "store":
      return handleMemoryStore(body.content, body.provider);
    case "delete":
      return handleMemoryDelete(body.id, body.provider);
  }
}

// ---------------------------------------------------------------------------
// Search memory
// ---------------------------------------------------------------------------

async function handleMemorySearch(
  query?: string,
  provider?: string,
): Promise<NextResponse> {
  if (!query) {
    return NextResponse.json(
      { error: "Missing 'query' parameter for search action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/memory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, provider }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          results: data.results ?? data.memories ?? data,
          query,
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI/built-in
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const args = ["memory", "search", query];
      if (provider) args.push("--provider", provider);

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      const output = stdout.trim();
      if (output) {
        try {
          const parsed = JSON.parse(output);
          return NextResponse.json({
            success: true,
            results: parsed.results ?? parsed.memories ?? parsed,
            query,
            source: "cli",
          });
        } catch {
          // Not JSON — return as text results
          return NextResponse.json({
            success: true,
            results: output.split("\n").filter(Boolean).map((line) => ({ text: line })),
            query,
            source: "cli",
          });
        }
      }
    } catch {
      // CLI failed — fall through to built-in
    }
  }

  // Built-in fallback — search MEMORY.md and USER.md
  const results: Array<{ text: string; source: string }> = [];

  for (const [label, filePath] of [
    ["MEMORY.md", getMemoryFilePath()],
    ["USER.md", getUserFilePath()],
  ] as const) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        const lowerQuery = query.toLowerCase();

        for (const line of lines) {
          if (line.toLowerCase().includes(lowerQuery)) {
            results.push({ text: line.trim(), source: label });
          }
        }
      } catch {
        // File read failed — skip
      }
    }
  }

  return NextResponse.json({
    success: true,
    results,
    query,
    source: "built-in",
  });
}

// ---------------------------------------------------------------------------
// Store memory
// ---------------------------------------------------------------------------

async function handleMemoryStore(
  content?: string,
  provider?: string,
): Promise<NextResponse> {
  if (!content) {
    return NextResponse.json(
      { error: "Missing 'content' parameter for store action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued("/v1/memory/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, provider }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          id: data.id ?? data.memory_id,
          message: data.message ?? "Memory stored",
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI/built-in
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const args = ["memory", "store", content];
      if (provider) args.push("--provider", provider);

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      const output = stdout.trim();
      const idMatch = output.match(/id[:\s]+([^\s\n]+)/i);
      const id = idMatch?.[1] ?? `mem-${Date.now()}`;

      return NextResponse.json({
        success: true,
        id,
        message: output || "Memory stored",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to store memory via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  // Built-in fallback — append to MEMORY.md
  const memoryFile = getMemoryFilePath();
  try {
    // Ensure data directory exists
    if (!existsSync(HERMES_DATA_DIR)) {
      mkdirSync(HERMES_DATA_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n${content}\n`;

    if (existsSync(memoryFile)) {
      const existing = readFileSync(memoryFile, "utf-8");
      writeFileSync(memoryFile, existing + entry, "utf-8");
    } else {
      writeFileSync(memoryFile, `# Memory\n${entry}`, "utf-8");
    }

    return NextResponse.json({
      success: true,
      id: `mem-${Date.now()}`,
      message: "Memory stored to MEMORY.md",
      source: "built-in",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Failed to write memory file: ${error instanceof Error ? error.message : "Unknown error"}`,
        source: "built-in",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Delete memory
// ---------------------------------------------------------------------------

async function handleMemoryDelete(
  id?: string,
  provider?: string,
): Promise<NextResponse> {
  if (!id) {
    return NextResponse.json(
      { error: "Missing 'id' parameter for delete action" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  // Try API first
  if (running) {
    try {
      const res = await hermesFetchQueued(
        `/v1/memory/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          id,
          message: data.message ?? "Memory deleted",
          source: "hermes",
        });
      }
    } catch {
      // API failed — fall through to CLI/built-in
    }
  }

  // Try CLI fallback
  const bin = await findHermesBinaryAsync();
  if (bin) {
    try {
      const args = ["memory", "delete", id];
      if (provider) args.push("--provider", provider);

      const { stdout } = await execFileAsync(bin, args, {
        timeout: 15000,
      });

      return NextResponse.json({
        success: true,
        id,
        message: stdout.trim() || "Memory deleted",
        source: "cli",
      });
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string };
      return NextResponse.json(
        {
          success: false,
          message: (execError.stderr ?? execError.stdout ?? "").trim() || "Failed to delete memory via CLI",
          source: "cli",
        },
        { status: 502 },
      );
    }
  }

  // Built-in fallback — try to find and remove section from MEMORY.md
  const memoryFile = getMemoryFilePath();
  if (existsSync(memoryFile)) {
    try {
      const content = readFileSync(memoryFile, "utf-8");
      // Try to find section with the given ID and remove it
      const lines = content.split("\n");
      let startIndex = -1;
      let endIndex = lines.length;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.includes(id)) {
          // Found the line with the ID — remove the surrounding section
          // Look backwards for the heading
          for (let j = i; j >= 0; j--) {
            if (lines[j]!.startsWith("## ")) {
              startIndex = j;
              break;
            }
          }
          if (startIndex === -1) startIndex = i;

          // Look forward for the next heading or end
          for (let j = startIndex + 1; j < lines.length; j++) {
            if (lines[j]!.startsWith("## ")) {
              endIndex = j;
              break;
            }
          }

          break;
        }
      }

      if (startIndex >= 0) {
        const newLines = [
          ...lines.slice(0, startIndex),
          ...lines.slice(endIndex),
        ];
        writeFileSync(memoryFile, newLines.join("\n"), "utf-8");

        return NextResponse.json({
          success: true,
          id,
          message: "Memory entry removed from MEMORY.md",
          source: "built-in",
        });
      }

      return NextResponse.json(
        {
          success: false,
          message: `Memory entry '${id}' not found in MEMORY.md`,
          source: "built-in",
        },
        { status: 404 },
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to update memory file: ${error instanceof Error ? error.message : "Unknown error"}`,
          source: "built-in",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "No memory storage available",
    },
    { status: 503 },
  );
}
