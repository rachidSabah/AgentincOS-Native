// ============================================================
// Agentic OS V2 — Memory API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { memoryEngine } from '@/lib/memory-engine';
import type { MemoryType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as MemoryType | null;
    const query = searchParams.get('query') ?? undefined;
    const workspaceId = searchParams.get('workspaceId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const memories = await memoryEngine.retrieve({
      type: type ?? undefined,
      query,
      workspaceId: workspaceId ?? undefined,
      limit,
    });

    return NextResponse.json({ memories });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      type: MemoryType;
      content: string;
      summary?: string;
      importance?: number;
      metadata?: Record<string, unknown>;
      workspaceId?: string;
    };

    if (!body.type || !body.content) {
      return NextResponse.json({ error: 'Type and content are required' }, { status: 400 });
    }

    const memory = await memoryEngine.store({
      type: body.type,
      content: body.content,
      summary: body.summary,
      importance: body.importance,
      metadata: body.metadata,
      workspaceId: body.workspaceId,
    });

    return NextResponse.json({ memory });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
