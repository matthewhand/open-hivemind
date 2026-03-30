/**
 * Structured Logger with correlation IDs for request tracing
 *
 * This module provides JSON-formatted logging with support for:
 * - Correlation IDs (traceId, spanId) for distributed tracing
 * - Structured context data
 * - Integration with the 'debug' package for development
 * - Sensitive data redaction via sanitizeForLogging
 *
 * @module StructuredLogger
 */

import Debug from 'debug';
import { sanitizeForLogging } from './logger';

/**
 * Log levels supported by the StructuredLogger
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Error categories for classification
 */
export type ErrorCategory = 'database' | 'network' | 'validation' | 'configuration' | 'system';

/**
 * Structured log entry format
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  service: string;
}

/**
 * Options for creating a StructuredLogger
 */
export interface StructuredLoggerOptions {
  /** Service name for log entries */
  service: string;
  /** Optional trace ID for request correlation */
  traceId?: string;
  /** Optional span ID for operation tracking */
  spanId?: string;
}

/**
 * Error information for structured error logging
 */
interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  category?: ErrorCategory;
}

/**
 * Extract error information from an Error object
 */
function extractErrorInfo(error: Error): ErrorInfo {
  const info: ErrorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Check for HivemindError properties
  const anyError = error as unknown as Record<string, unknown>;
  if (anyError.code && typeof anyError.code === 'string') {
    info.code = anyError.code;
  }
  if (anyError.category && typeof anyError.category === 'string') {
    info.category = anyError.category as ErrorCategory;
  }

  return info;
}

/**
 * Sanitize context data for safe logging
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = sanitizeForLogging(value, key);
  }
  return sanitized;
}

/**
 * StructuredLogger provides JSON-formatted logging with correlation IDs
 *
 * @example
 * ```typescript
 * const logger = createLogger('messageHandler');
 * logger.info('Processing message', { messageId: '123', channel: 'general' });
 *
 * // With trace ID for request correlation
 * const tracedLogger = logger.withTraceId('abc-123-def');
 * tracedLogger.error('Failed to process', new Error('Connection timeout'));
 * ```
 */
export class StructuredLogger {
  private readonly debugLogger: Debug.Debugger;
  private readonly service: string;
  private readonly traceId?: string;
  private readonly spanId?: string;

  constructor(options: StructuredLoggerOptions) {
    this.service = options.service;
    this.traceId = options.traceId;
    this.spanId = options.spanId;
    this.debugLogger = Debug(`app:${options.service}`);
  }

  /**
   * Format a log entry with consistent structure
   */
  private formatEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = sanitizeContext(context);
    }

    if (this.traceId) {
      entry.traceId = this.traceId;
    }

    if (this.spanId) {
      entry.spanId = this.spanId;
    }

    return entry;
  }

  /**
   * Log a debug message (only visible when DEBUG=app:* is set)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    const entry = this.formatEntry('debug', message, context);
    this.debugLogger(JSON.stringify(entry));
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.formatEntry('info', message, context);
    console.info(JSON.stringify(entry));
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.formatEntry('warn', message, context);
    console.warn(JSON.stringify(entry));
  }

  /**
   * Log an error message with optional Error object
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = error
      ? {
          ...context,
          error: extractErrorInfo(error),
        }
      : context;

    const entry = this.formatEntry('error', message, errorContext);
    console.error(JSON.stringify(entry));
  }

  /**
   * Log a fatal error message (application cannot continue)
   */
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = error
      ? {
          ...context,
          error: extractErrorInfo(error),
        }
      : context;

    const entry = this.formatEntry('fatal', message, errorContext);
    console.error(JSON.stringify(entry));
  }

  /**
   * Create a new logger instance with a trace ID for request correlation
   */
  withTraceId(traceId: string): StructuredLogger {
    return new StructuredLogger({
      service: this.service,
      traceId,
      spanId: this.spanId,
    });
  }

  /**
   * Create a new logger instance with a span ID for operation tracking
   */
  withSpanId(spanId: string): StructuredLogger {
    return new StructuredLogger({
      service: this.service,
      traceId: this.traceId,
      spanId,
    });
  }

  /**
   * Create a child logger with additional context that will be included in all log entries
   *
   * @deprecated Use withTraceId or withSpanId instead for correlation
   */
  child(options: Partial<StructuredLoggerOptions>): StructuredLogger {
    return new StructuredLogger({
      service: options.service ?? this.service,
      traceId: options.traceId ?? this.traceId,
      spanId: options.spanId ?? this.spanId,
    });
  }
}

/**
 * Factory function to create a StructuredLogger instance
 *
 * @param service - The service name for log entries
 * @returns A new StructuredLogger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger('messageHandler');
 * logger.info('Message received', { from: 'user123' });
 * ```
 */
export function createLogger(service: string): StructuredLogger {
  return new StructuredLogger({ service });
}

export default StructuredLogger;
