import fs from "fs";
import path from "path";
import os from "os";

export interface ToolParameter {
  type: string;
  description: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, any>, workspacePath?: string) => Promise<string>;
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolCallResult {
  name: string;
  arguments: Record<string, any>;
  result: string;
  status: "success" | "error";
  timestamp: string;
}

function resolvePath(filePath: string, workspacePath?: string): string {
  const base = (workspacePath && fs.existsSync(workspacePath)) ? path.resolve(workspacePath) : os.homedir();
  const resolved = path.resolve(base, filePath);
  
  // Strict path traversal check
  const relative = path.relative(base, resolved);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  
  if (!isSafe && resolved !== base) {
    throw new Error(`Path traversal detected: ${filePath}. Only paths within ${base} are allowed.`);
  }
  return resolved;
}

function safeMathEval(expression: string): number {
  const sanitized = expression.replace(/\s/g, "");
  if (/[^0-9+\-*/().%^]/.test(sanitized)) {
    throw new Error("Expression contains disallowed characters. Only numbers and + - * / ( ) . % ^ are allowed.");
  }
  return new Function(`"use strict"; return (${sanitized})`)();
}

const availableTools: ToolDefinition[] = [
  {
    name: "calculator",
    description: "Evaluate a mathematical expression safely. Supports +, -, *, /, (), %, ^.",
    parameters: {
      expression: { type: "string", description: "The math expression to evaluate, e.g. '2 + 2 * 3'" },
    },
    execute: async (params) => {
      const expr = params.expression as string;
      if (!expr) return JSON.stringify({ error: "No expression provided" });
      try {
        const result = safeMathEval(expr);
        return JSON.stringify({ expression: expr, result });
      } catch (e: any) {
        return JSON.stringify({ error: e.message });
      }
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a file at the given relative path.",
    parameters: {
      filePath: { type: "string", description: "Path to the file relative to the workspace" },
    },
    execute: async (params, workspacePath) => {
      const filePath = params.filePath as string;
      if (!filePath) return JSON.stringify({ error: "No file path provided" });
      try {
        const resolved = resolvePath(filePath, workspacePath);
        if (!fs.existsSync(resolved)) {
          return JSON.stringify({ error: `File not found: ${resolved}` });
        }
        const stats = await fs.promises.stat(resolved);
        if (!stats.isFile()) {
          return JSON.stringify({ error: `Path is not a file: ${resolved}` });
        }
        const content = await fs.promises.readFile(resolved, "utf-8");
        return JSON.stringify({ path: resolved, content });
      } catch (e: any) {
        return JSON.stringify({ error: e.message });
      }
    },
  },
  {
    name: "write_file",
    description: "Write content to a file at the given relative path. Creates parent directories if needed.",
    parameters: {
      filePath: { type: "string", description: "Path to the file relative to the workspace" },
      content: { type: "string", description: "Content to write to the file" },
    },
    execute: async (params, workspacePath) => {
      const filePath = params.filePath as string;
      const content = params.content as string;
      if (!filePath) return JSON.stringify({ error: "No file path provided" });
      if (content === undefined) return JSON.stringify({ error: "No content provided" });
      try {
        const resolved = resolvePath(filePath, workspacePath);
        const parentDir = path.dirname(resolved);
        if (!fs.existsSync(parentDir)) {
          await fs.promises.mkdir(parentDir, { recursive: true });
        }
        await fs.promises.writeFile(resolved, content, "utf-8");
        return JSON.stringify({ path: resolved, written: true });
      } catch (e: any) {
        return JSON.stringify({ error: e.message });
      }
    },
  },
  {
    name: "list_files",
    description: "List files and directories at the given relative path.",
    parameters: {
      dirPath: { type: "string", description: "Directory path relative to the workspace (use '.' for root)" },
    },
    execute: async (params, workspacePath) => {
      const dirPath = (params.dirPath as string) || ".";
      try {
        const resolved = resolvePath(dirPath, workspacePath);
        if (!fs.existsSync(resolved)) {
          return JSON.stringify({ error: `Directory not found: ${resolved}` });
        }
        if (!fs.statSync(resolved).isDirectory()) {
          return JSON.stringify({ error: `Path is not a directory: ${resolved}` });
        }
        const files = fs.readdirSync(resolved).map((f) => {
          try {
            const stats = fs.statSync(path.join(resolved, f));
            return {
              name: f,
              type: stats.isDirectory() ? "directory" : "file",
              size: stats.size,
              modified: stats.mtime.toISOString(),
            };
          } catch {
            return { name: f, type: "unknown", size: 0, modified: "" };
          }
        });
        return JSON.stringify({ path: resolved, files });
      } catch (e: any) {
        return JSON.stringify({ error: e.message });
      }
    },
  },
  {
    name: "web_search",
    description: "Search the web for information. Returns search results with titles, URLs, and snippets.",
    parameters: {
      query: { type: "string", description: "The search query string" },
    },
    execute: async (params) => {
      const query = (params.query as string)?.trim();
      if (!query) return JSON.stringify({ error: "No search query provided" });
      try {
        const res = await fetch("http://localhost:3000/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        if (data.error) return JSON.stringify({ error: data.error });
        return JSON.stringify({ query, results: data.results || [], source: data.source });
      } catch (e: any) {
        return JSON.stringify({ error: e.message });
      }
    },
  },
  {
    name: "get_current_time",
    description: "Returns the current date and time.",
    parameters: {},
    execute: async () => {
      const now = new Date();
      return JSON.stringify({
        iso: now.toISOString(),
        local: now.toString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: now.getTime(),
      });
    },
  },
  {
    name: "get_system_info",
    description: "Returns basic system information including OS, platform, memory, and uptime.",
    parameters: {},
    execute: async () => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      return JSON.stringify({
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        memory: {
          total: `${(totalMem / (1024 * 1024 * 1024)).toFixed(1)} GB`,
          free: `${(freeMem / (1024 * 1024 * 1024)).toFixed(1)} GB`,
          usedPercent: `${((1 - freeMem / totalMem) * 100).toFixed(1)}%`,
        },
        uptime: `${(os.uptime() / 3600).toFixed(1)} hours`,
        homedir: os.homedir(),
      });
    },
  },
];

export function getToolDefinitions(): ToolDefinition[] {
  return availableTools;
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return availableTools.find((t) => t.name === name);
}

export function getToolsPrompt(): string {
  const lines = availableTools.map((tool) => {
    const params = Object.entries(tool.parameters)
      .map(([k, v]) => `  - ${k} (${v.type}): ${v.description}`)
      .join("\n");
    return `- **${tool.name}**: ${tool.description}\n${params}`;
  });
  return `[AVAILABLE TOOLS]\nYou can call tools using JSON format. Wrap each tool call in a code block with language "tool_call".\nMultiple tool calls can be placed in the same block, one per line.\n\nExample:\n\`\`\`tool_call\n{"name": "read_file", "arguments": {"filePath": "src/main.ts"}}\n\`\`\`\n\n${lines.join("\n")}`;
}

export function parseToolCalls(text: string): ToolCallRequest[] {
  const calls: ToolCallRequest[] = [];

  const toolBlockRegex = /```tool_call\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = toolBlockRegex.exec(text)) !== null) {
    const lines = match[1].split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const obj = JSON.parse(line.trim());
        if (obj.name && typeof obj.name === "string") {
          calls.push({ name: obj.name, arguments: obj.arguments || {} });
        }
      } catch {}
    }
  }

  const jsonBlockRegex = /```(?:json)?\s*\n(\s*\{[\s\S]*?\}\s*)\n```/g;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1].trim());
      if (obj.name && typeof obj.name === "string" && !calls.some((c) => c.name === obj.name && JSON.stringify(c.arguments) === JSON.stringify(obj.arguments))) {
        calls.push({ name: obj.name, arguments: obj.arguments || {} });
      }
    } catch {}
  }

  const inlineJsonRegex = /\{\s*"name"\s*:\s*"(\w+)"\s*,\s*"arguments"\s*:\s*(\{(?:[^{}]|\{[^{}]*\})*\})\s*\}/g;
  while ((match = inlineJsonRegex.exec(text)) !== null) {
    const name = match[1];
    try {
      const args = JSON.parse(match[2]);
      if (!calls.some((c) => c.name === name && JSON.stringify(c.arguments) === JSON.stringify(args))) {
        calls.push({ name, arguments: args });
      }
    } catch {}
  }

  const cmdRegex = /<local_cmd>([\s\S]*?)<\/local_cmd>/;
  const cmdMatch = text.match(cmdRegex);
  if (cmdMatch) {
    calls.push({ name: "local_cmd", arguments: { command: cmdMatch[1].trim() } });
  }

  const listRegex = /<list_files>([\s\S]*?)<\/list_files>/;
  const listMatch = text.match(listRegex);
  if (listMatch) {
    calls.push({ name: "list_files", arguments: { dirPath: listMatch[1].trim() || "." } });
  }

  const readRegex = /<read_file>([\s\S]*?)<\/read_file>/;
  const readMatch = text.match(readRegex);
  if (readMatch) {
    calls.push({ name: "read_file", arguments: { filePath: readMatch[1].trim() } });
  }

  const writeRegex = /<write_file\s+path="([\s\S]*?)">([\s\S]*?)<\/write_file>/;
  const writeMatch = text.match(writeRegex);
  if (writeMatch) {
    calls.push({ name: "write_file", arguments: { filePath: writeMatch[1].trim(), content: writeMatch[2] } });
  }

  return calls;
}

export async function executeToolCall(
  call: ToolCallRequest,
  workspacePath?: string
): Promise<ToolCallResult> {
  const timestamp = new Date().toISOString();

  if (call.name === "local_cmd") {
    const activeDir = (workspacePath && fs.existsSync(workspacePath))
      ? path.resolve(workspacePath)
      : path.join(os.homedir(), "Desktop");
    try {
      const result = await new Promise<string>((resolve) => {
        const { exec } = require("child_process");
        exec(call.arguments.command, { cwd: activeDir, timeout: 30000 }, (error: any, stdout: string, stderr: string) => {
          resolve(
            JSON.stringify({
              stdout: stdout || "(no stdout)",
              stderr: stderr || "(no stderr)",
              exitCode: error ? error.code : 0,
            })
          );
        });
      });
      return { name: "local_cmd", arguments: call.arguments, result, status: "success", timestamp };
    } catch (e: any) {
      return { name: "local_cmd", arguments: call.arguments, result: JSON.stringify({ error: e.message }), status: "error", timestamp };
    }
  }

  const tool = getToolByName(call.name);
  if (!tool) {
    return { name: call.name, arguments: call.arguments, result: JSON.stringify({ error: `Unknown tool: ${call.name}` }), status: "error", timestamp };
  }

  try {
    const result = await tool.execute(call.arguments, workspacePath);
    return { name: call.name, arguments: call.arguments, result, status: "success", timestamp };
  } catch (e: any) {
    return { name: call.name, arguments: call.arguments, result: JSON.stringify({ error: e.message }), status: "error", timestamp };
  }
}
