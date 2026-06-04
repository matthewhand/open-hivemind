import { type NextFunction, type Request, type Response } from 'express';
import { type AuthMiddlewareRequest } from '@src/auth/types';
import { Logger } from '@src/common/logger';
import { getClientIP } from './security';

interface ResponseWithAuditFlag extends Response {
  _auditLogged?: boolean;
}

export interface AuditLogEntry {
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
 * Query filters for searching audit logs.
 * Inspired by log aggregation patterns for flexible audit trail analysis.
 */
export interface AuditLogQuery {
  /** ISO timestamp lower bound (inclusive) */
  startTime?: string;
  /** ISO timestamp upper bound (inclusive) */
  endTime?: string;
  /** Filter by action(s) */
  actions?: string[];
  /** Filter by resource(s) */
  resources?: string[];
  /** Filter by status */
  status?: 'success' | 'failure';
  /** Free-text search across action, resource, resourceId, userId, and errorMessage */
  search?: string;
  /** Max results (default 100) */
  limit?: number;
  /** Skip first N results for pagination */
  offset?: number;
}

/**
 * Summary statistics for audit logs within a time window.
 */
export interface AuditLogStats {
  total: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  byStatus: { success: number; failure: number };
  failureRate: number;
}

/**
 * Durable backing store for audit events. Abstracts the persistence layer so
 * the logger can be unit-tested without a live database, while production wires
 * it to the SQLite/Postgres-backed AuditEventRepository via DatabaseManager.
 */
export interface AuditEventStore {
  insert(entry: AuditLogEntry): Promise<boolean>;
  query(filters: AuditLogQuery): Promise<AuditLogEntry[]>;
  getStats(startTime?: string, endTime?: string): Promise<AuditLogStats>;
  getRecent(limit: number): Promise<AuditLogEntry[]>;
}

/**
 * Default store that lazily resolves the DatabaseManager singleton. The require
 * is deferred to call-time to avoid an import cycle at module load and to keep
 * the audit path resilient when the database is not configured.
 */
const defaultAuditEventStore: AuditEventStore = {
  async insert(entry: AuditLogEntry): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { DatabaseManager } = require('@src/database/DatabaseManager');
      return await DatabaseManager.getInstance().insertAuditEvent(entry);
    } catch {
      return false;
    }
  },
  async query(filters: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { DatabaseManager } = require('@src/database/DatabaseManager');
      return await DatabaseManager.getInstance().queryAuditEvents(filters);
    } catch {
      return [];
    }
  },
  async getStats(startTime?: string, endTime?: string): Promise<AuditLogStats> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { DatabaseManager } = require('@src/database/DatabaseManager');
      return await DatabaseManager.getInstance().getAuditEventStats(startTime, endTime);
    } catch {
      return { total: 0, byAction: {}, byResource: {}, byStatus: { success: 0, failure: 0 }, failureRate: 0 };
    }
  },
  async getRecent(limit: number): Promise<AuditLogEntry[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { DatabaseManager } = require('@src/database/DatabaseManager');
      return await DatabaseManager.getInstance().getRecentAuditEvents(limit);
    } catch {
      return [];
    }
  },
};

class AuditLoggerService {
  private logs: AuditLogEntry[] = [];
  private readonly maxLogs: number = 1000;
  private store: AuditEventStore;
  private hydrated = false;

  constructor(store: AuditEventStore = defaultAuditEventStore) {
    this.store = store;
  }

  /**
   * Swap the durable backing store (primarily for tests). Resets the hydration
   * flag so the in-memory cache is reloaded from the new store on next access.
   */
  setStore(store: AuditEventStore): void {
    this.store = store;
    this.hydrated = false;
    this.logs = [];
  }

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(fullEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Durable persistence (fire-and-forget; never blocks the request path).
    void this.store.insert(fullEntry).catch((error) => {
      Logger.debug(`Audit event persistence failed: ${String(error)}`);
    });

    // Also log to structured logger
    Logger.info('AUDIT', fullEntry);
  }

