// ============================================================
// Agentic OS V2 — Chat API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { brainEngine } from '@/lib/brain-engine';
import { modelRouter } from '@/lib/model-router';
import { memoryEngine } from '@/lib/memory-engine';
import { observabilityEngine } from '@/lib/observability';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message: string;
      conversationId?: string;
      workspaceId?: string;
    };

    const { message, conversationId, workspaceId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const startTime = Date.now();

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await db.conversation.create({
        data: {
          workspaceId: workspaceId ?? 'default',
          title: message.slice(0, 50),
        },
      });
      convId = conversation.id;
    }

    // Store user message
    await db.message.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message,
      },
    });

    // Run Brain Engine pipeline
    const brainResult = await brainEngine.executePipeline({
      message,
      conversationId: convId,
      workspaceId,
    });

    // Use model router for AI response
    const modelResponse = await modelRouter.executeWithFailover({
      prompt: message,
      systemPrompt: 'You are Agentic OS, an advanced AI operating system. Be concise, helpful, and actionable.',
    });

    // Use the model response if successful, otherwise use brain pipeline response
    const finalResponse = modelResponse.success ? modelResponse.content : brainResult.finalResponse;

    // Store assistant message
    await db.message.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: finalResponse,
        metadata: JSON.stringify({
          brainOutputs: brainResult.outputs,
          modelProvider: modelResponse.provider,
          tokensUsed: modelResponse.tokensUsed,
        }),
      },
    });

    // Store in memory
    await memoryEngine.store({
      type: 'session',
      content: `User: ${message}\nAssistant: ${finalResponse.slice(0, 200)}`,
      summary: message.slice(0, 100),
      importance: 0.6,
      workspaceId,
    });

    // Track metrics
    const durationMs = Date.now() - startTime;
    observabilityEngine.trackMetric('latency', durationMs, { type: 'chat' });
    observabilityEngine.trackMetric('request', 1, { type: 'chat' });

    return NextResponse.json({
      response: finalResponse,
      conversationId: convId,
      brainResults: brainResult.outputs,
      artifacts: brainResult.artifacts,
      modelProvider: modelResponse.provider,
      tokensUsed: modelResponse.tokensUsed,
      durationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    observabilityEngine.trackMetric('error', 1, { type: 'chat', message: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
