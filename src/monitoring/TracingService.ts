import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

/**
 * Trace event types
 */
export type TraceEventType = 
  | 'request_start'
  | 'request_end'
  | 'message_received'
  | 'message_sent'
  | 'llm_request_start'
  | 'llm_request_end'
  | 'mcp_call_start'
  | 'mcp_call_end'
  | 'db_query_start'
  | 'db_query_end'
  | 'external_api_call_start'
  | 'external_api_call_end'
  | 'processing_step'
  | 'error';

/**
 * Span status
 */
export type SpanStatus = 'ok' | 'error' | 'timeout' | 'cancelled';

/**
 * Trace span
 */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: SpanStatus;
  tags: Record<string, string | number | boolean>;
  logs: SpanLog[];
  annotations: SpanAnnotation[];
}

/**
 * Span log entry
 */
export interface SpanLog {
  timestamp: number;
  message: string;
  fields?: Record<string, string | number | boolean>;
}

/**
 * Span annotation
 */
export interface SpanAnnotation {
  timestamp: number;
  value: string;
}

/**
 * Trace context for propagating across services
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

/**
 * Trace configuration
 */
export interface TracingConfig {
  serviceName: string;
  enabled: boolean;
  sampleRate: number;
  maxSpans: number;
  exportInterval: number;
  exporters: TraceExporter[];
}

/**
 * Trace exporter interface
 */
export interface TraceExporter {
  export(spans: TraceSpan[]): Promise<void>;
}

/**
 * Console exporter for development
 */
export class ConsoleTraceExporter implements TraceExporter {
  async export(spans: TraceSpan[]): Promise<void> {
    for (const span of spans) {
      console.log(`[TRACE] ${span.operationName} - ${span.duration?.toFixed(2)}ms - ${span.status}`);
    }
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TracingConfig = {
  serviceName: 'hivemind',
  enabled: true,
  sampleRate: 1.0, // 100% sampling for now
  maxSpans: 10000,
  exportInterval: 5000,
  exporters: [new ConsoleTraceExporter()],
};

/**
 * TracingService - Distributed tracing for request flows
 */
export class TracingService extends EventEmitter {
  private static instance: TracingService;
  private config: TracingConfig;
  private activeSpans: Map<string, TraceSpan> = new Map();
  private completedSpans: TraceSpan[] = [];
  private exportInterval: NodeJS.Timeout | null = null;
  private traceIdStack: Map<string, string[]> = new Map(); // For async context tracking

  private constructor(config: Partial<TracingConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<TracingConfig>): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService(config);
    }
    return TracingService.instance;
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, tags?: Record<string, string | number | boolean>): TraceContext {
    const traceId = randomUUID();
    const spanId = this.generateSpanId();
    
    const span: TraceSpan = {
      traceId,
      spanId,
      operationName,
      serviceName: this.config.serviceName,
      startTime: Date.now(),
      status: 'ok',
      tags: {
        'service.name': this.config.serviceName,
        ...tags,
      },
      logs: [],
      annotations: [],
    };

    this.activeSpans.set(spanId, span);

    const context: TraceContext = {
      traceId,
      spanId,
      sampled: this.shouldSample(),
    };

    this.emit('traceStart', context);
    return context;
  }

  /**
   * Start a child span within an existing trace
   */
  startSpan(
    operationName: string,
    parentContext: TraceContext,
    tags?: Record<string, string | number | boolean>
  ): TraceSpan {
    const spanId = this.generateSpanId();
    
    const span: TraceSpan = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      operationName,
      serviceName: this.config.serviceName,
      startTime: Date.now(),
      status: 'ok',
      tags: {
        'service.name': this.config.serviceName,
        ...tags,
      },
      logs: [],
      annotations: [],
    };

    this.activeSpans.set(spanId, span);

