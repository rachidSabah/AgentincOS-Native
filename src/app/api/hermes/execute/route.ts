import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  isHermesRunning,
  getHermesModelAsync,
  hermesFetchQueued,
} from "@/lib/hermes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExecuteRequest {
  skill: string;
  args?: Record<string, unknown>;
  sessionId?: string;
  stream?: boolean;
}

// ---------------------------------------------------------------------------
// POST handler — Execute a skill through Hermes API
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: ExecuteRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.skill || typeof body.skill !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'skill' string" },
      { status: 400 },
    );
  }

  const apiEndpoint = getHermesApiEndpointCached();
  const running = await isHermesRunning(apiEndpoint);

  if (!running) {
    return NextResponse.json(
      {
        error: "Hermes API server is not running",
        hint: "Start Hermes with 'hermes gateway' or check your configuration",
      },
      { status: 503 },
    );
  }

  const model = await getHermesModelAsync() ?? "default";
  const shouldStream = body.stream !== false;

  // Build the tool execution payload
  // Use chat completions with tool_calls format for skill execution
  const payload: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "system",
        content: `Execute the skill "${body.skill}" with the provided arguments. Return the results directly.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          skill: body.skill,
          args: body.args ?? {},
          sessionId: body.sessionId,
        }),
      },
    ],
    stream: shouldStream,
    tools: [
      {
        type: "function",
        function: {
          name: body.skill,
          description: `Execute the ${body.skill} skill`,
          parameters: {
            type: "object",
            properties: body.args
              ? Object.fromEntries(
                  Object.entries(body.args).map(([k, v]) => [
                    k,
                    { type: typeof v === "number" ? "number" : "string", default: v },
                  ]),
                )
              : {},
          },
        },
      },
    ],
  };

  if (shouldStream) {
    try {
      const upstream = await hermesFetchQueued("/v1/chat/completions", {
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

      if (!upstream.body) {
        return NextResponse.json(
          { error: "Hermes API returned empty body" },
          { status: 502 },
        );
      }

      const transform = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      });

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
          error: "Failed to execute skill via Hermes API",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 502 },
      );
    }
  }

  // Non-streaming response
  try {
    const upstream = await hermesFetchQueued("/v1/chat/completions", {
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

    // Try to extract tool call results
    const choice = data.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;
    const content = choice?.message?.content;

    return NextResponse.json({
      success: true,
      skill: body.skill,
      result: toolCalls?.[0]?.function?.arguments
        ? JSON.parse(toolCalls[0].function.arguments)
        : content ?? data,
      raw: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to execute skill via Hermes API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
