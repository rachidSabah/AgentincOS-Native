// ============================================================
// Agentic OS X — Agents API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { agentRegistry } from '@/lib/agent-runtime';
import type { ExtendedAgentType } from '@/lib/types';

export async function GET() {
  try {
    const agents = agentRegistry.list();
    const stats = agentRegistry.getStatistics();
    const supportedTypes = agentRegistry.getSupportedTypes();
    return NextResponse.json({ agents, stats, supportedTypes });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      type: ExtendedAgentType;
      config?: Record<string, unknown>;
    };

    if (!body.type) {
      return NextResponse.json({ error: 'Agent type is required' }, { status: 400 });
    }

    const validTypes = agentRegistry.getSupportedTypes();
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: `Invalid agent type: ${body.type}. Valid types: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const agent = agentRegistry.spawn(body.type);
    return NextResponse.json({
      agent: agent.getStatus(),
      message: `Agent ${agent.name} spawned successfully`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
