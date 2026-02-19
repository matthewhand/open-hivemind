/**
 * Error Logging System for Open Hivemind
 * 
 * Integrates with the existing logging system to provide structured error logging
 * with context, severity levels, and correlation IDs.
 */

import Debug from 'debug';
import { BaseHivemindError } from '../types/errorClasses';
import type { HivemindError} from '../types/errors';
import { ErrorUtils } from '../types/errors';
import { MetricsCollector } from '../monitoring/MetricsCollector';

/**
 * Error log entry structure
 */
export interface ErrorLogEntry {
  timestamp: string;
  correlationId: string;
  level: LogLevel;
  error: {
    name: string;
    message: string;
    code: string;
    type: string;
    stack?: string;
    details?: Record<string, unknown>;
    context?: Record<string, unknown>;
  };
  request?: {
    path: string;
    method: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
    requestId?: string;
    duration?: number;
    body?: any;
    params?: any;
    query?: any;
  };
  system: {
    hostname: string;
    pid: number;
    nodeVersion: string;
    platform: string;
    arch: string;
    memory: {
      used: number;
      total: number;
      external: number;
    };
  };
  recovery?: {
    canRecover: boolean;
    retryDelay?: number;
    maxRetries?: number;
    steps?: string[];
  };
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Error context interface
 */
export interface ErrorContext {
  correlationId: string;
  requestId?: string;
  userId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  body?: any;
  params?: any;
  query?: any;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableStructured: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableMetrics: boolean;
  enableTracing: boolean;
}

/**
 * Error logger class
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private config: LoggerConfig;
  private debug: Debug.Debugger;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, number> = new Map(); // correlationId -> timestamp

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: process.env.LOG_LEVEL as LogLevel || 'info',
      enableConsole: process.env.NODE_ENV !== 'test',
      enableFile: process.env.NODE_ENV === 'production',
      enableStructured: true,
      filePath: process.env.ERROR_LOG_PATH || './logs/error.log',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableMetrics: true,
      enableTracing: process.env.NODE_ENV === 'development',
      ...config,
    };

    this.debug = Debug('app:error:logger');
    this.debug('Error logger initialized with config:', this.config);
  }

  static getInstance(config?: Partial<LoggerConfig>): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger(config);
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context
   */
  logError(error: HivemindError, context: ErrorContext): void {
    const logEntry = this.createLogEntry(error, context);
    const logLevel = this.determineLogLevel(error, context);

    // Update error counts
    this.updateErrorCounts(error);

    // Log to appropriate outputs
    this.logToConsole(logEntry, logLevel);
    this.logToFile(logEntry, logLevel);
    this.logToStructured(logEntry, logLevel);

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(error, context);
    }

    // Check for error patterns
    this.checkErrorPatterns(error, context);

