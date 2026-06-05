// ============================================================
// Agentic OS V2 — Artifacts API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { artifactEngine } from '@/lib/artifact-engine';
import type { ArtifactType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') ?? undefined;
    const type = searchParams.get('type') as ArtifactType | null;

    const artifacts = await artifactEngine.list({
      workspaceId: workspaceId ?? undefined,
      type: type ?? undefined,
    });

    return NextResponse.json({ artifacts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name: string;
      type: ArtifactType;
      content: string;
      language?: string;
      workspaceId: string;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.name || !body.type || !body.content) {
      return NextResponse.json({ error: 'Name, type, and content are required' }, { status: 400 });
    }

    const artifact = await artifactEngine.create({
      name: body.name,
      type: body.type,
      content: body.content,
      language: body.language,
      workspaceId: body.workspaceId ?? 'default',
      conversationId: body.conversationId,
      metadata: body.metadata,
    });

    return NextResponse.json({ artifact });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as {
      id: string;
      content: string;
    };

    if (!body.id || !body.content) {
      return NextResponse.json({ error: 'ID and content are required' }, { status: 400 });
    }

    const artifact = await artifactEngine.update(body.id, body.content);
    return NextResponse.json({ artifact });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
