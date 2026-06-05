/**
 * Error Logging System Types for Open Hivemind
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

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
    body?: unknown;
    params?: unknown;
    query?: unknown;
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
  body?: unknown;
  params?: unknown;
  query?: unknown;
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

export interface RecoveryStrategy {
  canRecover: boolean;
  retryDelay?: number;
  maxRetries?: number;
  recoverySteps?: string[];
}