  /**
   * Hydrate the in-memory cache from the durable store. Runs at most once and
   * only merges events that are not already cached, so volatile recent entries
   * (logged this process) survive alongside the persisted history after a
   * restart. Errors are swallowed so reads never fail.
   */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const persisted = await this.store.getRecent(this.maxLogs);
      if (persisted.length > 0) {
        const seen = new Set(this.logs.map((l) => `${l.timestamp}|${l.action}|${l.resource}`));
        // Persisted are newest-first; restore chronological (oldest-first) order.
        const restored = [...persisted]
          .reverse()
          .filter((l) => !seen.has(`${l.timestamp}|${l.action}|${l.resource}`));
        this.logs = [...restored, ...this.logs].slice(-this.maxLogs);
      }
    } catch {
      // Best-effort hydration; in-memory cache remains the source of truth.
    }
  }

  /**
   * Durable query backed by the persistence layer. Use this for reads that must
   * survive a restart; falls back to the in-memory cache when the store yields
   * nothing (e.g. database not configured).
   */
  async queryPersisted(filters: AuditLogQuery): Promise<AuditLogEntry[]> {
    const persisted = await this.store.query(filters);
    if (persisted.length > 0) return persisted;
    return this.query(filters);
  }

  /** Durable stats backed by the persistence layer, falling back to in-memory. */
  async getStatsPersisted(startTime?: string, endTime?: string): Promise<AuditLogStats> {
    const stats = await this.store.getStats(startTime, endTime);
    if (stats.total > 0) return stats;
    return this.getStats(startTime, endTime);
  }

  getLogs(limit = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByUser(userId: string, limit = 100): AuditLogEntry[] {
    return this.logs.filter((log) => log.userId === userId).slice(-limit);
  }

  getLogsByResource(resource: string, limit = 100): AuditLogEntry[] {
    return this.logs.filter((log) => log.resource === resource).slice(-limit);
  }

  getLogsByAction(action: string, limit = 100): AuditLogEntry[] {
    return this.logs.filter((log) => log.action === action).slice(-limit);
  }

  /**
   * Query logs with flexible filters including time range, free-text search,
   * and pagination. Ported from LogAggregator patterns before its removal.
   */
  query(filters: AuditLogQuery): AuditLogEntry[] {
    let results = this.logs;

    if (filters.startTime) {
      const startTime = filters.startTime;
      results = results.filter((log) => log.timestamp >= startTime);
    }
    if (filters.endTime) {
      const endTime = filters.endTime;
      results = results.filter((log) => log.timestamp <= endTime);
    }
    if (filters.actions && filters.actions.length > 0) {
      const actions = filters.actions;
      results = results.filter((log) => actions.includes(log.action));
    }
    if (filters.resources && filters.resources.length > 0) {
      const resources = filters.resources;
      results = results.filter((log) => resources.includes(log.resource));
    }
    if (filters.status) {
      results = results.filter((log) => log.status === filters.status);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(
        (log) =>
          log.action.toLowerCase().includes(term) ||
          log.resource.toLowerCase().includes(term) ||
          (log.resourceId && log.resourceId.toLowerCase().includes(term)) ||
          (log.userId && log.userId.toLowerCase().includes(term)) ||
          (log.errorMessage && log.errorMessage.toLowerCase().includes(term))
      );
    }

    // Sort newest first
    results = [...results].reverse();

    // Pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get summary statistics for audit logs within an optional time window.
   * Ported from LogAggregator stats patterns before its removal.
   */
  getStats(startTime?: string, endTime?: string): AuditLogStats {
    let logs = this.logs;

    if (startTime) {
      logs = logs.filter((log) => log.timestamp >= startTime);
    }
    if (endTime) {
      logs = logs.filter((log) => log.timestamp <= endTime);
    }

    const byAction: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    let successCount = 0;
    let failureCount = 0;

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byResource[log.resource] = (byResource[log.resource] || 0) + 1;
      if (log.status === 'success') successCount++;
      else failureCount++;
    }

    const total = logs.length;
    return {
      total,
      byAction,
      byResource,
      byStatus: { success: successCount, failure: failureCount },
      failureRate: total > 0 ? (failureCount / total) * 100 : 0,
    };
  }
}

