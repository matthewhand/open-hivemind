import { redactSensitiveInfo } from './redactSensitiveInfo';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const KEY_VALUE_REGEX =
  /\b([A-Za-z0-9_.-]*(?:password|token|secret|key)[A-Za-z0-9_.-]*)\b\s*[:=]\s*([^\s,"']+)/gi;
const BEARER_TOKEN_REGEX = /\bBearer\s+([A-Za-z0-9\-._~+/]+=*)/gi;
const GENERIC_TOKEN_REGEX = /\b(?:sk|pk|rk|ak)_[A-Za-z0-9]{8,}\b/gi;
const DEFAULT_LEVEL: LogLevel =
  (process.env.LOG_LEVEL && parseLogLevel(process.env.LOG_LEVEL)) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

let activeLevel: LogLevel = DEFAULT_LEVEL;

function parseLogLevel(level?: string | null): LogLevel | undefined {
  if (!level) {
    return undefined;
  }
  const normalized = level.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(LOG_LEVEL_PRIORITY, normalized)) {
    return normalized as LogLevel;
  }
  return undefined;
}

function resolveLogLevel(level: string | LogLevel): LogLevel {
  if (typeof level === 'string') {
    const parsed = parseLogLevel(level);
    if (parsed) {
      return parsed;
    }
    logInternal('warn', `Invalid log level "${level}" provided, retaining "${activeLevel}".`);
    return activeLevel;
  }
  return level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[activeLevel];
}

function sanitizeLooseString(value: string): string {
  let sanitized = value.replace(KEY_VALUE_REGEX, (_, key: string) => `${key}=********`);
  sanitized = sanitized.replace(BEARER_TOKEN_REGEX, 'Bearer ********');
  sanitized = sanitized.replace(GENERIC_TOKEN_REGEX, '********');
  return sanitized;
}

function sanitizeError(error: Error, seen: WeakSet<object>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: error.name,
    message: sanitizeLooseString(error.message ?? ''),
  };

  if (error.stack) {
    base.stack = sanitizeLooseString(error.stack);
  }

  const errorAsObject = error as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(errorAsObject)) {
    if (key === 'name' || key === 'message' || key === 'stack') {
      continue;
    }
    base[key] = sanitizeValue(key, value, seen);
  }

  return base;
}

function sanitizeMap(map: Map<unknown, unknown>, seen: WeakSet<object>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let index = 0;
  for (const [key, value] of map.entries()) {
    const mapKey = typeof key === 'string' ? key : `entry_${index}`;
    result[mapKey] = sanitizeValue(mapKey, value, seen);
    index += 1;
  }
  return result;
}

function sanitizeSet(set: Set<unknown>, seen: WeakSet<object>): unknown[] {
  const result: unknown[] = [];
  let index = 0;
  for (const value of set.values()) {
    result.push(sanitizeValue(`set[${index}]`, value, seen));
    index += 1;
  }
  return result;
}

function sanitizeValue(key: string | undefined, value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return key ? redactSensitiveInfo(key, value) : sanitizeLooseString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return `<Buffer length=${value.length}>`;
  }

  if (value instanceof Error) {
    return sanitizeError(value, seen);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(`${key ?? 'item'}[${index}]`, item, seen));
  }

  if (value instanceof Map) {
    return sanitizeMap(value, seen);
  }

  if (value instanceof Set) {
    return sanitizeSet(value, seen);
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    if (seen.has(objectValue)) {
      return '[Circular]';
    }
    seen.add(objectValue);

    const sanitized: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(objectValue)) {
      sanitized[childKey] = sanitizeValue(childKey, childValue, seen);
    }

    seen.delete(objectValue);
    return sanitized;
  }

  return value;
}

function sanitizeArgs(args: unknown[]): unknown[] {
  const seen = new WeakSet<object>();
  return args.map((arg) => sanitizeValue(undefined, arg, seen));
}

function getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
  switch (level) {
    case 'trace':
      return console.trace.bind(console);
    case 'debug':
      return (console.debug || console.log).bind(console);
    case 'info':
      return (console.info || console.log).bind(console);
    case 'warn':
      return (console.warn || console.log).bind(console);
    case 'error':
      return (console.error || console.log).bind(console);
    default:
      return console.log.bind(console);
  }
}

function logInternal(level: LogLevel, ...args: unknown[]): void {
  if (!shouldLog(level)) {
    return;
  }
  const consoleMethod = getConsoleMethod(level);
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  consoleMethod(prefix, ...sanitizeArgs(args));
}

export function sanitizeForLogging<T>(value: T, key?: string): unknown {
  return sanitizeValue(key, value, new WeakSet<object>());
}

export interface LoggerInstance {
  trace: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export type LoggerApi = LoggerInstance & {
  setLevel: (level: string | LogLevel) => void;
  getLevel: () => LogLevel;
  withContext: (context: string) => LoggerInstance;
};

export const Logger: LoggerApi = {
  trace: (...args: unknown[]) => logInternal('trace', ...args),
  debug: (...args: unknown[]) => logInternal('debug', ...args),
  info: (...args: unknown[]) => logInternal('info', ...args),
  warn: (...args: unknown[]) => logInternal('warn', ...args),
  error: (...args: unknown[]) => logInternal('error', ...args),
  setLevel: (level: string | LogLevel) => {
    activeLevel = resolveLogLevel(level);
  },
  getLevel: () => activeLevel,
  withContext: (context: string): LoggerInstance => {
    const prefix = `[${context}]`;
    return {
      trace: (...args: unknown[]) => logInternal('trace', prefix, ...args),
      debug: (...args: unknown[]) => logInternal('debug', prefix, ...args),
      info: (...args: unknown[]) => logInternal('info', prefix, ...args),
      warn: (...args: unknown[]) => logInternal('warn', prefix, ...args),
      error: (...args: unknown[]) => logInternal('error', prefix, ...args),
    };
  },
};

export default Logger;
