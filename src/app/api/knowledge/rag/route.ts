// ============================================================
// Agentic OS X — Knowledge RAG API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { observabilityEngine } from '@/lib/observability';

// Conditional import for knowledge engine — may not be initialized
let knowledgeEngine: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ke = require('@/lib/knowledge-engine');
  knowledgeEngine = ke.knowledgeEngine ?? null;
} catch {
  // knowledge-engine not available
}

export async function POST(request: NextRequest) {
  try {
    if (!knowledgeEngine) {
      return NextResponse.json({
        error: 'Knowledge engine not available',
      }, { status: 503 });
    }

    const body = await request.json() as {
      query: string;
      topK?: number;
      sources?: string[];
      tags?: string[];
    };

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const startTime = Date.now();

    const result = await knowledgeEngine.ragQuery(body.query, {
      topK: body.topK,
      sources: body.sources,
      tags: body.tags,
    });

    const durationMs = Date.now() - startTime;
    observabilityEngine.trackMetric('latency', durationMs, { type: 'knowledge_rag' });
    observabilityEngine.trackMetric('request', 1, { type: 'knowledge_rag' });

    return NextResponse.json({
      ...result,
      durationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    observabilityEngine.trackMetric('error', 1, { type: 'knowledge_rag', message: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
