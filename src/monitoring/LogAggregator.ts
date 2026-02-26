import { EventEmitter } from 'events';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log source
 */
export type LogSource = 'server' | 'discord' | 'slack' | 'mattermost' | 'llm' | 'mcp' | 'database' | 'security' | 'custom';

/**
 * Aggregated log entry
 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: LogSource;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
  spanId?: string;
  botName?: string;
  provider?: string;
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Log query filters
 */
export interface LogQuery {
  startTime?: number;
  endTime?: number;
  levels?: LogLevel[];
  sources?: LogSource[];
  search?: string;
  traceId?: string;
  botName?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}

/**
 * Log statistics
 */
export interface LogStats {
  totalLogs: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<LogSource, number>;
  errorRate: number;
  warningsRate: number;
  recentErrors: LogEntry[];
  timeSeries: { timestamp: number; count: number }[];
}

/**
 * Alert condition for logs
 */
export interface LogAlertCondition {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    type: 'error_rate' | 'error_count' | 'warning_rate' | 'pattern_match' | 'keyword';
    threshold?: number;
    timeWindow?: number;
    pattern?: string;
    keyword?: string;
  };
  cooldown: number;
  lastTriggered?: number;
}

/**
 * LogAggregator - Log aggregation and analysis capabilities
 */
export class LogAggregator extends EventEmitter {
  private static instance: LogAggregator;
  private logs: LogEntry[] = [];
  private maxLogs: number = 100000;
  private queryIndexes: Map<string, LogEntry[]> = new Map();
  private alertConditions: Map<string, LogAlertCondition> = new Map();
  private idCounter: number = 0;

  private constructor(maxLogs: number = 100000) {
    super();
    this.maxLogs = maxLogs;
    this.initializeDefaultAlertConditions();
  }

  /**
   * Get singleton instance
   */
  static getInstance(maxLogs?: number): LogAggregator {
    if (!LogAggregator.instance) {
      LogAggregator.instance = new LogAggregator(maxLogs);
    }
    return LogAggregator.instance;
  }

  /**
   * Initialize default alert conditions
   */
  private initializeDefaultAlertConditions(): void {
    this.registerAlertCondition({
      id: 'high_error_rate',
      name: 'High Error Rate',
      enabled: true,
      condition: { type: 'error_rate', threshold: 10, timeWindow: 60000 },
      cooldown: 300000,
    });

    this.registerAlertCondition({
      id: 'critical_errors',
      name: 'Critical Errors',
      enabled: true,
      condition: { type: 'error_count', threshold: 5, timeWindow: 60000 },
      cooldown: 60000,
    });

    this.registerAlertCondition({
      id: 'auth_failures',
      name: 'Authentication Failures',
      enabled: true,
      condition: { type: 'keyword', keyword: 'authentication failed', timeWindow: 300000 },
      cooldown: 300000,
    });
  }

  /**
   * Register an alert condition
   */
  registerAlertCondition(condition: LogAlertCondition): void {
    this.alertConditions.set(condition.id, condition);
    this.emit('alertConditionRegistered', condition);
  }

