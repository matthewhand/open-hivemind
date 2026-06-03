/**
 * Observability layer for the message processing pipeline.
 *
 * Subscribes to {@link MessageBus} events and builds timing spans for each
 * pipeline stage.  Completed traces are kept in a ring buffer (last 100) so
 * callers can inspect recent performance without external tracing infra.
 *
 * ```ts
 * const bus = MessageBus.getInstance();
 * const tracer = new PipelineTracer(bus);
 * tracer.register();
 *
 * // Later…
 * console.log(tracer.getStats());
 * ```
 *
 * @module observability/PipelineTracer
 */

import { randomUUID } from 'crypto';
import Debug from 'debug';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext, MessageEvents } from '@src/events/types';
import { AnomalyDetectionService } from '../services/AnomalyDetectionService';

const debug = Debug('app:pipeline-tracer');

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Span {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
  children: Span[];
}

export interface Trace {
  traceId: string;
  rootSpan: Span;
  spans: Span[];
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
}

export interface PipelineStats {
  totalTraces: number;
  avgDurationMs: number;
  stageAvgMs: Record<string, number>;
  errorRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSpan(
  name: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  return {
    id: randomUUID(),
    name,
    startTime: Date.now(),
    status: 'ok',
    attributes,
    children: [],
  };
}

function closeSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
  span.status = status;
}

// ---------------------------------------------------------------------------
// PipelineTracer
// ---------------------------------------------------------------------------

export type TraceCompletedCallback = (trace: Trace) => void;

export class PipelineTracer {
  private static instance: PipelineTracer | null = null;
  private activeTraces = new Map<string, Trace>();
  private completedTraces: Trace[] = [];
  private maxCompleted = 100;
  private traceCompletedCallbacks: TraceCompletedCallback[] = [];

  constructor(private bus: MessageBus) {
    PipelineTracer.instance = this;
  }

  public static getInstance(): PipelineTracer | null {
    return PipelineTracer.instance;
  }

  /**
   * Register a callback to be invoked whenever a trace completes.
   * Used by TraceExportManager to export traces to external backends.
   */
  onTraceCompleted(callback: TraceCompletedCallback): void {
    this.traceCompletedCallbacks.push(callback);
  }

  /**
   * Subscribe to all pipeline events on the bus.
   * Call once during application bootstrap.
   */
  register(): void {
    this.bus.on('message:incoming', (ctx) => this.onIncoming(ctx));
    this.bus.on('message:validated', (ctx) => this.onStageComplete(ctx, 'receive', 'decision'));
    this.bus.on('message:accepted', (ctx) => this.onStageComplete(ctx, 'decision', 'enrich'));
    this.bus.on('message:skipped', (ctx) => this.onSkipped(ctx));
    this.bus.on('message:enriched', (ctx) => this.onStageComplete(ctx, 'enrich', 'inference'));
    this.bus.on('message:response', (ctx) => this.onStageComplete(ctx, 'inference', 'send'));
    this.bus.on('message:sent', (ctx) => this.onSent(ctx));
    this.bus.on('message:error', (ctx) => this.onError(ctx));
    debug('PipelineTracer registered');
  }

  // -- Event handlers --------------------------------------------------------

  /**
   * Unique key for a trace, combining channel and message IDs to support
   * concurrent processing in the same channel.
   */
  private getTraceKey(ctx: { channelId: string; message?: { getMessageId(): string } }): string {
    if (ctx.message) {
      return `${ctx.channelId}:${ctx.message.getMessageId()}`;
    }
    return ctx.channelId;
  }

  private onIncoming(ctx: MessageContext): void {
    const traceId = randomUUID();
    const now = Date.now();
    const key = this.getTraceKey(ctx);

    const rootSpan = createSpan('pipeline', {
      channelId: ctx.channelId,
      messageId: ctx.message.getMessageId(),
      platform: ctx.platform,
      botName: ctx.botName,
    });
    rootSpan.startTime = now;

    const receiveSpan = createSpan('receive');
    receiveSpan.startTime = now;
    rootSpan.children.push(receiveSpan);

    const trace: Trace = {
      traceId,
      rootSpan,
      spans: [rootSpan, receiveSpan],
      startTime: now,
    };

    // Store by both specific key AND channelId for backward compatibility
    this.activeTraces.set(key, trace);
    if (key !== ctx.channelId) {
      this.activeTraces.set(ctx.channelId, trace);
    }
    debug('Trace started %s for key %s', traceId, key);
  }

