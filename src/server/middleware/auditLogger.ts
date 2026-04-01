import { type NextFunction, type Request, type Response } from 'express';
import { type AuthMiddlewareRequest } from '@src/auth/types';
import { Logger } from '@src/common/logger';

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

class AuditLoggerService {
  private logs: AuditLogEntry[] = [];
  private readonly maxLogs: number = 1000;

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

    // Also log to structured logger
    Logger.info('AUDIT', fullEntry);
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
          ip:
            req.ip ||
            req.connection?.remoteAddress ||
            (req.headers['x-forwarded-for'] as string) ||
            'unknown',
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
      } catch (error) {
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
          ip:
            req.ip ||
            req.connection?.remoteAddress ||
            (req.headers['x-forwarded-for'] as string) ||
            'unknown',
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
    ip:
      req.ip ||
      req.connection?.remoteAddress ||
      (req.headers['x-forwarded-for'] as string) ||
      'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    before: options.before,
    after: options.after,
    status,
    errorMessage: options.errorMessage,
  };

  auditLogger.log(entry);
};

export default auditLogger;
