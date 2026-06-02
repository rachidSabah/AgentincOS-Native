import { NextRequest, NextResponse } from "next/server";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import {
  findGeminiBinaryAsync,
  getGeminiStatusAsync,
  getGeminiVersionAsync,
  isGeminiProcessRunningAsync,
  getGeminiModelAsync,
  getActionSystemPrompt,
  buildGeminiCommand,
  getCachedGeminiStatus,
  setCachedGeminiStatus,
  type GeminiAction,
  type GeminiRequest,
} from "@/lib/gemini";
import ZAI from "z-ai-web-dev-sdk";
import { resolveModelAlias } from "@/lib/gemini";

// ---------------------------------------------------------------------------
// ZAI SDK singleton (lazy-initialised) — used as fallback when Gemini CLI
// is not available
// ---------------------------------------------------------------------------

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ---------------------------------------------------------------------------
// GET handler — Check Gemini CLI status
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    // Use cached status if available
    const cached = getCachedGeminiStatus();
    if (cached) {
      return NextResponse.json(cached);
    }

    const status = await getGeminiStatusAsync();
    setCachedGeminiStatus(status);

    return NextResponse.json(status);
  } catch (error) {
    console.error("[gemini] Status check failed:", error);
    return NextResponse.json(
      {
        installed: false,
        running: false,
        version: null,
        path: null,
        health: "offline" as const,
        model: "gemini-2.5-pro",
        message: "Failed to check Gemini CLI status.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — Execute Gemini CLI commands
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: GeminiRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.action || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'action' field. Must be one of: chat, generate, review, refactor, plan, research, reason, analyze, execute" },
      { status: 400 },
    );
  }

  const validActions: GeminiAction[] = [
    "chat", "generate", "review", "refactor", "plan", "research", "reason", "analyze", "execute",
  ];

  if (!validActions.includes(body.action as GeminiAction)) {
    return NextResponse.json(
      { error: `Invalid action '${body.action}'. Must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'message' field" },
      { status: 400 },
    );
  }

  const binPath = await findGeminiBinaryAsync();

  // If Gemini CLI is not installed, fall back to ZAI SDK
  if (!binPath) {
    return handleFallback(body);
  }

  const shouldStream = body.stream !== false;

  // --- Streaming response via Gemini CLI ---
  if (shouldStream) {
    return handleStreamingCLI(binPath, body);
  }

  // --- Non-streaming response via Gemini CLI ---
  return handleNonStreamingCLI(binPath, body);
}

// ---------------------------------------------------------------------------
// Streaming CLI execution
// ---------------------------------------------------------------------------

async function handleStreamingCLI(
  binPath: string,
  body: GeminiRequest,
): Promise<Response> {
  const commandArgs = buildGeminiCommand(body, binPath);
  // Remove the bin path from the start (we pass it to spawn separately)
  const bin = commandArgs[0]!;
  const args = commandArgs.slice(1);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn(bin, args, {
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        buffer += text;

        // Send chunks as SSE
        const sseChunk = {
          type: "content",
          action: body.action,
          data: text,
          timestamp: Date.now(),
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(sseChunk)}\n\n`),
        );
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        const sseChunk = {
          type: "error",
          action: body.action,
          data: text,
          timestamp: Date.now(),
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(sseChunk)}\n\n`),
        );
      });

      child.on("close", (code) => {
        const doneChunk = {
          type: "done",
          action: body.action,
          exitCode: code,
          timestamp: Date.now(),
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`),
        );
        controller.close();
      });

      child.on("error", (err) => {
        const errorChunk = {
          type: "error",
          action: body.action,
          data: err.message,
          timestamp: Date.now(),
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------------------------------------------------------------------------
// Non-streaming CLI execution
// ---------------------------------------------------------------------------

async function handleNonStreamingCLI(
  binPath: string,
  body: GeminiRequest,
): Promise<NextResponse> {
  const execFileAsync = promisify(execFile);

  const commandArgs = buildGeminiCommand(body, binPath);
  const bin = commandArgs[0]!;
  const args = commandArgs.slice(1);

  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      timeout: 120000, // 2 minutes
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      },
    });

    return NextResponse.json({
      success: true,
      action: body.action,
      response: stdout.trim(),
      warnings: stderr.trim() || undefined,
      model: body.model || "gemini-2.5-pro",
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    return NextResponse.json(
      {
        success: false,
        action: body.action,
        error: execError.killed
          ? "Command timed out after 2 minutes"
          : execError.message || "Gemini CLI execution failed",
        stdout: execError.stdout || "",
        stderr: execError.stderr || "",
        timestamp: Date.now(),
      },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// Fallback using ZAI SDK (when Gemini CLI is not installed)
// ---------------------------------------------------------------------------

async function handleFallback(body: GeminiRequest): Promise<Response> {
  const shouldStream = body.stream !== false;
  const systemPrompt = getActionSystemPrompt(body.action as GeminiAction);

  if (shouldStream) {
    return streamFallback(systemPrompt, body);
  }

  return nonStreamFallback(systemPrompt, body);
}

async function streamFallback(
  systemPrompt: string,
  body: GeminiRequest,
): Promise<Response> {
  try {
    const zai = await getZAI();

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: body.message },
    ];

    const resolvedModel = resolveModelAlias(body.model || "auto");
    const completion = await zai.chat.completions.create({
      messages,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the full content as a single delta chunk
        const chunk = {
          type: "content",
          action: body.action,
          data: responseText,
          timestamp: Date.now(),
          fallback: true,
          model: resolvedModel,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );

        // Send finish chunk
        const doneChunk = {
          type: "done",
          action: body.action,
          exitCode: 0,
          timestamp: Date.now(),
          fallback: true,
          model: resolvedModel,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`),
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[gemini] ZAI SDK fallback (streaming) failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Both Gemini CLI and fallback AI are unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
        installHint:
          "Install Gemini CLI with: npm install -g @google/gemini-cli",
      },
      { status: 503 },
    );
  }
}

async function nonStreamFallback(
  systemPrompt: string,
  body: GeminiRequest,
): Promise<NextResponse> {
  try {
    const zai = await getZAI();

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: body.message },
    ];

    const resolvedModel = resolveModelAlias(body.model || "auto");
    const completion = await zai.chat.completions.create({
      messages,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({
      success: true,
      action: body.action,
      response: responseText,
      model: resolvedModel,
      fallback: true,
      timestamp: Date.now(),
      note: "Gemini CLI is not installed. Using fallback AI provider. Install Gemini CLI for native integration: npm install -g @google/gemini-cli",
    });
  } catch (error) {
    console.error("[gemini] ZAI SDK fallback (non-streaming) failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Both Gemini CLI and fallback AI are unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
        installHint:
          "Install Gemini CLI with: npm install -g @google/gemini-cli",
      },
      { status: 503 },
    );
  }
}
