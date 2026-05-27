import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { findHermesBinary, isHermesInstalled } from "@/lib/hermes";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Allowed subcommands — whitelist to prevent shell injection
// ---------------------------------------------------------------------------

const ALLOWED_SUBCOMMANDS = new Set([
  "model",
  "tools",
  "skills",
  "gateway",
  "config",
  "setup",
  "doctor",
  "update",
  "sessions",
  "version",
  "status",
  "acp",
]);

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

interface CommandRequest {
  command: string;
}

export async function POST(request: NextRequest) {
  let body: CommandRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.command || typeof body.command !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'command' string" },
      { status: 400 },
    );
  }

  // Check that Hermes is installed
  if (!isHermesInstalled()) {
    return NextResponse.json(
      {
        error: "Hermes is not installed",
        hint: "Install Hermes with: curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash",
      },
      { status: 404 },
    );
  }

  const bin = findHermesBinary();
  if (!bin) {
    return NextResponse.json(
      { error: "Hermes binary not found" },
      { status: 404 },
    );
  }

  // Parse the command safely — no shell interpretation
  const parts = body.command.trim().split(/\s+/);

  // If the user typed "hermes skills search kubernetes", strip the leading "hermes"
  const startIdx = parts[0] === "hermes" ? 1 : 0;
  const subcommand = parts[startIdx];

  if (!subcommand) {
    return NextResponse.json(
      { error: "No subcommand provided" },
      { status: 400 },
    );
  }

  // Validate against whitelist
  if (!ALLOWED_SUBCOMMANDS.has(subcommand)) {
    return NextResponse.json(
      {
        error: `Subcommand '${subcommand}' is not allowed`,
        allowed: Array.from(ALLOWED_SUBCOMMANDS).sort(),
      },
      { status: 403 },
    );
  }

  // Build safe argument list
  const args = parts.slice(startIdx + 1);

  // Additional safety: reject arguments that look like shell metacharacters
  for (const arg of args) {
    if (/[;&|`$(){}!#<>]/.test(arg)) {
      return NextResponse.json(
        {
          error: `Argument contains disallowed characters: ${arg}`,
          hint: "Shell metacharacters are not permitted in command arguments",
        },
        { status: 400 },
      );
    }
  }

  try {
    const { stdout, stderr } = await execFileAsync(bin, [subcommand, ...args], {
      timeout: 30000,
      maxBuffer: 1024 * 1024, // 1 MB
      env: { ...process.env },
    });

    return NextResponse.json({
      success: true,
      command: `hermes ${subcommand} ${args.join(" ")}`,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    });
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      code?: string | number;
      killed?: boolean;
    };

    // If the process was killed (timeout), return a specific error
    if (execError.killed) {
      return NextResponse.json(
        {
          success: false,
          command: `hermes ${subcommand} ${args.join(" ")}`,
          error: "Command timed out after 30 seconds",
          stdout: (execError.stdout ?? "").trim(),
          stderr: (execError.stderr ?? "").trim(),
        },
        { status: 408 },
      );
    }

    // Process returned non-zero exit code — still useful to return output
    return NextResponse.json({
      success: false,
      command: `hermes ${subcommand} ${args.join(" ")}`,
      error: `Command exited with code ${execError.code ?? "unknown"}`,
      stdout: (execError.stdout ?? "").trim(),
      stderr: (execError.stderr ?? "").trim(),
    });
  }
}
