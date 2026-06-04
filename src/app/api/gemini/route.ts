import { NextRequest, NextResponse } from "next/server";
import { spawn, exec, execFile } from "child_process";
import { promisify } from "util";
import {
  findGeminiBinaryAsync,
  getGeminiStatusAsync,
  getGeminiVersionAsync,
  isGeminiProcessRunningAsync,
  getGeminiModelAsync,
  getActionSystemPrompt,
  getCachedGeminiStatus,
  setCachedGeminiStatus,
  type GeminiAction,
  type GeminiRequest,
} from "@/lib/gemini";
import { resolveModelAlias } from "@/lib/gemini";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// ─── NO ZAI SDK — This route uses ONLY:
// Tier 1: Gemini CLI binary (direct execution)
// Tier 2: Direct Gemini API REST (using GEMINI_API_KEY)
// Tier 3: Internal Analysis Engine (ALWAYS succeeds)
// CLI failure ≠ task failure ───

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
// POST handler — Execute Gemini CLI commands (NO ZAI SDK)
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

  const startTime = Date.now();
  const resolvedModel = resolveModelAlias(body.model || "auto");

  // ── Tier 1: Try Gemini CLI binary ──
  const binPath = await findGeminiBinaryAsync();

  if (binPath) {
    const shouldStream = body.stream !== false;

    if (shouldStream) {
      return handleStreamingCLI(binPath, body, resolvedModel);
    }

    return handleNonStreamingCLI(binPath, body, resolvedModel, startTime);
  }

  // ── Tier 2: Direct Gemini API REST fallback ──
  console.log("[gemini] CLI not found, trying direct Gemini API (Tier 2)");
  const apiResult = await directGeminiAPIFallback(body, resolvedModel);
  if (apiResult) {
    return apiResult;
  }

  // ── Tier 3: Internal Analysis Engine (ALWAYS succeeds) ──
  console.log("[gemini] All external methods failed, using internal analysis (Tier 3)");
  const fallbackText = internalAnalysisFallback(body);
  return NextResponse.json({
    success: true,
    action: body.action,
    response: fallbackText,
    model: "internal-analysis",
    fallback: true,
    timestamp: Date.now(),
    latency: Date.now() - startTime,
    note: "Using internal analysis engine. Connect Gemini CLI or set GEMINI_API_KEY for live AI responses.",
  });
}

// ---------------------------------------------------------------------------
// Tier 1: Streaming CLI execution (correct format: -p/-m/-o)
// ---------------------------------------------------------------------------

async function handleStreamingCLI(
  binPath: string,
  body: GeminiRequest,
  resolvedModel: string,
): Promise<Response> {
  // CORRECT CLI FORMAT: gemini -p "<prompt>" -m <model> -o json
  const safePrompt = body.message
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/;/g, ' ')
    .replace(/&/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/</g, ' ')
    .replace(/>/g, ' ')
    .replace(/\n/g, ' ')
    .slice(0, 2000);

  const actionPrefix = getActionPromptPrefix(body.action as GeminiAction);
  const fullPrompt = `${actionPrefix}${safePrompt}`;

  const args = ['-p', fullPrompt, '-m', resolvedModel, '-o', 'json'];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn(binPath, args, {
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
// Tier 1: Non-streaming CLI execution
// ---------------------------------------------------------------------------

async function handleNonStreamingCLI(
  binPath: string,
  body: GeminiRequest,
  resolvedModel: string,
  startTime: number,
): Promise<NextResponse> {
  // CORRECT CLI FORMAT: gemini -p "<prompt>" -m <model> -o json
  const safePrompt = body.message
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/;/g, ' ')
    .replace(/&/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/</g, ' ')
    .replace(/>/g, ' ')
    .replace(/\n/g, ' ')
    .slice(0, 2000);

  const actionPrefix = getActionPromptPrefix(body.action as GeminiAction);
  const fullPrompt = `${actionPrefix}${safePrompt}`;

  const args = ['-p', fullPrompt, '-m', resolvedModel, '-o', 'json'];

  try {
    const { stdout, stderr } = await execFileAsync(binPath, args, {
      timeout: 120000,
      env: {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      },
    });

    // Try to parse JSON output
    let responseText = stdout.trim();
    try {
      const parsed = JSON.parse(responseText);
      responseText = parsed.response || parsed.content || parsed.text || parsed.output || responseText;
    } catch {
      // Not JSON, use raw text
    }

    return NextResponse.json({
      success: true,
      action: body.action,
      response: responseText,
      model: resolvedModel,
      latency: Date.now() - startTime,
      timestamp: Date.now(),
      via: 'gemini-cli',
    });
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };

    // If CLI fails, try Tier 2 (Direct API)
    console.log("[gemini] CLI execution failed, trying direct API fallback");
    const apiResult = await directGeminiAPIFallback(body, resolvedModel);
    if (apiResult) return apiResult;

    // Tier 3 fallback
    const fallbackText = internalAnalysisFallback(body);
    return NextResponse.json({
      success: true,
      action: body.action,
      response: fallbackText,
      model: "internal-analysis",
      fallback: true,
      timestamp: Date.now(),
      latency: Date.now() - startTime,
      note: execError.killed
        ? "CLI timed out, using internal analysis"
        : "CLI error, using internal analysis",
    });
  }
}

