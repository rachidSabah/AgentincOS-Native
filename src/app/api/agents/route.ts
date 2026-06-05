// ============================================================
// Agentic OS V2 — Agents API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { agentRegistry } from '@/lib/agent-runtime';
import type { AgentType } from '@/lib/types';

export async function GET() {
  try {
    const agents = agentRegistry.list();
    return NextResponse.json({ agents });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      type: AgentType;
      config?: Record<string, unknown>;
    };

    if (!body.type) {
      return NextResponse.json({ error: 'Agent type is required' }, { status: 400 });
    }

    const validTypes: AgentType[] = ['planner', 'architect', 'researcher', 'coder', 'reviewer', 'verifier', 'memory'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: `Invalid agent type: ${body.type}` }, { status: 400 });
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
