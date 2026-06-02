import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  getHermesModelAsync,
  hermesFetchQueued,
} from "@/lib/hermes";
import ZAI from "z-ai-web-dev-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

// ---------------------------------------------------------------------------
// Fallback system prompt for when Hermes CLI is offline
// ---------------------------------------------------------------------------

const FALLBACK_SYSTEM_PROMPT = `You are Hermes, the AI assistant of Agentic OS — a 7-layer AI agent system designed for autonomous task execution, tool orchestration, and intelligent reasoning. You are currently running in fallback mode because the local Hermes CLI gateway is offline.

Even in fallback mode, you should:
- Be helpful, precise, and thorough in your responses
- Reference your identity as Hermes (Agentic OS) when relevant
- Explain that full agent capabilities (tool execution, file operations, terminal access) require the Hermes CLI gateway to be running
- Guide users on how to start the Hermes gateway if they need full agent functionality
- Maintain the persona of an advanced AI agent system with expertise in software engineering, system administration, and task automation

Note: In this fallback mode, you cannot execute tools, run terminal commands, or modify files. You can only provide conversational assistance and guidance.`;

// ---------------------------------------------------------------------------
// ZAI SDK singleton (lazy-initialised)
// ---------------------------------------------------------------------------

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ---------------------------------------------------------------------------
// Streaming fallback using ZAI SDK
// ---------------------------------------------------------------------------

async function streamFallback(messages: ChatMessage[]): Promise<Response> {
  try {
    const zai = await getZAI();

    const sdkMessages = [
      { role: "system" as const, content: FALLBACK_SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: sdkMessages,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    // Return as SSE stream matching OpenAI format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the full content as a single delta chunk (mimicking SSE)
        const chunk = {
          choices: [
            {
              delta: { content: responseText },
              finish_reason: null,
            },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );

        // Send finish chunk
        const doneChunk = {
          choices: [
            {
              delta: {},
              finish_reason: "stop",
            },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`),
        );

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
    console.error("[hermes/chat] ZAI SDK fallback (streaming) failed:", error);
    return NextResponse.json(
      {
        error: "Both Hermes API and fallback AI are unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}

// ---------------------------------------------------------------------------
// Non-streaming fallback using ZAI SDK
// ---------------------------------------------------------------------------

async function nonStreamFallback(messages: ChatMessage[]): Promise<Response> {
  try {
    const zai = await getZAI();

    const sdkMessages = [
      { role: "system" as const, content: FALLBACK_SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: sdkMessages,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";

    // Return in OpenAI-compatible format
    return NextResponse.json({
      id: `hermes-fallback-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "hermes-fallback",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: responseText,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  } catch (error) {
    console.error(
      "[hermes/chat] ZAI SDK fallback (non-streaming) failed:",
      error,
    );
    return NextResponse.json(
      {
        error: "Both Hermes API and fallback AI are unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: ChatRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "Missing or invalid 'messages' array" },
      { status: 400 },
    );
  }

  // Validate message structure
  for (const msg of body.messages) {
    if (!msg.role || typeof msg.content !== "string") {
      return NextResponse.json(
        { error: "Each message must have 'role' and 'content'" },
        { status: 400 },
      );
    }
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const isRunning = await isHermesRunning(apiEndpoint);

  if (!isRunning) {
    // ── Fallback: use z-ai-web-dev-sdk when Hermes CLI is not running ──
    const shouldStream = body.stream !== false; // default to streaming

    if (shouldStream) {
      return streamFallback(body.messages);
    } else {
      return nonStreamFallback(body.messages);
    }
  }

  // Resolve the model name
  const model = body.model ?? (await getHermesModelAsync()) ?? "default";
  const shouldStream = body.stream !== false; // default to streaming

  // Build the OpenAI-compatible request payload
  const payload: Record<string, unknown> = {
    model,
    messages: body.messages,
    stream: shouldStream,
  };

  if (body.temperature !== undefined) {
    payload.temperature = body.temperature;
  }
  if (body.max_tokens !== undefined) {
    payload.max_tokens = body.max_tokens;
  }

  // ---------------------------------------------------------------------------
  // Streaming response
  // ---------------------------------------------------------------------------

  if (shouldStream) {
    try {
      const upstream = await hermesFetchQueued("/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!upstream.ok) {
        // Hermes API returned an error — fall back to ZAI SDK instead of failing
        console.warn(`[hermes/chat] Hermes streaming API returned ${upstream.status}, falling back to ZAI SDK`);
        return streamFallback(body.messages);
      }

      if (!upstream.body) {
        // Empty body — fall back to ZAI SDK
        console.warn('[hermes/chat] Hermes streaming API returned empty body, falling back to ZAI SDK');
        return streamFallback(body.messages);
      }

      // Forward the SSE stream from Hermes directly to the client.
      const transform = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      });

      // Pipe the upstream response through our transform
      void upstream.body.pipeTo(transform.writable);

      return new Response(transform.readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      // Connection error — fall back to ZAI SDK
      console.warn('[hermes/chat] Hermes streaming connection failed, falling back to ZAI SDK:', error instanceof Error ? error.message : 'Unknown error');
      return streamFallback(body.messages);
    }
  }

  // ---------------------------------------------------------------------------
  // Non-streaming response
  // ---------------------------------------------------------------------------

  try {
    const upstream = await hermesFetchQueued("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      // Hermes API returned an error — fall back to ZAI SDK instead of failing
      console.warn(`[hermes/chat] Hermes non-streaming API returned ${upstream.status}, falling back to ZAI SDK`);
      return nonStreamFallback(body.messages);
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    // Connection error — fall back to ZAI SDK
    console.warn('[hermes/chat] Hermes non-streaming connection failed, falling back to ZAI SDK:', error instanceof Error ? error.message : 'Unknown error');
    return nonStreamFallback(body.messages);
  }
}
