// ============================================================
// Agentic OS V2 — Self-Healing API Route
// GET  /api/self-healing → health status, events, patterns
// POST /api/self-healing → trigger manual healing
// ============================================================
import { NextResponse } from 'next/server';
import { selfHealingEngine } from '@/lib/self-healing';

export async function GET() {
  try {
    const health = selfHealingEngine.getHealthStatus();
    const events = selfHealingEngine.getEvents(50);
    const patterns = selfHealingEngine.getPatterns();
    const healthChecks = selfHealingEngine.getHealthCheckResults();

    return NextResponse.json({
      health,
      events,
      patterns,
      healthChecks,
    });
  } catch (error) {
    console.error('[self-healing] GET error:', error);
    return NextResponse.json(
      {
        health: {
          totalEvents: 0,
          resolvedEvents: 0,
          unresolvedEvents: 0,
          recentErrors: 0,
          avgRecoveryMs: 0,
          topCategories: [],
          topStrategies: [],
          componentHealth: [],
        },
        events: [],
        patterns: [],
        healthChecks: [],
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { error, componentId, componentType } = body as {
      error: string;
      componentId?: string;
      componentType?: string;
    };

    if (!error || typeof error !== 'string' || error.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid "error" field. Provide a non-empty string.' },
        { status: 400 }
      );
    }

    const event = await selfHealingEngine.heal(error, componentId, componentType);

    return NextResponse.json({ event });
  } catch (err) {
    console.error('[self-healing] POST error:', err);
    return NextResponse.json(
      { error: 'Healing pipeline failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
