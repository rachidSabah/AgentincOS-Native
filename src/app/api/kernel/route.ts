// ============================================================
// Agentic OS V2 — Kernel API Route
// ============================================================
import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel';

export async function GET() {
  try {
    const health = kernel.healthCheck();
    const recentEvents = kernel.eventBus.getEventLog(20);
    const tasks = kernel.scheduler.getTasks();

    return NextResponse.json({
      status: health.status,
      uptime: health.uptime,
      totalEvents: health.totalEvents,
      activeTasks: health.activeTasks,
      registryCounts: health.registryCounts,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      activeModelProvider: 'openai',
      agentCount: health.registryCounts.agents,
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp,
      })),
      scheduledTasks: tasks.slice(0, 10).map((t) => ({
        id: t.id,
        name: t.name,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        error: t.error,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'stopped',
        uptime: 0,
        totalEvents: 0,
        activeTasks: 0,
        registryCounts: { agents: 0, brains: 0, models: 0, tools: 0, skills: 0, artifacts: 0 },
        memoryUsage: 0,
        activeModelProvider: 'none',
        agentCount: 0,
        recentEvents: [],
        scheduledTasks: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'init') {
      await kernel.init();
      return NextResponse.json({ success: true, status: kernel.status });
    }

    if (action === 'shutdown') {
      await kernel.shutdown();
      return NextResponse.json({ success: true, status: kernel.status });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
