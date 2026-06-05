// ============================================================
// Agentic OS V2 — Models API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { modelRouter } from '@/lib/model-router';
import { db } from '@/lib/db';
import type { ModelProviderType } from '@/lib/types';

export async function GET() {
  try {
    const providerHealth = modelRouter.getProviderHealth();
    const scores = modelRouter.scoreProviders();

    const providers: Array<{
      provider: ModelProviderType;
      healthy: boolean;
      latencyMs: number;
      successRate: number;
      score: number;
      priority: number;
    }> = scores.map((s) => ({
      provider: s.provider,
      healthy: s.health.healthy,
      latencyMs: s.health.latencyMs,
      successRate: s.health.successRate,
      score: s.score,
      priority: s.priority,
    }));

    // Get DB providers for config info
    const dbProviders = await db.modelProvider.findMany({
      orderBy: { priority: 'asc' },
    });

    return NextResponse.json({
      providers,
      dbProviders,
      selectedModel: modelRouter.selectModel(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name: string;
      provider: ModelProviderType;
      apiKey?: string;
      baseUrl?: string;
      enabled?: boolean;
      priority?: number;
      config?: Record<string, unknown>;
    };

    if (!body.name || !body.provider) {
      return NextResponse.json({ error: 'Name and provider are required' }, { status: 400 });
    }

    const provider = await db.modelProvider.create({
      data: {
        name: body.name,
        provider: body.provider,
        apiKey: body.apiKey ?? null,
        baseUrl: body.baseUrl ?? null,
        enabled: body.enabled ?? true,
        priority: body.priority ?? 0,
        config: body.config ? JSON.stringify(body.config) : null,
      },
    });

    return NextResponse.json({ provider });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
