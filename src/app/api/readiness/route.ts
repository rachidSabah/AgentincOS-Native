// ============================================================
// Agentic OS — Readiness Validation API Route
// ============================================================
// GET  /api/readiness       → returns the most recent report (fast)
// POST /api/readiness       → { action: 'validate' } runs full validation
// ============================================================

import { NextResponse } from 'next/server';
import { readinessValidator } from '@/lib/readiness-validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/readiness
 * Returns the most recently cached readiness report.
 * If no validation has been run yet, returns a placeholder.
 */
export async function GET() {
  try {
    const lastReport = readinessValidator.getLastReport();

    if (lastReport) {
      return NextResponse.json(lastReport);
    }

    // No report yet — return a not-run-yet indicator
    return NextResponse.json({
      timestamp: Date.now(),
      passed: false,
      message: 'No readiness report available yet. POST with { action: "validate" } to run validation.',
      agentChecks: [],
      swarmChecks: [],
      systemChecks: {
        noMemoryLeaks: false,
        noZombieProcesses: false,
        noOrphanAgents: false,
      },
      performanceChecks: {
        coldStartMs: 0,
        dashboardLoadMs: 0,
        agentSpawnMs: 0,
        swarmSpawnMs: 0,
        memoryQueryMs: 0,
        artifactPreviewMs: 0,
        apiResponseMs: 0,
      },
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve readiness report', details: message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/readiness
 * Body: { action: 'validate' }
 * Runs the full validation suite and returns the report.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body?.action !== 'validate') {
      return NextResponse.json(
        { error: 'Invalid action. Expected { action: "validate" }' },
        { status: 400 },
      );
    }

    const report = await readinessValidator.validateAll();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Validation failed', details: message },
      { status: 500 },
    );
  }
}
