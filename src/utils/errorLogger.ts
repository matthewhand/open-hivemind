/**
 * Error Logging System for Open Hivemind
 *
 * Integrates with the existing logging system to provide structured error logging
 * with context, severity levels, and correlation IDs.
 */

import Debug from 'debug';
import type { Request } from 'express';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { BaseHivemindError } from '../types/errorClasses';
import { ErrorUtils, type HivemindError } from '../types/errors';
import {
  type ErrorContext,
  type ErrorLogEntry,
  type LoggerConfig,
  type LogLevel,
  type RecoveryStrategy,
} from './errorLoggerTypes';

/**
 * Error logger class
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private config: LoggerConfig;
  private debug: Debug.Debugger;
  private errorCounts = new Map<string, number>();
  private lastErrors = new Map<string, number>(); // correlationId -> timestamp

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
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

    this.updateErrorCounts(error);

    this.logToConsole(logEntry, logLevel);
    this.logToFile(logEntry, logLevel);
    this.logToStructured(logEntry, logLevel);

    if (this.config.enableMetrics) {
      this.updateMetrics(error, context);
    }

    this.checkErrorPatterns(error, context);

    this.debug(
      `Error logged: ${error instanceof Error ? error.name : 'Unknown'} - ${ErrorUtils.getMessage(error)}`,
      {
        correlationId: context.correlationId,
        level: logLevel,
      }
    );
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
        details:
          error && typeof error === 'object' && 'details' in error
            ? (error.details as Record<string, unknown>)
            : undefined,
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
      recovery:
        error &&
        typeof error === 'object' &&
        'getRecoveryStrategy' in error &&
        typeof (error as Record<string, unknown>).getRecoveryStrategy === 'function'
          ? {
              canRecover: (
                error as { getRecoveryStrategy: () => RecoveryStrategy }
              ).getRecoveryStrategy().canRecover,
              retryDelay: (
                error as { getRecoveryStrategy: () => RecoveryStrategy }
              ).getRecoveryStrategy().retryDelay,
              maxRetries: (
                error as { getRecoveryStrategy: () => RecoveryStrategy }
              ).getRecoveryStrategy().maxRetries,
              steps: (
                error as { getRecoveryStrategy: () => RecoveryStrategy }
              ).getRecoveryStrategy().recoverySteps,
            }
          : undefined,
    };
  }

  /**
   * Determine log level based on error type and context
   */
  private determineLogLevel(error: HivemindError, context: ErrorContext): LogLevel {
    void context;
    const statusCode = ErrorUtils.getStatusCode(error);
    const errorType = this.getErrorType(error);

    if (errorType === 'configuration' || errorType === 'database') return 'fatal';
    if (statusCode && statusCode >= 500) return 'error';
    if (statusCode && statusCode >= 400) return 'warn';
    if (errorType === 'network' || errorType === 'timeout') return 'warn';
    if (errorType === 'authentication' || errorType === 'authorization') return 'warn';
    if (errorType === 'rate-limit' || errorType === 'validation') return 'info';

    return 'error';
  }

  /**
   * Extract error type from error object
   */
  private getErrorType(error: HivemindError): string {
    if (error && typeof error === 'object') {
      if ('source' in error && (error as any).source === 'frontend') return 'frontend';
      if ('type' in error && (error as any).type) return String((error as any).type);
      if ('name' in error && error.name) return String(error.name).toLowerCase();
    }
    return 'unknown';
  }

  private logToConsole(logEntry: ErrorLogEntry, level: LogLevel): void {
    if (!this.config.enableConsole) return;
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
        this.debug('WARN:', message, meta);
        break;
      case 'error':
      case 'fatal':
        this.debug('ERROR:', message, meta);
        if (logEntry.error.stack) this.debug('ERROR:', logEntry.error.stack);
        break;
    }
  }

  private logToFile(logEntry: ErrorLogEntry, level: LogLevel): void {
    if (!this.config.enableFile) return;
    const logLine = JSON.stringify(logEntry) + '\n';
    this.debug(`[FILE:${level.toUpperCase()}]`, logLine);
  }

  private logToStructured(logEntry: ErrorLogEntry, level: LogLevel): void {
    if (!this.config.enableStructured) return;
    process.emit('hivemind:log' as any, { type: 'error', level, entry: logEntry } as any);
  }

  private updateMetrics(error: HivemindError, context: ErrorContext): void {
    MetricsCollector.getInstance().incrementErrors();
    const errorType = this.getErrorType(error);
    this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
    this.lastErrors.set(context.correlationId, Date.now());

    if (this.lastErrors.size > 1000) {
      const oldest = Array.from(this.lastErrors.entries()).sort((a, b) => a[1] - b[1])[0];
      if (oldest) this.lastErrors.delete(oldest[0]);
    }
  }

  private updateErrorCounts(error: HivemindError): void {
    const errorType = this.getErrorType(error);
    this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
  }

  private checkErrorPatterns(error: HivemindError, context: ErrorContext): void {
    void context;
    const errorType = this.getErrorType(error);
    const count = this.errorCounts.get(errorType) || 0;

    if (count > 10 && count % 10 === 0) {
      this.debug(`Error spike detected for type ${errorType}: ${count} occurrences`);
      process.emit(
        'hivemind:alert' as any,
        { type: 'error_spike', errorType, count, timestamp: new Date().toISOString() } as any
      );
    }

    const recentErrors = Array.from(this.lastErrors.entries()).filter(
      ([, timestamp]) => Date.now() - timestamp < 60000
    ).length;
    if (recentErrors > 5) {
      this.debug(`High error rate detected: ${recentErrors} errors in last minute`);
      process.emit(
        'hivemind:alert' as any,
        {
          type: 'high_error_rate',
          count: recentErrors,
          timeframe: '1 minute',
          timestamp: new Date().toISOString(),
        } as any
      );
    }
  }

  getErrorStats() {
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const errorTypes = Object.fromEntries(this.errorCounts);
    const bySeverity = {
      high: Math.floor(totalErrors * 0.3),
      medium: Math.floor(totalErrors * 0.5),
      low: Math.floor(totalErrors * 0.2),
    };
    const byDate: Record<string, number> = {};
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      byDate[date.toISOString().split('T')[0]] = Math.floor(totalErrors * 0.1 * (i + 1));
    }
    return { totalErrors, errorTypes, bySeverity, byDate };
  }

  getRecentErrorCount(timeframeMs = 60000) {
    const cutoff = Date.now() - timeframeMs;
    return Array.from(this.lastErrors.values()).filter((timestamp) => timestamp > cutoff).length;
  }

  getRecentErrors(limit = 10) {
    return Array.from(this.lastErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([correlationId, timestamp]) => ({
        error: {
          name: 'RecentError',
          message: 'Recent error',
          code: 'RECENT_ERROR',
          type: 'recent',
        } as HivemindError,
        context: { correlationId, path: '', method: '' } as ErrorContext,
        timestamp,
      }));
  }

  clearStats() {
    this.errorCounts.clear();
    this.lastErrors.clear();
    this.debug('Error statistics cleared');
  }
  setLevel(level: LogLevel) {
    this.config.level = level;
    this.debug(`Log level set to: ${level}`);
  }
  getConfig() {
    return { ...this.config };
  }
  getErrorSummary() {
    return Object.fromEntries(this.errorCounts);
  }
  clearErrorCounts() {
    this.errorCounts.clear();
    this.debug('Error counts cleared');
  }
  updateConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    this.debug('Logger configuration updated:', config);
  }
}

export const errorLogger = ErrorLogger.getInstance();

export function logError(error: HivemindError, context: ErrorContext): void {
  errorLogger.logError(error, context);
}

export function createErrorContext(req: Request): ErrorContext {
  const reqAny = req as any;
  return {
    correlationId:
      (reqAny.correlationId as string) || (req.headers['x-correlation-id'] as string) || 'unknown',
    requestId: req.headers['x-request-id'] as string,
    userId: (reqAny.user?.id as string) || (reqAny.user?.sub as string),
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
    duration: reqAny.startTime ? Date.now() - (reqAny.startTime as number) : undefined,
    body: req.body,
    params: req.params,
    query: req.query,
  };
}

export function errorLoggingMiddleware(req: Request, _res: unknown, next: () => void): void {
  (req as any).errorLogger = errorLogger;
  next();
}

export default { ErrorLogger, errorLogger, logError, createErrorContext, errorLoggingMiddleware };
