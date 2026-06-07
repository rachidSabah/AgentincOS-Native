// ============================================================
// AgenticOS-V2 — Audit Logging Engine
// Comprehensive audit trail for authentication, authorization,
// data access, system events, and security events
// ============================================================

import { db } from './db';

// ─── Types ─────────────────────────────────────────────────

export type AuditCategory =
  | 'auth'       // Authentication events (login, logout, MFA, SSO)
  | 'authz'      // Authorization events (permission checks, role changes)
  | 'data'       // Data access (CRUD on resources)
  | 'system'     // System events (kernel start/stop, config changes)
  | 'security';  // Security events (failed auth, suspicious activity, encryption)

export interface AuditEvent {
  action: string;
  resource: string;
  result: string;
  userId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  result: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  category: AuditCategory;
}

export interface AuditFilter {
  from?: Date;
  to?: Date;
  userId?: string;
  action?: string;
  resource?: string;
  category?: AuditCategory;
  result?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsByAction: Record<string, number>;
  eventsByResult: Record<string, number>;
  failedAuthAttempts: number;
  uniqueUsers: number;
  topUsers: Array<{ userId: string; eventCount: number }>;
  timeline: Array<{ date: string; count: number }>;
  period: { from: Date; to: Date };
}

// ─── Category Classification ───────────────────────────────

const ACTION_CATEGORY_MAP: Record<string, AuditCategory> = {
  // Auth events
  'auth.login': 'auth',
  'auth.logout': 'auth',
  'auth.change_password': 'auth',
  'auth.reset_password': 'auth',
  'auth.mfa_enable': 'auth',
  'auth.mfa_disable': 'auth',
  'auth.mfa_verify': 'auth',
  'auth.sso_initiate': 'auth',
  'auth.sso_callback': 'auth',

  // Authorization events
  'authz.check': 'authz',
  'authz.grant_role': 'authz',
  'authz.revoke_role': 'authz',
  'authz.create_role': 'authz',
  'authz.delete_role': 'authz',

  // Data access events
  'data.read': 'data',
  'data.create': 'data',
  'data.update': 'data',
  'data.delete': 'data',

  // System events
  'system.start': 'system',
  'system.stop': 'system',
  'system.config_change': 'system',
  'system.health_check': 'system',

  // Security events
  'security.failed_auth': 'security',
  'security.suspicious_activity': 'security',
  'security.encryption_operation': 'security',
  'security.key_rotation': 'security',
  'security.rate_limit_exceeded': 'security',
};

function classifyAction(action: string): AuditCategory {
  // Direct match
  if (ACTION_CATEGORY_MAP[action]) {
    return ACTION_CATEGORY_MAP[action];
  }

  // Prefix-based classification
  if (action.startsWith('auth.')) return 'auth';
  if (action.startsWith('authz.')) return 'authz';
  if (action.startsWith('data.') || action.includes('.create') || action.includes('.update') || action.includes('.delete')) return 'data';
  if (action.startsWith('system.') || action.startsWith('kernel.')) return 'system';
  if (action.startsWith('security.')) return 'security';

  // Resource-based classification
  if (action.startsWith('user.')) return 'data';

  return 'system'; // Default fallback
}

// ─── Audit Engine ──────────────────────────────────────────

class AuditEngine {
  private buffer: AuditEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds
  private readonly MAX_BUFFER_SIZE = 100;
  private initialized = false;

  // ─── Initialization ────────────────────────────────────

  /**
   * Initialize the audit engine and start the flush interval.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        console.error('[audit] Flush error:', err);
      });
    }, this.FLUSH_INTERVAL_MS);

    this.initialized = true;
    console.log('[audit] Engine initialized');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ─── Logging ───────────────────────────────────────────

  /**
   * Log an audit event. Events are buffered and flushed periodically.
   */
  async log(event: AuditEvent): Promise<void> {
    await this.ensureInitialized();

    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: event.userId ?? null,
      action: event.action,
      resource: event.resource,
      result: event.result,
      details: event.details ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      timestamp: new Date(),
      category: classifyAction(event.action),
    };

    this.buffer.push(entry);

