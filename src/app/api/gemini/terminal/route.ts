import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { platform } from "os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TerminalRequest {
  command: string;
  cwd?: string;
  shell?: string;
  timeout?: number;
  env?: Record<string, string>;
}

interface TerminalResponse {
  output: string;
  exitCode: number;
  duration: number;
  command: string;
  cwd: string;
  shell: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_TIMEOUT = 120000; // 2 minutes

// Blocked commands for safety
const BLOCKED_COMMANDS = [
  "rm -rf /",
  "rm -rf /*",
  "mkfs",
  "dd if=",
  ":(){ :|:& };:",
  "fork bomb",
  "format c:",
  "del /f /s /q c:\\",
];

// ---------------------------------------------------------------------------
// POST handler — Execute terminal commands
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: TerminalRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.command || typeof body.command !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'command' field" },
      { status: 400 },
    );
  }

  // Security check: block dangerous commands
  const commandLower = body.command.toLowerCase().trim();
  for (const blocked of BLOCKED_COMMANDS) {
    if (commandLower.includes(blocked.toLowerCase())) {
      return NextResponse.json(
        {
          error: "Command blocked for safety reasons",
          command: body.command,
          reason: `This command matches a blocked pattern: "${blocked}"`,
        },
        { status: 403 },
      );
    }
  }

  // Determine shell
  const osPlatform = platform();
  const shell = body.shell || getDefaultShell(osPlatform);
  const cwd = body.cwd || process.cwd();
  const timeout = Math.min(
    body.timeout || DEFAULT_TIMEOUT,
    MAX_TIMEOUT,
  );

  // Execute the command
  const startTime = Date.now();

  try {
    const result = await executeCommand(body.command, {
      cwd,
      shell,
      timeout,
      env: body.env,
    });

    const duration = Date.now() - startTime;

    const response: TerminalResponse = {
      output: result.output,
      exitCode: result.exitCode,
      duration,
      command: body.command,
      cwd,
      shell,
    };

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        output: "",
        exitCode: -1,
        duration,
        command: body.command,
        cwd,
        shell,
        error: error instanceof Error ? error.message : "Command execution failed",
      } satisfies TerminalResponse & { error: string },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// Command Execution
// ---------------------------------------------------------------------------

function executeCommand(
  command: string,
  options: {
    cwd: string;
    shell: string;
    timeout: number;
    env?: Record<string, string>;
  },
): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, [], {
      cwd: options.cwd,
      shell: options.shell,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
      timeout: options.timeout,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({
        output: stdout + (stderr ? `\n${stderr}` : ""),
        exitCode: code ?? -1,
      });
    });

    child.on("error", (err) => {
      resolve({
        output: stderr || err.message,
        exitCode: -1,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultShell(osPlatform: string): string {
  switch (osPlatform) {
    case "win32":
      return "powershell.exe";
    case "darwin":
    case "linux":
    default:
      return "/bin/bash";
  }
}