  /**
   * Log an entry
   */
  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): string {
    const id = `log_${++this.idCounter}_${Date.now()}`;
    const logEntry: LogEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
    };

    this.logs.push(logEntry);

    // Trim if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Update indexes
    this.updateIndexes(logEntry);

    // Check alert conditions
    this.checkAlertConditions(logEntry);

    this.emit('log', logEntry);
    return id;
  }

  /**
   * Convenience methods for logging
   */
  debug(message: string, metadata?: Record<string, any>, source: LogSource = 'server'): string {
    return this.log({ level: 'debug', source, message, metadata });
  }

  info(message: string, metadata?: Record<string, any>, source: LogSource = 'server'): string {
    return this.log({ level: 'info', source, message, metadata });
  }

  warn(message: string, metadata?: Record<string, any>, source: LogSource = 'server'): string {
    return this.log({ level: 'warn', source, message, metadata });
  }

  error(message: string, metadata?: Record<string, any>, source: LogSource = 'server'): string {
    return this.log({ level: 'error', source, message, metadata });
  }

  fatal(message: string, metadata?: Record<string, any>, source: LogSource = 'server'): string {
    return this.log({ level: 'fatal', source, message, metadata });
  }

  /**
   * Update query indexes
   */
  private updateIndexes(entry: LogEntry): void {
    // Index by level
    const levelKey = `level_${entry.level}`;
    if (!this.queryIndexes.has(levelKey)) {
      this.queryIndexes.set(levelKey, []);
    }
    this.queryIndexes.get(levelKey)!.push(entry);

    // Index by source
    const sourceKey = `source_${entry.source}`;
    if (!this.queryIndexes.has(sourceKey)) {
      this.queryIndexes.set(sourceKey, []);
    }
    this.queryIndexes.get(sourceKey)!.push(entry);

    // Index by trace
    if (entry.traceId) {
      const traceKey = `trace_${entry.traceId}`;
      if (!this.queryIndexes.has(traceKey)) {
        this.queryIndexes.set(traceKey, []);
      }
      this.queryIndexes.get(traceKey)!.push(entry);
    }
  }

  /**
   * Query logs
   */
  query(query: LogQuery): LogEntry[] {
    let results = this.logs;

    if (query.startTime) {
      results = results.filter(log => log.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter(log => log.timestamp <= query.endTime!);
    }
    if (query.levels && query.levels.length > 0) {
      results = results.filter(log => query.levels!.includes(log.level));
    }
    if (query.sources && query.sources.length > 0) {
      results = results.filter(log => query.sources!.includes(log.source));
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      results = results.filter(log => 
        log.message.toLowerCase().includes(search) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(search))
      );
    }
    if (query.traceId) {
      results = results.filter(log => log.traceId === query.traceId);
    }
    if (query.botName) {
      results = results.filter(log => log.botName === query.botName);
    }
    if (query.provider) {
      results = results.filter(log => log.provider === query.provider);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Get log statistics
   */
  getStats(timeWindowMs: number = 3600000): LogStats {
    const cutoff = Date.now() - timeWindowMs;
    const recentLogs = this.logs.filter(log => log.timestamp >= cutoff);

    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    const bySource: Record<LogSource, number> = {
      server: 0,
      discord: 0,
      slack: 0,
      mattermost: 0,
      llm: 0,
      mcp: 0,
      database: 0,
      security: 0,
      custom: 0,
    };

    for (const log of recentLogs) {
      byLevel[log.level]++;
      bySource[log.source]++;
    }

    const total = recentLogs.length;
    const errorCount = byLevel.error + byLevel.fatal;
    const warningCount = byLevel.warn;

    const recentErrors = this.logs
      .filter(log => log.level === 'error' || log.level === 'fatal')
      .slice(0, 10);

    // Time series
    const bucketSize = Math.floor(timeWindowMs / 60); // 60 buckets
    const timeSeries: { timestamp: number; count: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const bucketStart = cutoff + (i * bucketSize);
      const bucketEnd = bucketStart + bucketSize;
      const count = recentLogs.filter(log => log.timestamp >= bucketStart && log.timestamp < bucketEnd).length;
      timeSeries.push({ timestamp: bucketStart, count });
    }

    return {
      totalLogs: total,
      byLevel,
      bySource,
      errorRate: total > 0 ? (errorCount / total) * 100 : 0,
      warningsRate: total > 0 ? (warningCount / total) * 100 : 0,
      recentErrors,
      timeSeries,
    };
  }

  /**
   * Get logs by trace
   */
  getLogsByTrace(traceId: string): LogEntry[] {
    return this.logs.filter(log => log.traceId === traceId).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions(entry: LogEntry): void {
    for (const [id, condition] of this.alertConditions) {
      if (!condition.enabled) continue;

      // Check cooldown
      if (condition.lastTriggered && Date.now() - condition.lastTriggered < condition.cooldown) {
        continue;
      }

      const shouldTrigger = this.evaluateCondition(condition, entry);
      if (shouldTrigger) {
        this.emit('alertTriggered', {
          condition,
          entry,
        });
        condition.lastTriggered = Date.now();
      }
    }
  }

  /**
   * Evaluate an alert condition
   */
  private evaluateCondition(condition: LogAlertCondition, entry: LogEntry): boolean {
    const { type, threshold, timeWindow, pattern, keyword } = condition.condition;
    const windowStart = Date.now() - (timeWindow || 60000);

    switch (type) {
      case 'error_rate': {
        if (entry.level !== 'error' && entry.level !== 'fatal') return false;
        const recentErrors = this.logs.filter(
          log => (log.level === 'error' || log.level === 'fatal') && log.timestamp >= windowStart
        ).length;
        return threshold ? recentErrors >= threshold : false;
      }

      case 'error_count': {
        if (entry.level !== 'error' && entry.level !== 'fatal') return false;
        return true;
      }

      case 'warning_rate': {
        if (entry.level !== 'warn') return false;
        const recentWarnings = this.logs.filter(
          log => log.level === 'warn' && log.timestamp >= windowStart
        ).length;
        return threshold ? recentWarnings >= threshold : false;
      }

      case 'pattern_match': {
        if (!pattern) return false;
        const regex = new RegExp(pattern, 'i');
        return regex.test(entry.message);
      }

      case 'keyword': {
        if (!keyword) return false;
        return entry.message.toLowerCase().includes(keyword.toLowerCase());
      }

      default:
        return false;
    }
  }

  /**
   * Get all alert conditions
   */
  getAlertConditions(): LogAlertCondition[] {
    return Array.from(this.alertConditions.values());
  }

  /**
   * Enable/disable alert condition
   */
  setAlertConditionEnabled(id: string, enabled: boolean): void {
    const condition = this.alertConditions.get(id);
    if (condition) {
      condition.enabled = enabled;
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'error' || log.level === 'fatal')
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.queryIndexes.clear();
    this.emit('cleared');
  }

  /**
   * Get total log count
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Export logs
   */
  exportLogs(query?: LogQuery): LogEntry[] {
    return query ? this.query(query) : [...this.logs];
  }
}

export default LogAggregator;
