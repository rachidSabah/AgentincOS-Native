// ============================================================
// Agentic OS V2 — Chat API Route (Enhanced)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { brainEngine } from '@/lib/brain-engine';
import { modelRouter } from '@/lib/model-router';
import { memoryEngine } from '@/lib/memory-engine';
import { observabilityEngine } from '@/lib/observability';
import { db } from '@/lib/db';
import type { BrainOverlayType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message: string;
      conversationId?: string;
      workspaceId?: string;
      overlays?: BrainOverlayType[];
      useMultiModel?: boolean;
    };

    const { message, conversationId, workspaceId, overlays, useMultiModel } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Validate overlays if provided
    const validOverlays: BrainOverlayType[] = [
      'default', 'claude', 'hermes', 'research', 'coding',
      'architect', 'analyst', 'devops', 'security', 'business',
      'recruitment', 'aviation', 'custom',
    ];
    const effectiveOverlays = overlays?.filter((o): o is BrainOverlayType =>
      validOverlays.includes(o),
    );

    const startTime = Date.now();

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      // Ensure workspace exists
      const wsId = workspaceId ?? 'default';
      const existingWs = await db.workspace.findUnique({ where: { id: wsId } });
      if (!existingWs) {
        await db.workspace.create({
          data: {
            id: wsId,
            name: wsId === 'default' ? 'Default Workspace' : wsId,
            description: wsId === 'default' ? 'Auto-created default workspace' : undefined,
          },
        });
      }

      const conversation = await db.conversation.create({
        data: {
          workspaceId: wsId,
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

    // Run Brain Engine pipeline (with optional overlays)
    const brainResult = await brainEngine.executePipeline(
      {
        message,
        conversationId: convId,
        workspaceId,
      },
      effectiveOverlays,
    );

    let finalResponse: string;
    let modelProvider: string;
    let tokensUsed: number;
    let multiModelResult: Awaited<ReturnType<typeof modelRouter.executeMultiModel>> | null = null;

    if (useMultiModel) {
      // Multi-model execution: route to multiple providers and merge results
      multiModelResult = await modelRouter.executeMultiModel([
        {
          role: 'primary',
          prompt: message,
          systemPrompt: 'You are Agentic OS, an advanced AI operating system. Be concise, helpful, and actionable.',
        },
        {
          role: 'reviewer',
          prompt: `Review and improve this response for clarity and completeness. Original query: "${message}"`,
          systemPrompt: 'You are a response quality reviewer. Improve clarity and completeness.',
          maxTokens: 1024,
        },
      ]);

      finalResponse = multiModelResult.mergedResponse;
      modelProvider = 'multi-model';
      tokensUsed = multiModelResult.totalTokensUsed;
    } else {
      // Standard single-model execution with failover
      const modelResponse = await modelRouter.executeWithFailover({
        prompt: message,
        systemPrompt: 'You are Agentic OS, an advanced AI operating system. Be concise, helpful, and actionable.',
      });

      finalResponse = modelResponse.success ? modelResponse.content : brainResult.finalResponse;
      modelProvider = modelResponse.provider;
      tokensUsed = modelResponse.tokensUsed;
    }

    // Store assistant message
    await db.message.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: finalResponse,
        metadata: JSON.stringify({
          brainOutputs: brainResult.outputs,
          modelProvider,
          tokensUsed,
          overlays: effectiveOverlays,
          useMultiModel: useMultiModel ?? false,
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

    // Track comprehensive metrics
    const durationMs = Date.now() - startTime;
    observabilityEngine.trackMetric('latency', durationMs, { type: 'chat' });
    observabilityEngine.trackMetric('request', 1, { type: 'chat' });
    observabilityEngine.trackMetric('tokens', tokensUsed, { type: 'chat', provider: modelProvider });
    observabilityEngine.trackMetric('brain_pipeline', brainResult.totalDurationMs, {
      status: brainResult.status,
      overlayCount: effectiveOverlays?.length ?? 0,
    });

    if (useMultiModel && multiModelResult) {
      observabilityEngine.trackMetric('multi_model_latency', multiModelResult.totalLatencyMs, {
        type: 'chat',
        resultCount: multiModelResult.results.length,
      });
    }

    const response: Record<string, unknown> = {
      response: finalResponse,
      conversationId: convId,
      brainResults: brainResult.outputs,
      artifacts: brainResult.artifacts,
      modelProvider,
      tokensUsed,
      durationMs,
      overlays: effectiveOverlays,
      useMultiModel: useMultiModel ?? false,
    };

    if (multiModelResult) {
      response.multiModelResults = multiModelResult.results;
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    observabilityEngine.trackMetric('error', 1, { type: 'chat', message: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