    this.emit('spanStart', span);
    return span;
  }

  /**
   * End a span
   */
  endSpan(spanId: string, status: SpanStatus = 'ok', tags?: Record<string, string | number | boolean>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (tags) {
      Object.assign(span.tags, tags);
    }

    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    // Trim if exceeds max
    if (this.completedSpans.length > this.config.maxSpans) {
      this.completedSpans = this.completedSpans.slice(-this.config.maxSpans);
    }

    this.emit('spanEnd', span);
  }

  /**
   * Add log to a span
   */
  logSpan(spanId: string, message: string, fields?: Record<string, string | number | boolean>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.logs.push({
      timestamp: Date.now(),
      message,
      fields,
    });
  }

  /**
   * Add tag to a span
   */
  tagSpan(spanId: string, key: string, value: string | number | boolean): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.tags[key] = value;
  }

  /**
   * Add annotation to a span
   */
  annotateSpan(spanId: string, value: string): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.annotations.push({
      timestamp: Date.now(),
      value,
    });
  }

  /**
   * Record an error in a span
   */
  recordError(spanId: string, error: Error, tags?: Record<string, string | number | boolean>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.status = 'error';
    span.tags['error'] = true;
    span.tags['error.message'] = error.message;
    span.tags['error.stack'] = error.stack || '';

    if (tags) {
      Object.assign(span.tags, tags);
    }

    span.logs.push({
      timestamp: Date.now(),
      message: error.message,
      fields: { 'error.stack': error.stack },
    });

    this.emit('error', { span, error });
  }

  /**
   * Get trace context from headers (for propagation)
   */
  extractContext(headers: Record<string, string | string[] | undefined>): TraceContext | null {
    const traceId = headers['x-trace-id'] as string || headers['traceparent'] as string;
    const spanId = headers['x-span-id'] as string;
    const parentSpanId = headers['x-parent-span-id'] as string;

    if (!traceId || !spanId) return null;

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled: true,
    };
  }

  /**
   * Inject context into headers (for propagation)
   */
  injectContext(context: TraceContext): Record<string, string> {
    return {
      'x-trace-id': context.traceId,
      'x-span-id': context.spanId,
      'x-parent-span-id': context.parentSpanId || '',
    };
  }

  /**
   * Get all completed spans
   */
  getCompletedSpans(): TraceSpan[] {
    return [...this.completedSpans];
  }

  /**
   * Get spans for a specific trace
   */
  getTraceSpans(traceId: string): TraceSpan[] {
    return this.completedSpans.filter(span => span.traceId === traceId);
  }

  /**
   * Get active spans
   */
  getActiveSpans(): TraceSpan[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Get trace summary
   */
  getTraceSummary(): {
    totalTraces: number;
    activeSpans: number;
    completedSpans: number;
    errorCount: number;
    averageDuration: number;
  } {
    const errorCount = this.completedSpans.filter(s => s.status === 'error').length;
    const durations = this.completedSpans.filter(s => s.duration !== undefined).map(s => s.duration!);
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Count unique traces
    const traceIds = new Set(this.completedSpans.map(s => s.traceId));

    return {
      totalTraces: traceIds.size,
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.length,
      errorCount,
      averageDuration,
    };
  }

  /**
   * Should sample this request
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Generate a span ID
   */
  private generateSpanId(): string {
    return randomUUID().substring(0, 16);
  }

  /**
   * Start periodic export
   */
  startExporting(): void {
    if (this.exportInterval) return;

    this.exportInterval = setInterval(async () => {
      await this.exportSpans();
    }, this.config.exportInterval);
  }

  /**
   * Stop periodic export
   */
  stopExporting(): void {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
      this.exportInterval = null;
    }
  }

  /**
   * Export completed spans
   */
  async exportSpans(): Promise<void> {
    if (this.completedSpans.length === 0) return;

    const spansToExport = [...this.completedSpans];
    this.completedSpans = [];

    for (const exporter of this.config.exporters) {
      try {
        await exporter.export(spansToExport);
      } catch (error) {
        console.error('Failed to export spans:', error);
      }
    }
  }

  /**
   * Clear all spans
   */
  clear(): void {
    this.activeSpans.clear();
    this.completedSpans = [];
    this.emit('cleared');
  }

  /**
   * Get trace tree as JSON for visualization
   */
  getTraceTree(traceId: string): object {
    const spans = this.getTraceSpans(traceId);
    const spanMap = new Map(spans.map(s => [s.spanId, s]));

    // Build tree structure
    const rootSpans = spans.filter(s => !s.parentSpanId || !spanMap.has(s.parentSpanId));

    const buildTree = (span: TraceSpan): object => {
      const children = spans.filter(s => s.parentSpanId === span.spanId);
      return {
        ...span,
        children: children.map(buildTree),
      };
    };

    return {
      traceId,
      spans: rootSpans.map(buildTree),
      totalSpans: spans.length,
    };
  }
}

export default TracingService;
