import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpoint,
  isHermesRunning,
  getHermesModel,
} from "@/lib/hermes";

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

  const apiEndpoint = getHermesApiEndpoint();
  const isRunning = await isHermesRunning(apiEndpoint);

  if (!isRunning) {
    return NextResponse.json(
      {
        error: "Hermes API server is not running",
        hint: "Start Hermes with 'hermes gateway' or check your configuration",
      },
      { status: 503 },
    );
  }

  // Resolve the model name
  const model = body.model ?? getHermesModel() ?? "default";
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
      const upstream = await fetch(
        `${apiEndpoint}/v1/chat/completions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!upstream.ok) {
        const errorText = await upstream.text().catch(() => "Unknown error");
        return NextResponse.json(
          {
            error: `Hermes API returned ${upstream.status}`,
            details: errorText,
          },
          { status: upstream.status },
        );
      }

      if (!upstream.body) {
        return NextResponse.json(
          { error: "Hermes API returned empty body" },
          { status: 502 },
        );
      }

      // Forward the SSE stream from Hermes directly to the client.
      // We use a TransformStream to avoid holding the response hostage.
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transform = new TransformStream({
        async transform(chunk, controller) {
          // Pass through the raw SSE bytes
          controller.enqueue(chunk);

          // We could also parse the SSE events here for logging/metrics,
          // but for a simple proxy pass-through is sufficient.
          void decoder; // used implicitly
          void encoder; // kept for potential future use
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
      return NextResponse.json(
        {
          error: "Failed to connect to Hermes streaming API",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 502 },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Non-streaming response
  // ---------------------------------------------------------------------------

  try {
    const upstream = await fetch(`${apiEndpoint}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "Unknown error");
      return NextResponse.json(
        {
          error: `Hermes API returned ${upstream.status}`,
          details: errorText,
        },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to connect to Hermes API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