  private onStageComplete(ctx: MessageContext, closeName: string, openName: string): void {
    const key = this.getTraceKey(ctx);
    const trace = this.activeTraces.get(key);
    if (!trace) {
      debug('No active trace for key %s (stage %s -> %s)', key, closeName, openName);
      return;
    }

    const closing = this.findSpan(trace, closeName);
    if (closing) {
      // Capture stage-specific metadata from ctx.metadata
      const stageMeta = ctx.metadata[closeName];
      if (stageMeta && typeof stageMeta === 'object') {
        Object.entries(stageMeta).forEach(([k, v]) => {
          closing.attributes[k] = String(v);
        });
      }

      closeSpan(closing);
      debug('Span %s closed (%dms)', closeName, closing.durationMs);
    }

    const nextSpan = createSpan(openName);
    trace.rootSpan.children.push(nextSpan);
    trace.spans.push(nextSpan);
    debug('Span %s opened', openName);
  }

  private onSkipped(ctx: MessageContext & { reason: string }): void {
    const key = this.getTraceKey(ctx);
    const trace = this.activeTraces.get(key);
    if (!trace) {
      debug('No active trace for key %s (skipped)', key);
      return;
    }

    const decision = this.findSpan(trace, 'decision');
    if (decision) {
      // Capture decision metadata
      const stageMeta = ctx.metadata.decision;
      if (stageMeta && typeof stageMeta === 'object') {
        Object.entries(stageMeta).forEach(([k, v]) => {
          decision.attributes[k] = String(v);
        });
      }

      closeSpan(decision);
      decision.attributes.skipped = true;
      decision.attributes.reason = ctx.reason;
      debug('Span decision closed (skipped, %dms)', decision.durationMs);
    }

    this.completeTrace(ctx, trace);
  }

  private onSent(ctx: MessageContext): void {
    const key = this.getTraceKey(ctx);
    const trace = this.activeTraces.get(key);
    if (!trace) {
      debug('No active trace for key %s (sent)', key);
      return;
    }

    const sendSpan = this.findSpan(trace, 'send');
    if (sendSpan) {
      // Capture send metadata
      const stageMeta = ctx.metadata.send;
      if (stageMeta && typeof stageMeta === 'object') {
        Object.entries(stageMeta).forEach(([k, v]) => {
          sendSpan.attributes[k] = String(v);
        });
      }

      closeSpan(sendSpan);
      debug('Span send closed (%dms)', sendSpan.durationMs);
    }

    this.completeTrace(ctx, trace);
  }

  private onError(ctx: MessageEvents['message:error']): void {
    const key = this.getTraceKey(ctx);
    const trace = this.activeTraces.get(key);
    if (!trace) {
      debug('No active trace for key %s (error)', key);
      return;
    }

    // Mark the last open span as error
    const openSpan = this.findLastOpenSpan(trace);
    if (openSpan) {
      closeSpan(openSpan, 'error');
      openSpan.attributes['error.message'] = ctx.error.message;
      openSpan.attributes['error.stage'] = ctx.stage;
      debug('Span %s closed with error (%dms)', openSpan.name, openSpan.durationMs);
    }

    trace.rootSpan.status = 'error';
    this.completeTrace(ctx, trace);
  }

  // -- Query API -------------------------------------------------------------

  /**
   * Return the in-progress trace for a specific message context or channel ID.
   */
  getActiveTrace(
    target: string | { channelId: string; message?: { getMessageId(): string } }
  ): Trace | undefined {
    if (typeof target === 'string') {
      return this.activeTraces.get(target);
    }
    return this.activeTraces.get(this.getTraceKey(target));
  }