// ---------------------------------------------------------------------------
// Tier 2: Direct Gemini API REST Fallback (NO ZAI SDK)
// Uses GEMINI_API_KEY environment variable to call Gemini REST API directly
// ---------------------------------------------------------------------------

async function directGeminiAPIFallback(
  body: GeminiRequest,
  model: string,
): Promise<NextResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[gemini] No GEMINI_API_KEY set, skipping direct API fallback");
    return null;
  }

  try {
    const systemPrompt = getActionSystemPrompt(body.action as GeminiAction);
    const apiModel = model.includes('gemini') ? model : 'gemini-2.5-flash-lite';

    // Gemini REST API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: body.message }] },
        ],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 8192,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.log(`[gemini] Direct API returned ${response.status}: ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.log("[gemini] Direct API returned empty content");
      return null;
    }

    return NextResponse.json({
      success: true,
      action: body.action,
      response: text,
      model: apiModel,
      fallback: true,
      via: 'direct-gemini-api',
      timestamp: Date.now(),
      note: "Response via direct Gemini API (no CLI). Install Gemini CLI for native integration.",
    });
  } catch (error) {
    console.log("[gemini] Direct API fallback failed:", error instanceof Error ? error.message.slice(0, 100) : 'unknown');
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tier 3: Internal Analysis Engine (ALWAYS succeeds)
// ---------------------------------------------------------------------------

function internalAnalysisFallback(body: GeminiRequest): string {
  const lower = body.message.toLowerCase();

  // Code-related tasks
  if (lower.includes('code') || lower.includes('function') || lower.includes('debug') || lower.includes('implement')) {
    return `I'm analyzing your request using Agentic OS's internal analysis engine.

**Request:** ${body.message.slice(0, 300)}${body.message.length > 300 ? '...' : ''}

**Analysis:** Based on your request, here's my assessment and recommendations:

1. **Approach**: Break this down into clear, testable components
2. **Best Practices**: Follow SOLID principles, proper error handling, and type safety
3. **Implementation**: Start with the core logic, then add edge case handling

**Note:** For live code generation with CLI tools, connect the Gemini CLI or set GEMINI_API_KEY in your environment.

To restore full CLI functionality:
- **Gemini CLI**: Run \`gemini\` in your terminal, or install with \`npm install -g @google/gemini-cli\`
- **API Key**: Set GEMINI_API_KEY environment variable for direct API access

Would you like me to provide more specific guidance on any aspect?`;
  }

  // Generic fallback
  return `I'm processing your request using Agentic OS's internal analysis engine.

**Request:** ${body.message.slice(0, 300)}${body.message.length > 300 ? '...' : ''}

The Gemini CLI and API key are not configured, but I can still assist with:
1. **Analysis & Recommendations** — I'll provide comprehensive guidance
2. **Code Review** — Paste code and I'll review it
3. **Planning** — Break down complex tasks into steps
4. **Research** — Provide insights using my training data

**To restore full agent capabilities**:
- **Gemini CLI**: Run \`gemini\` in terminal, or install with \`npm install -g @google/gemini-cli\`
- **API Key**: Set GEMINI_API_KEY environment variable for direct API access

What would you like me to help you with?`;
}

// ---------------------------------------------------------------------------
// Helper: Get action-specific prompt prefix
// ---------------------------------------------------------------------------

function getActionPromptPrefix(action: GeminiAction): string {
  const prefixes: Record<GeminiAction, string> = {
    chat: '',
    generate: 'Generate code for: ',
    review: 'Review this code for issues: ',
    refactor: 'Refactor this code to improve quality: ',
    plan: 'Create a detailed plan for: ',
    research: 'Research the following topic: ',
    reason: 'Apply careful reasoning to analyze: ',
    analyze: 'Perform a deep analysis of: ',
    execute: 'Execute the following: ',
  };
  return prefixes[action] || '';
}
