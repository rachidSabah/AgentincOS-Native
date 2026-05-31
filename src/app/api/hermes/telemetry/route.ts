import { NextRequest, NextResponse } from 'next/server';
import { hermesTelemetry } from '@/lib/hermes';

// ---------------------------------------------------------------------------
// GET /api/hermes/telemetry — Return real-time performance metrics
// ---------------------------------------------------------------------------

export async function GET() {
  const metrics = hermesTelemetry.getMetrics();
  return NextResponse.json(metrics);
}

// ---------------------------------------------------------------------------
// POST /api/hermes/telemetry — Reset telemetry counters
// Body: { action: 'reset' }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'reset') {
      hermesTelemetry.reset();
      return NextResponse.json({
        success: true,
        message: 'Telemetry counters reset.',
        metrics: hermesTelemetry.getMetrics(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action. Use { action: 'reset' }." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 },
    );
  }
}