  /**
   * Return all completed traces (most recent last, capped at {@link maxCompleted}).
   */
  getCompletedTraces(limit?: number): readonly Trace[] {
    if (limit !== undefined && limit >= 0) {
      return this.completedTraces.slice(-limit);
    }
    return this.completedTraces;
  }

  /**
   * Compute aggregate statistics from the completed-trace ring buffer.
   */
  getStats(): PipelineStats {
    const traces = this.completedTraces;
    const total = traces.length;

    if (total === 0) {
      return { totalTraces: 0, avgDurationMs: 0, stageAvgMs: {}, errorRate: 0 };
    }

    let totalDuration = 0;
    let errorCount = 0;
    const stageTotals: Record<string, number> = {};
    const stageCounts: Record<string, number> = {};

    for (const trace of traces) {
      totalDuration += trace.totalDurationMs ?? 0;

      if (trace.rootSpan.status === 'error') {
        errorCount++;
      }

      for (const span of trace.spans) {
        // Skip the root "pipeline" span — it's the aggregate, not a stage.
        if (span.name === 'pipeline') continue;
        if (span.durationMs === null || span.durationMs === undefined) continue;

        stageTotals[span.name] = (stageTotals[span.name] ?? 0) + span.durationMs;
        stageCounts[span.name] = (stageCounts[span.name] ?? 0) + 1;
      }
    }

    const stageAvgMs: Record<string, number> = {};
    for (const name of Object.keys(stageTotals)) {
      stageAvgMs[name] = Math.round(stageTotals[name] / stageCounts[name]);
    }

    return {
      totalTraces: total,
      avgDurationMs: Math.round(totalDuration / total),
      stageAvgMs,
      errorRate: errorCount / total,
    };
  }

  /**
   * Clear all active and completed traces.  Useful in tests.
   */
  reset(): void {
    this.activeTraces.clear();
    this.completedTraces = [];
    debug('PipelineTracer reset');
  }

  // -- Private helpers -------------------------------------------------------

  private findSpan(trace: Trace, name: string): Span | undefined {
    return trace.spans.find((s) => s.name === name);
  }

  private findLastOpenSpan(trace: Trace): Span | undefined {
    // Walk backwards to find the most recently opened span without an endTime.
    for (let i = trace.spans.length - 1; i >= 0; i--) {
      if (trace.spans[i].endTime === null || trace.spans[i].endTime === undefined)
        return trace.spans[i];
    }
    return undefined;
  }

  private completeTrace(
    ctx: { channelId: string; message?: { getMessageId(): string } },
    trace: Trace
  ): void {
    closeSpan(trace.rootSpan, trace.rootSpan.status);
    trace.endTime = trace.rootSpan.endTime;
    trace.totalDurationMs = trace.rootSpan.durationMs;

    const key = this.getTraceKey(ctx);
    this.activeTraces.delete(key);
    this.activeTraces.delete(ctx.channelId); // Clean up both possible keys

    this.completedTraces.push(trace);

    // Ring buffer: evict oldest when over capacity.
    if (this.completedTraces.length > this.maxCompleted) {
      this.completedTraces.shift();
    }

    debug(
      'Trace %s completed (%dms, status=%s)',
      trace.traceId,
      trace.totalDurationMs,
      trace.rootSpan.status
    );

    // Notify registered callbacks (e.g. TraceExportManager)
    for (const cb of this.traceCompletedCallbacks) {
      try {
        cb(trace);
      } catch (err) {
        debug('TraceCompleted callback error: %O', err);
      }
    }

    // Report to AnomalyDetectionService
    try {
      const ads = AnomalyDetectionService.getInstance();
      ads.addDataPoint('responseTime', trace.totalDurationMs ?? 0, trace.traceId);
      if (trace.rootSpan.status === 'error') {
        ads.addDataPoint('errors', 1, trace.traceId);
      } else {
        ads.addDataPoint('errors', 0, trace.traceId);
      }
    } catch (err) {
      debug('Failed to report metrics to AnomalyDetectionService: %O', err);
    }
  }
}

/**
 * Helper to get the current global tracer instance
 */
export function getActiveTracer(): PipelineTracer | null {
  return PipelineTracer.getInstance();
}
