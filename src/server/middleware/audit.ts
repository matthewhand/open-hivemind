import Debug from 'debug';
import { type NextFunction, type Response } from 'express';
import type { AuthMiddlewareRequest } from '../../auth/types';
import { AuditLogger } from '../../common/auditLogger';

const debug = Debug('app:auditMiddleware');

export interface AuditedRequest extends AuthMiddlewareRequest {
  auditUser?: string;
  auditIp?: string;
  auditUserAgent?: string;
}

/**
 * Middleware to extract user information for audit logging
 */
export const auditMiddleware = (req: AuditedRequest, res: Response, next: NextFunction): void => {
  try {
    // Extract user information from various sources
    let user = 'anonymous';

    // Check for authenticated user from RBAC system
    if (req.user) {
      const userObj = req.user;
      user = userObj.username || userObj.email || userObj.id || 'authenticated-user';
    }

    // Extract IP address
    const reqWithConnection = req as AuditedRequest & {
      connection?: { remoteAddress?: string };
      socket?: { remoteAddress?: string };
    };
    const ipAddress =
      req.ip ||
      reqWithConnection.connection?.remoteAddress ||
      reqWithConnection.socket?.remoteAddress ||
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      'unknown';

    // Extract user agent
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    // Attach to request for use in route handlers
    req.auditUser = user;
    req.auditIp = ipAddress;
    req.auditUserAgent = userAgent;

    next();
  } catch (error) {
    debug('Audit middleware error:', error);
    next();
  }
};

/**
 * Helper function to log configuration changes
 */
export const logConfigChange = (
  req: AuditedRequest,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RELOAD',
  resource: string,
  result: 'success' | 'failure',
  details: string,
  options: {
    oldValue?: any;
    newValue?: any;
    metadata?: Record<string, any>;
  } = {}
): void => {
  const auditLogger = AuditLogger.getInstance();
  auditLogger.logConfigChange(req.auditUser || 'unknown', action, resource, result, details, {
    ipAddress: req.auditIp,
    userAgent: req.auditUserAgent,
    ...options,
  });
};

/**
 * Helper function to log bot actions
 */
export const logBotAction = (
  req: AuditedRequest,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'START' | 'STOP' | 'CLONE',
  botName: string,
  result: 'success' | 'failure',
  details: string,
  options: {
    oldValue?: any;
    newValue?: any;
    metadata?: Record<string, any>;
  } = {}
): void => {
  const auditLogger = AuditLogger.getInstance();
  auditLogger.logBotAction(req.auditUser || 'unknown', action, botName, result, details, {
    ipAddress: req.auditIp,
    userAgent: req.auditUserAgent,
    ...options,
  });
};

/**
 * Helper function to log admin actions
 */
export const logAdminAction = (
  req: AuditedRequest,
  action: string,
  resource: string,
  result: 'success' | 'failure',
  details: string,
  options: {
    metadata?: Record<string, any>;
  } = {}
): void => {
  const auditLogger = AuditLogger.getInstance();
  auditLogger.logAdminAction(req.auditUser || 'unknown', action, resource, result, details, {
    ipAddress: req.auditIp,
    userAgent: req.auditUserAgent,
    ...options,
  });
};

export default auditMiddleware;