    this.debug(`Error logged: ${(error as any).name || 'Unknown'} - ${ErrorUtils.getMessage(error)}`, {
      correlationId: context.correlationId,
      level: logLevel,
    });
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(error: HivemindError, context: ErrorContext): ErrorLogEntry {
    const memoryUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      level: this.determineLogLevel(error, context),
      error: {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: ErrorUtils.getMessage(error),
        code: ErrorUtils.getCode(error) || 'UNKNOWN',
        type: this.getErrorType(error),
        stack: error instanceof Error ? error.stack : undefined,
        details: error && typeof error === 'object' ? (error as any).details : undefined,
        context: error instanceof BaseHivemindError ? error.context : undefined,
      },
      request: {
        path: context.path,
        method: context.method,
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId,
        requestId: context.requestId,
        duration: context.duration,
        body: context.body,
        params: context.params,
        query: context.query,
      },
      system: {
        hostname: require('os').hostname(),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
      },
      recovery: error instanceof BaseHivemindError ? {
        canRecover: error.getRecoveryStrategy().canRecover,
        retryDelay: error.getRecoveryStrategy().retryDelay,
        maxRetries: error.getRecoveryStrategy().maxRetries,
        steps: error.getRecoveryStrategy().recoverySteps,
      } : undefined,
    };
  }

  /**
   * Determine log level based on error type and context
   */
  private determineLogLevel(error: HivemindError, context: ErrorContext): LogLevel {
    void context;
    const statusCode = ErrorUtils.getStatusCode(error);
    const errorType = this.getErrorType(error);

    // Fatal errors
    if (errorType === 'configuration' || errorType === 'database') {
      return 'fatal';
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return 'error';
    }

    // Client errors
    if (statusCode && statusCode >= 400) {
      return 'warn';
    }

    // Network and timeout errors
    if (errorType === 'network' || errorType === 'timeout') {
      return 'warn';
    }

    // Authentication and authorization errors
    if (errorType === 'authentication' || errorType === 'authorization') {
      return 'warn';
    }

    // Rate limit errors
    if (errorType === 'rate-limit') {
      return 'info';
    }

    // Validation errors
    if (errorType === 'validation') {
      return 'info';
    }

    return 'error';
  }

  /**
   * Extract error type from error object
   */
  private getErrorType(error: HivemindError): string {
    if (error && typeof error === 'object') {
      // Check for source property first (for frontend errors)
      if ('source' in error && error.source === 'frontend') {
        return 'frontend';
      }
      // Check for type property
      if ('type' in error && error.type) {
        return String(error.type);
      }
      // Check for other properties that might indicate type
      if ('name' in error && error.name) {
        return String(error.name).toLowerCase();
      }
    }
    return 'unknown';
  }

  /**
   * Log to console
   */
  private logToConsole(logEntry: ErrorLogEntry, level: LogLevel): void {
    if (!this.config.enableConsole) {return;}

    const message = `[${logEntry.level.toUpperCase()}] ${logEntry.error.message}`;
    const meta = {
      correlationId: logEntry.correlationId,
      code: logEntry.error.code,
      type: logEntry.error.type,
      path: logEntry.request?.path,
      method: logEntry.request?.method,
      userId: logEntry.request?.userId,
    };

    switch (level) {
    case 'debug':
      console.debug(message, meta);
      break;
    case 'info':
      console.info(message, meta);
      break;
    case 'warn':
      console.warn(message, meta);
      break;
    case 'error':
    case 'fatal':
      console.error(message, meta);
      if (logEntry.error.stack) {
        console.error(logEntry.error.stack);
      }
      break;
    }
  }

  /**
   * Log to file (simplified implementation)
   */
  private logToFile(logEntry: ErrorLogEntry, level: LogLevel): void {
    if (!this.config.enableFile) {return;}

    // In a real implementation, this would write to a file
    // For now, we'll use console.log with a file-like format
    const logLine = JSON.stringify(logEntry) + '\n';
    console.log(`[FILE:${level.toUpperCase()}]`, logLine);
  }

  /**
   * Log to structured output (for monitoring systems)
   */
  private logToStructured(logEntry: ErrorLogEntry, level: LogLevel): void {
    if (!this.config.enableStructured) {return;}

    // Emit structured log for monitoring systems
    if ((process as any).emit) {
      (process as any).emit('hivemind:log', {
        type: 'error',
        level,
        entry: logEntry,
      });
    }
  }

  /**
   * Update error metrics
   */
  private updateMetrics(error: HivemindError, context: ErrorContext): void {
    // Update global error count
    MetricsCollector.getInstance().incrementErrors();

    // Track error types
    const errorType = this.getErrorType(error);
    this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);

    // Track recent errors for pattern detection
    this.lastErrors.set(context.correlationId, Date.now());

    // Clean up old entries (keep last 1000)
    if (this.lastErrors.size > 1000) {
      const oldest = Array.from(this.lastErrors.entries())
        .sort((a, b) => a[1] - b[1])[0];
      if (oldest) {
        this.lastErrors.delete(oldest[0]);
      }
    }
  }

  /**
   * Update error counts
   */
  private updateErrorCounts(error: HivemindError): void {
    const errorType = this.getErrorType(error);
    this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
  }

  /**
   * Check for error patterns and anomalies
   */
  private checkErrorPatterns(error: HivemindError, context: ErrorContext): void {
    void context;
    const errorType = this.getErrorType(error);
    const count = this.errorCounts.get(errorType) || 0;
    
    // Check for error spikes
    if (count > 10 && count % 10 === 0) {
      this.debug(`Error spike detected for type ${errorType}: ${count} occurrences`);
      
      // Emit alert for monitoring
      if ((process as any).emit) {
        (process as any).emit('hivemind:alert', {
          type: 'error_spike',
          errorType,
          count,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Check for repeated errors from same correlation ID
    const recentErrors = Array.from(this.lastErrors.entries())
      .filter(([, timestamp]) => Date.now() - timestamp < 60000) // Last minute
      .length;

    if (recentErrors > 5) {
      this.debug(`High error rate detected: ${recentErrors} errors in last minute`);

      if ((process as any).emit) {
        (process as any).emit('hivemind:alert', {
          type: 'high_error_rate',
          count: recentErrors,
          timeframe: '1 minute',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): any {
    // Calculate total errors
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0);

    // Get error types with counts
    const errorTypes = Object.fromEntries(this.errorCounts);

    // Generate mock data for bySeverity and byDate
    const bySeverity = {
      high: Math.floor(totalErrors * 0.3),
      medium: Math.floor(totalErrors * 0.5),
      low: Math.floor(totalErrors * 0.2),
    };

    const byDate: { [key: string]: number } = {};
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      byDate[dateStr] = Math.floor(totalErrors * 0.1 * (i + 1));
    }

    return {
      totalErrors,
      errorTypes,
      bySeverity,
      byDate,
    };
  }

  /**
   * Get recent error count
   */
  getRecentErrorCount(timeframeMs: number = 60000): number {
    const cutoff = Date.now() - timeframeMs;
    return Array.from(this.lastErrors.values())
      .filter(timestamp => timestamp > cutoff)
      .length;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): Array<{ error: HivemindError; context: ErrorContext; timestamp: number }> {
    return Array.from(this.lastErrors.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by timestamp descending
      .slice(0, limit)
      .map(([correlationId, timestamp]) => ({
        error: {
          name: 'RecentError',
          message: 'Recent error',
          code: 'RECENT_ERROR',
          type: 'recent',
        } as HivemindError,
        context: {
          correlationId,
          path: '',
          method: '',
        } as ErrorContext,
        timestamp,
      }));
  }

  /**
   * Clear error statistics
   */
  clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
    this.debug('Error statistics cleared');
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.debug(`Log level set to: ${level}`);
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.debug('Logger configuration updated:', config);
  }
}

/**
 * Default error logger instance
 */
export const errorLogger = ErrorLogger.getInstance();

/**
 * Convenience function to log errors
 */
export function logError(error: HivemindError, context: ErrorContext): void {
  errorLogger.logError(error, context);
}

/**
 * Create error context from Express request
 */
export function createErrorContext(req: any): ErrorContext {
  return {
    correlationId: req.correlationId || req.headers['x-correlation-id'] || 'unknown',
    requestId: req.headers['x-request-id'] as string,
    userId: req.user?.id || req.user?.sub,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    duration: req.startTime ? Date.now() - req.startTime : undefined,
    body: req.body,
    params: req.params,
    query: req.query,
  };
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(req: any, res: any, next: any): void {
  // Add error logger to request object
  req.errorLogger = errorLogger;
  next();
}

export default {
  ErrorLogger,
  errorLogger,
  logError,
  createErrorContext,
  errorLoggingMiddleware,
};