    // Flush immediately if buffer is full
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      await this.flush();
    }
  }

  /**
   * Flush buffered audit entries to the database.
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    // Swap buffer to prevent concurrent writes
    const entries = this.buffer.splice(0, this.buffer.length);

    try {
      // Batch write to DB
      for (const entry of entries) {
        await db.auditLog.create({
          data: {
            id: entry.id,
            userId: entry.userId,
            action: entry.action,
            resource: entry.resource,
            result: entry.result,
            details: entry.details,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            timestamp: entry.timestamp,
          },
        });
      }
    } catch (err) {
      console.warn('[audit] Failed to flush to DB, entries may be lost:', err);
      // In production, you might write to a fallback file
    }
  }

  // ─── Querying ──────────────────────────────────────────

  /**
   * Query audit logs with filters.
   */
  async query(filter: AuditFilter): Promise<AuditEntry[]> {
    await this.ensureInitialized();
    await this.flush(); // Ensure all buffered entries are written

    try {
      const where: Record<string, unknown> = {};

      if (filter.userId) where.userId = filter.userId;
      if (filter.action) where.action = { contains: filter.action };
      if (filter.resource) where.resource = filter.resource;
      if (filter.result) where.result = filter.result;

      if (filter.from || filter.to) {
        where.timestamp = {};
        if (filter.from) (where.timestamp as Record<string, unknown>).gte = filter.from;
        if (filter.to) (where.timestamp as Record<string, unknown>).lte = filter.to;
      }

      const results = await db.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
      });

      return results.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        action: r.action,
        resource: r.resource,
        result: r.result,
        details: r.details,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        timestamp: r.timestamp,
        category: classifyAction(r.action),
      }));
    } catch (err) {
      console.warn('[audit] Failed to query from DB:', err);
      return [];
    }
  }

  // ─── Export ────────────────────────────────────────────

  /**
   * Export audit logs in JSON or CSV format.
   */
  async export(filter: AuditFilter, format: 'json' | 'csv'): Promise<string> {
    const entries = await this.query({ ...filter, limit: filter.limit ?? 10000 });

    if (format === 'csv') {
      return this.exportCSV(entries);
    }

    return JSON.stringify(entries, null, 2);
  }

  /**
   * Export audit entries as CSV.
   */
  private exportCSV(entries: AuditEntry[]): string {
    const headers = ['id', 'timestamp', 'userId', 'action', 'resource', 'result', 'category', 'ipAddress', 'details'];
    const rows = entries.map((entry) =>
      headers.map((h) => {
        const val = entry[h as keyof AuditEntry];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape CSV values containing commas or quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ─── Statistics ────────────────────────────────────────

  /**
   * Get audit statistics since a given date.
   */
  async getStats(since: Date): Promise<AuditStats> {
    await this.ensureInitialized();
    await this.flush();

    try {
      const entries = await db.auditLog.findMany({
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: 'desc' },
      });

      const byCategory: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      const byResult: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      const dayCounts: Record<string, number> = {};
      let failedAuth = 0;

      for (const entry of entries) {
        const e = entry as any;
        const category = classifyAction(e.action);

        byCategory[category] = (byCategory[category] ?? 0) + 1;
        byAction[e.action] = (byAction[e.action] ?? 0) + 1;
        byResult[e.result] = (byResult[e.result] ?? 0) + 1;

        if (e.userId) {
          userCounts[e.userId] = (userCounts[e.userId] ?? 0) + 1;
        }

        // Count failed auth
        if (e.action === 'auth.login' && e.result === 'denied') {
          failedAuth++;
        }

        // Timeline by day
        const day = new Date(e.timestamp).toISOString().slice(0, 10);
        dayCounts[day] = (dayCounts[day] ?? 0) + 1;
      }

      const topUsers = Object.entries(userCounts)
        .map(([userId, eventCount]) => ({ userId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      const timeline = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalEvents: entries.length,
        eventsByCategory: byCategory,
        eventsByAction: byAction,
        eventsByResult: byResult,
        failedAuthAttempts: failedAuth,
        uniqueUsers: Object.keys(userCounts).length,
        topUsers,
        timeline,
        period: { from: since, to: new Date() },
      };
    } catch (err) {
      console.warn('[audit] Failed to get stats from DB:', err);
      return {
        totalEvents: 0,
        eventsByCategory: {},
        eventsByAction: {},
        eventsByResult: {},
        failedAuthAttempts: 0,
        uniqueUsers: 0,
        topUsers: [],
        timeline: [],
        period: { from: since, to: new Date() },
      };
    }
  }

  // ─── Maintenance ──────────────────────────────────────

  /**
   * Rotate the audit log (archive current entries).
   * In production, this would move old entries to cold storage.
   */
  async rotate(): Promise<void> {
    await this.ensureInitialized();
    await this.flush();

    console.log('[audit] Log rotation completed (no-op in current implementation)');
    // In production, this would:
    // 1. Export entries older than a threshold
    // 2. Move them to cold storage (S3, GCS, etc.)
    // 3. Delete them from the primary DB
  }

  /**
   * Purge audit entries older than the specified date.
   * Returns the number of deleted entries.
   */
  async purge(before: Date): Promise<number> {
    await this.ensureInitialized();
    await this.flush();

    try {
      const result = await db.auditLog.deleteMany({
        where: { timestamp: { lt: before } },
      });
      console.log(`[audit] Purged ${result.count} entries before ${before.toISOString()}`);
      return result.count;
    } catch (err) {
      console.warn('[audit] Failed to purge from DB:', err);
      return 0;
    }
  }

  /**
   * Shutdown the audit engine, flushing any remaining entries.
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();
    this.initialized = false;
  }
}

// ─── Singleton Export ───
export const auditEngine = new AuditEngine();