export const auditLogger = new AuditLoggerService();

/**
 * Middleware factory for route-specific audit logging
 * Wraps response to capture status and log the operation
 */
export const auditMiddleware = (
  action: string,
  resource: string
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;

    // eslint-disable-next-line unused-imports/no-unused-vars
    const startTime = Date.now();

    res.send = function (data: unknown): Response {
      // Only log once
      if (!(res as ResponseWithAuditFlag)._auditLogged) {
        (res as ResponseWithAuditFlag)._auditLogged = true;

        const dataObj = data as Record<string, unknown> | undefined;
        const entry: Omit<AuditLogEntry, 'timestamp'> = {
          action,
          resource,
          resourceId: req.params.id || req.params.name || req.params.key || req.params.userId,
          userId:
            (req as AuthMiddlewareRequest).user?.id ||
            (req as AuthMiddlewareRequest).user?.username ||
            'anonymous',
          ip: getClientIP(req) || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          status: res.statusCode < 400 ? 'success' : 'failure',
          errorMessage:
            res.statusCode >= 400
              ? String(dataObj?.error || dataObj?.message || '') || undefined
              : undefined,
        };

        auditLogger.log(entry);
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Enhanced audit middleware that captures before/after values
 * Use for update operations where tracking changes is important
 */
export const auditMiddlewareWithChanges = (
  action: string,
  resource: string,
  getBeforeValue?: (req: Request) => Promise<unknown> | unknown
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    let beforeValue: unknown = undefined;

    // Capture before value if getter provided
    if (getBeforeValue) {
      try {
        beforeValue = await getBeforeValue(req);
      } catch {
        // Ignore errors in before value capture
      }
    }

    res.send = function (data: unknown): Response {
      if (!(res as ResponseWithAuditFlag)._auditLogged) {
        (res as ResponseWithAuditFlag)._auditLogged = true;

        const dataObj = data as Record<string, unknown> | undefined;
        const entry: Omit<AuditLogEntry, 'timestamp'> = {
          action,
          resource,
          resourceId: req.params.id || req.params.name || req.params.key || req.params.userId,
          userId:
            (req as AuthMiddlewareRequest).user?.id ||
            (req as AuthMiddlewareRequest).user?.username ||
            'anonymous',
          ip: getClientIP(req) || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          before: beforeValue,
          after:
            res.statusCode < 400
              ? dataObj?.bot || dataObj?.user || dataObj?.profile || data
              : undefined,
          status: res.statusCode < 400 ? 'success' : 'failure',
          errorMessage:
            res.statusCode >= 400
              ? String(dataObj?.error || dataObj?.message || '') || undefined
              : undefined,
        };

        auditLogger.log(entry);
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Manual audit logging function for use within route handlers
 * When you need more control over what gets logged
 */
export const logAuditEvent = (
  req: Request,
  action: string,
  resource: string,
  status: 'success' | 'failure',
  options: {
    resourceId?: string;
    before?: unknown;
    after?: unknown;
    errorMessage?: string;
  } = {}
): void => {
  const entry: Omit<AuditLogEntry, 'timestamp'> = {
    action,
    resource,
    resourceId: options.resourceId || req.params.id || req.params.name || req.params.key,
    userId:
      (req as AuthMiddlewareRequest).user?.id ||
      (req as AuthMiddlewareRequest).user?.username ||
      'anonymous',
    ip: getClientIP(req) || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    before: options.before,
    after: options.after,
    status,
    errorMessage: options.errorMessage,
  };

  auditLogger.log(entry);
};

export default auditLogger;
