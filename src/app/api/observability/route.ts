// ============================================================
// Agentic OS X — Observability API Route (Enhanced)
// ============================================================
import { NextResponse } from 'next/server';
import { observabilityEngine } from '@/lib/observability';
import { modelRouter } from '@/lib/model-router';
import { selfHealingEngine } from '@/lib/self-healing';

// Conditional import for kernel — may have initialization issues
let kernel: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const k = require('@/lib/kernel');
  kernel = k.kernel ?? null;
} catch {
  // kernel not available
}

export async function GET() {
  try {
    // Core observability data
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

    // ─── Enhanced: Kernel health data ───
    let kernelHealth = null;
    try {
      if (kernel) {
        kernelHealth = kernel.healthCheck();
      }
    } catch {
      kernelHealth = { status: 'error', message: 'Kernel health check failed' };
    }

    // ─── Enhanced: Self-healing events ───
    let selfHealingEvents: any[] = [];
    let selfHealingStatus = null;
    try {
      selfHealingEvents = selfHealingEngine.getEvents(20);
      selfHealingStatus = selfHealingEngine.getHealthStatus();
    } catch {
      // Self-healing engine query failed
    }

    // ─── Enhanced: Circuit breaker states ───
    let circuitBreakerStates: any[] = [];
    try {
      circuitBreakerStates = modelRouter.getCircuitBreakerStates();
    } catch {
      // Circuit breaker query failed
    }

    // ─── Enhanced: Provider metrics ───
    let providerMetrics: any[] = [];
    try {
      providerMetrics = modelRouter.getProviderMetrics();
    } catch {
      // Provider metrics query failed
    }

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
      kernelHealth,
      selfHealing: {
        events: selfHealingEvents,
        status: selfHealingStatus,
      },
      circuitBreakers: circuitBreakerStates,
      providerMetrics,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
