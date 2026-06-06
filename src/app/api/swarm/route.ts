// ============================================================
// Agentic OS X — Swarm API Route (Enhanced)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { swarmEngine } from '@/lib/swarm-engine';
import { observabilityEngine } from '@/lib/observability';
import type { TaskComplexity } from '@/lib/types';

export async function GET() {
  try {
    const activeSwarms = swarmEngine.getActiveSwarms();
    const statistics = swarmEngine.getStatistics();

    // Build swarm map data for all active swarms
    const swarmMaps = activeSwarms.map((swarm) => ({
      swarmId: swarm.id,
      map: swarmEngine.getSwarmMap(swarm.id),
    }));

    observabilityEngine.trackMetric('request', 1, { type: 'swarm_list' });

    return NextResponse.json({
      activeSwarms,
      statistics,
      swarmMaps,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    observabilityEngine.trackMetric('error', 1, { type: 'swarm_list', message: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      task: string;
      complexity?: TaskComplexity;
      workspaceId?: string;
    };

    if (!body.task) {
      return NextResponse.json({ error: 'Task description is required' }, { status: 400 });
    }

    const startTime = Date.now();

    // Auto-form swarm
    const swarm = swarmEngine.autoFormSwarm(body.task, body.complexity);

    // Execute swarm
    const result = await swarmEngine.executeSwarm(swarm.id, body.task);

    // Get swarm map data for the created swarm
    const swarmMap = swarmEngine.getSwarmMap(swarm.id);

    const durationMs = Date.now() - startTime;
    observabilityEngine.trackMetric('latency', durationMs, { type: 'swarm' });
    observabilityEngine.trackMetric('request', 1, { type: 'swarm' });
    observabilityEngine.trackMetric('swarm_active', 0, { swarmId: swarm.id });

    return NextResponse.json({
      swarm,
      result,
      swarmMap,
      durationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    observabilityEngine.trackMetric('error', 1, { type: 'swarm', message: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
