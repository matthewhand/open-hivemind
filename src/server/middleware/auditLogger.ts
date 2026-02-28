import { NextFunction, Request, Response } from 'express';
import { Logger } from '@src/common/logger';

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  ip: string;
  userAgent: string;
  before?: any;
  after?: any;
  status: 'success' | 'failure';
  errorMessage?: string;
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
}

export const auditLogger = new AuditLoggerService();

/**
 * Middleware factory for route-specific audit logging
 * Wraps response to capture status and log the operation
 */
export const auditMiddleware = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function (data: any): Response {
      // Only log once
      if (!(res as any)._auditLogged) {
        (res as any)._auditLogged = true;

        const entry: Omit<AuditLogEntry, 'timestamp'> = {
          action,
          resource,
          resourceId: req.params.id || req.params.name || req.params.key || req.params.userId,
          userId: (req as any).user?.id || (req as any).user?.username || 'anonymous',
          ip:
            req.ip ||
            req.connection?.remoteAddress ||
            (req.headers['x-forwarded-for'] as string) ||
            'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          status: res.statusCode < 400 ? 'success' : 'failure',
          errorMessage: res.statusCode >= 400 ? data?.error || data?.message : undefined,
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
  getBeforeValue?: (req: Request) => Promise<any> | any
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    let beforeValue: any = undefined;

    // Capture before value if getter provided
    if (getBeforeValue) {
      try {
        beforeValue = await getBeforeValue(req);
      } catch (error) {
        // Ignore errors in before value capture
      }
    }

    res.send = function (data: any): Response {
      if (!(res as any)._auditLogged) {
        (res as any)._auditLogged = true;

        const entry: Omit<AuditLogEntry, 'timestamp'> = {
          action,
          resource,
          resourceId: req.params.id || req.params.name || req.params.key || req.params.userId,
          userId: (req as any).user?.id || (req as any).user?.username || 'anonymous',
          ip:
            req.ip ||
            req.connection?.remoteAddress ||
            (req.headers['x-forwarded-for'] as string) ||
            'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          before: beforeValue,
          after:
            res.statusCode < 400 ? data?.bot || data?.user || data?.profile || data : undefined,
          status: res.statusCode < 400 ? 'success' : 'failure',
          errorMessage: res.statusCode >= 400 ? data?.error || data?.message : undefined,
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
    before?: any;
    after?: any;
    errorMessage?: string;
  } = {}
): void => {
  const entry: Omit<AuditLogEntry, 'timestamp'> = {
    action,
    resource,
    resourceId: options.resourceId || req.params.id || req.params.name || req.params.key,
    userId: (req as any).user?.id || (req as any).user?.username || 'anonymous',
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
