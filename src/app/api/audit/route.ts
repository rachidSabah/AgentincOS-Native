// ============================================================
// AgenticOS-V2 — Audit API Route
// Query, export, and analyze audit logs
// ============================================================

import { NextResponse } from 'next/server';
import { auditEngine, type AuditCategory } from '@/lib/audit-engine';
import { authEngine } from '@/lib/auth-engine';
import { rbacEngine } from '@/lib/rbac-engine';

// ─── Helper: Authenticate & Authorize ─────────────────────

async function authenticateRequest(request: Request): Promise<{ userId: string } | NextResponse> {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') ?? request.headers.get('x-session-id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required. Provide sessionId query param or x-session-id header.' },
      { status: 401 }
    );
  }

  const session = await authEngine.validateSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: 'Session invalid or expired' },
      { status: 401 }
    );
  }

  const hasPermission = await rbacEngine.checkPermission(session.userId, 'settings', 'read');
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Insufficient permissions to view audit logs' },
      { status: 403 }
    );
  }

  return { userId: session.userId };
}

// ─── GET: Query Audit Logs ────────────────────────────────

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);

    // Parse filters
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const resource = searchParams.get('resource') ?? undefined;
    const category = searchParams.get('category') as AuditCategory | undefined;
    const result = searchParams.get('result') ?? undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    // Check for special endpoints
    const path = new URL(request.url).pathname;

    // ─── Stats endpoint ──────────────────────────────────
    if (path.endsWith('/stats')) {
      const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const stats = await auditEngine.getStats(since);
      return NextResponse.json(stats);
    }

    // ─── Export endpoint ─────────────────────────────────
    if (path.endsWith('/export')) {
      const format = (searchParams.get('format') ?? 'json') as 'json' | 'csv';
      if (format !== 'json' && format !== 'csv') {
        return NextResponse.json(
          { error: 'format must be "json" or "csv"' },
          { status: 400 }
        );
      }

      const data = await auditEngine.export(
        { from, to, userId, action, resource, category, result, limit: limit > 10000 ? 10000 : limit },
        format
      );

      if (format === 'csv') {
        return new NextResponse(data, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return new NextResponse(data, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // ─── Default: Query audit logs ───────────────────────
    const entries = await auditEngine.query({
      from,
      to,
      userId,
      action,
      resource,
      category,
      result,
      limit: Math.min(limit, 500),
      offset,
    });

    return NextResponse.json({
      entries,
      count: entries.length,
      filters: { from, to, userId, action, resource, category, result, limit, offset },
    });
  } catch (error) {
    console.error('[audit-api] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
