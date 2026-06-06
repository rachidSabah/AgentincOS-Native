// ============================================================
// Agentic OS X — Knowledge API Route
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

export async function GET() {
  try {
    if (!knowledgeEngine) {
      return NextResponse.json({
        documents: [],
        stats: null,
        message: 'Knowledge engine not available',
      });
    }

    const documents = await knowledgeEngine.listDocuments();
    const stats = knowledgeEngine.getStats();

    observabilityEngine.trackMetric('request', 1, { type: 'knowledge_list' });

    return NextResponse.json({
      documents,
      stats,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    observabilityEngine.trackMetric('error', 1, { type: 'knowledge_list', message: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!knowledgeEngine) {
      return NextResponse.json({
        error: 'Knowledge engine not available',
      }, { status: 503 });
    }

    const body = await request.json() as {
      name: string;
      type: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'txt' | 'markdown' | 'json' | 'image' | 'audio' | 'video' | 'url' | 'code';
      content: string;
      source: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    };

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Document name is required' }, { status: 400 });
    }

    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Document content is required' }, { status: 400 });
    }

    if (!body.source || typeof body.source !== 'string') {
      return NextResponse.json({ error: 'Document source is required' }, { status: 400 });
    }

    const startTime = Date.now();

    const document = await knowledgeEngine.ingest({
      name: body.name,
      type: body.type,
      content: body.content,
      source: body.source,
      tags: body.tags ?? [],
      metadata: body.metadata ?? {},
      summary: '', // let the engine generate a summary
    });

    const durationMs = Date.now() - startTime;
    observabilityEngine.trackMetric('latency', durationMs, { type: 'knowledge_ingest' });
    observabilityEngine.trackMetric('request', 1, { type: 'knowledge_ingest' });

    return NextResponse.json({
      document,
      durationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    observabilityEngine.trackMetric('error', 1, { type: 'knowledge_ingest', message: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
