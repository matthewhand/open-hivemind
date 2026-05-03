/**
 * Shared Logger implementation for Open Hivemind.
 * Works in both Node.js and Browser environments.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface LoggerInstance {
  trace(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
  setLevel(level: LogLevel): void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

function getEnvLogLevel(): LogLevel | undefined {
  try {
    // Node.js environment
    if (typeof process !== 'undefined' && process.env && process.env.LOG_LEVEL) {
      return process.env.LOG_LEVEL.toLowerCase() as LogLevel;
    }
    // Browser environment (LocalStorage)
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('LOG_LEVEL');
      if (stored) return stored.toLowerCase() as LogLevel;
    }
  } catch {
    // Ignore errors in env detection
  }
  return undefined;
}

export class SharedLogger implements LoggerInstance {
  private activeLevel: LogLevel;

  constructor(defaultLevel: LogLevel = 'info') {
    this.activeLevel = getEnvLogLevel() || defaultLevel;
  }

  setLevel(level: LogLevel): void {
    this.activeLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.activeLevel];
  }

  private formatMeta(meta: unknown[]): unknown[] {
    return meta.map((m) => {
      if (m instanceof Error) {
        return {
          name: m.name,
          message: m.message,
          stack: m.stack,
          ...(m as any),
        };
      }
      return m;
    });
  }

  trace(message: string, ...meta: unknown[]): void {
    if (this.shouldLog('trace')) {
      console.debug(`[TRACE] ${message}`, ...this.formatMeta(meta));
    }
  }

  debug(message: string, ...meta: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...this.formatMeta(meta));
    }
  }

  info(message: string, ...meta: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...this.formatMeta(meta));
    }
  }

  warn(message: string, ...meta: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...this.formatMeta(meta));
    }
  }

  error(message: string, ...meta: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...this.formatMeta(meta));
    }
  }
}

export const logger = new SharedLogger();
