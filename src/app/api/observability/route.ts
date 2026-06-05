// ============================================================
// Agentic OS V2 — Observability API Route
// ============================================================
import { NextResponse } from 'next/server';
import { observabilityEngine } from '@/lib/observability';

export async function GET() {
  try {
    const systemHealth = observabilityEngine.getSystemHealth();
    const activeAgents = observabilityEngine.getActiveAgents();
    const providerHealth = observabilityEngine.getProviderHealth();
    const latency = observabilityEngine.getLatency();
    const errorRate = observabilityEngine.getErrorRate();
    const memoryUsage = observabilityEngine.getMemoryUsage();
    const swarmActivity = observabilityEngine.getSwarmActivity();

    // Get recent metric history for charts
    const latencyHistory = observabilityEngine.getMetricHistory('latency', 30);
    const errorHistory = observabilityEngine.getMetricHistory('error', 30);
    const requestHistory = observabilityEngine.getMetricHistory('request', 30);

    return NextResponse.json({
      systemHealth,
      activeAgents,
      providerHealth,
      latency,
      errorRate,
      memoryUsage,
      swarmActivity,
      charts: {
        latency: latencyHistory.map((m) => ({ time: m.timestamp, value: m.value })),
        errors: errorHistory.map((m) => ({ time: m.timestamp, value: m.value })),
        requests: requestHistory.map((m) => ({ time: m.timestamp, value: m.value })),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
