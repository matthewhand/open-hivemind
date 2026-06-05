import Debug from 'debug';
import type { IDatabase as Database } from '../types';

const debug = Debug('app:AuditEventRepository');

/**
 * A persisted audit event. Mirrors the in-memory `AuditLogEntry` shape used by
 * the audit logging middleware so callers can durably store and replay the
 * request/security audit trail across restarts.
 */
export interface AuditEventRecord {
  timestamp: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  ip: string;
  userAgent: string;
  before?: unknown;
  after?: unknown;
  status: 'success' | 'failure';
  errorMessage?: string;
}

/**
 * Filters for querying persisted audit events. Mirrors the in-memory query API
 * exposed by `AuditLoggerService` so the SQL-backed path is a drop-in source.
 */
export interface AuditEventQuery {
  startTime?: string;
  endTime?: string;
  actions?: string[];
  resources?: string[];
  status?: 'success' | 'failure';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditEventStats {
  total: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  byStatus: { success: number; failure: number };
  failureRate: number;
}

/**
 * Repository for durable persistence of audit events.
 *
 * All methods are best-effort: when the database is unavailable they degrade
 * gracefully (no throw) so the audit path never breaks the request pipeline.
 */
export class AuditEventRepository {
  constructor(
    private getDb: () => Database | null,
    private isConnected: () => boolean
  ) {}

  /** Persist a single audit event. Returns false when the write was skipped. */
  async insert(event: AuditEventRecord): Promise<boolean> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return false;
    }

    try {
      await db.run(
        `INSERT INTO audit_events
           (timestamp, action, resource, resource_id, user_id, ip, user_agent, before_value, after_value, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.timestamp,
          event.action,
          event.resource,
          event.resourceId ?? null,
          event.userId ?? null,
          event.ip ?? null,
          event.userAgent ?? null,
          event.before !== undefined ? JSON.stringify(event.before) : null,
          event.after !== undefined ? JSON.stringify(event.after) : null,
          event.status,
          event.errorMessage ?? null,
        ]
      );
      return true;
    } catch (error) {
      debug('Error inserting audit event:', error);
      return false;
    }
  }

  /**
   * Query persisted audit events with the same filter/pagination semantics as
   * the in-memory logger. Results are returned newest-first.
   */
  async query(filters: AuditEventQuery = {}): Promise<AuditEventRecord[]> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return [];
    }

    const { where, params } = this.buildWhere(filters);
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 100;
    const offset = filters.offset && filters.offset > 0 ? filters.offset : 0;

    try {
      const rows = await db.all(
        `SELECT * FROM audit_events ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      return rows.map((row: Record<string, unknown>) => this.rowToRecord(row));
    } catch (error) {
      debug('Error querying audit events:', error);
      return [];
    }
  }

  /** Retrieve the most recent N audit events (newest-first). */
  async getRecent(limit = 100): Promise<AuditEventRecord[]> {
    return this.query({ limit });
  }

  /**
   * Aggregate statistics over a time window. Mirrors the in-memory getStats.
   */
  async getStats(startTime?: string, endTime?: string): Promise<AuditEventStats> {
    const empty: AuditEventStats = {
      total: 0,
      byAction: {},
      byResource: {},
      byStatus: { success: 0, failure: 0 },
      failureRate: 0,
    };

    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return empty;
    }

    const { where, params } = this.buildWhere({ startTime, endTime });

    try {
      const rows = await db.all(
        `SELECT action, resource, status, COUNT(*) AS count
           FROM audit_events ${where}
          GROUP BY action, resource, status`,
        params
      );

      const byAction: Record<string, number> = {};
      const byResource: Record<string, number> = {};
      let successCount = 0;
      let failureCount = 0;

      for (const row of rows as Record<string, unknown>[]) {
        const count = Number(row.count) || 0;
        const action = row.action as string;
        const resource = row.resource as string;
        byAction[action] = (byAction[action] || 0) + count;
        byResource[resource] = (byResource[resource] || 0) + count;
        if (row.status === 'success') successCount += count;
        else failureCount += count;
      }

      const total = successCount + failureCount;
      return {
        total,
        byAction,
        byResource,
        byStatus: { success: successCount, failure: failureCount },
        failureRate: total > 0 ? (failureCount / total) * 100 : 0,
      };
    } catch (error) {
      debug('Error computing audit stats:', error);
      return empty;
    }
  }

  private buildWhere(filters: AuditEventQuery): { where: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.startTime) {
      clauses.push('timestamp >= ?');
      params.push(filters.startTime);
    }
    if (filters.endTime) {
      clauses.push('timestamp <= ?');
      params.push(filters.endTime);
    }
    if (filters.actions && filters.actions.length > 0) {
      clauses.push(`action IN (${filters.actions.map(() => '?').join(', ')})`);
      params.push(...filters.actions);
    }
    if (filters.resources && filters.resources.length > 0) {
      clauses.push(`resource IN (${filters.resources.map(() => '?').join(', ')})`);
      params.push(...filters.resources);
    }
    if (filters.status) {
      clauses.push('status = ?');
      params.push(filters.status);
    }
    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      clauses.push(
        "(LOWER(action) LIKE ? OR LOWER(resource) LIKE ? OR LOWER(COALESCE(resource_id, '')) LIKE ? OR LOWER(COALESCE(user_id, '')) LIKE ? OR LOWER(COALESCE(error_message, '')) LIKE ?)"
      );
      params.push(term, term, term, term, term);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return { where, params };
  }

  private rowToRecord(row: Record<string, unknown>): AuditEventRecord {
    return {
      timestamp: row.timestamp as string,
      action: row.action as string,
      resource: row.resource as string,
      resourceId: (row.resource_id as string) ?? undefined,
      userId: (row.user_id as string) ?? undefined,
      ip: (row.ip as string) ?? '',
      userAgent: (row.user_agent as string) ?? '',
      before: this.parseJson(row.before_value),
      after: this.parseJson(row.after_value),
      status: row.status as 'success' | 'failure',
      errorMessage: (row.error_message as string) ?? undefined,
    };
  }

  private parseJson(value: unknown): unknown {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
