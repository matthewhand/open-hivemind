/**
 * MetricsRecorder
 *
 * Bridges the live message pipeline ({@link MessageBus}) to the global
 * {@link MetricsCollector} so the `/metrics` endpoints and dashboards surface
 * real message throughput and response times.
 *
 * Before this existed, `MetricsCollector.incrementMessages()` and
 * `recordResponseTime()` were only ever called by the demo-mode activity
 * simulator — `hivemind_messages_total` and `hivemind_response_time_ms` stayed
 * at zero outside demo mode.
 *
 * This recorder mirrors the {@link BusinessKpiRecorder} pattern: a thin,
 * dependency-light bus subscriber that feeds the collector from real pipeline
 * events:
 *
 *  - `message:incoming` — a message was received → `incrementMessages()`.
 *  - `message:sent`     — a reply was delivered  → `incrementMessages()`.
 *  - `message:response` — inference completed    → `recordResponseTime()`
 *    using the inference duration captured by the InferenceStage in
 *    `ctx.metadata.inference.durationMs`.
 *
 * @module observability/MetricsRecorder
 */

import Debug from 'debug';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import { MetricsCollector } from '../monitoring/MetricsCollector';

const debug = Debug('app:metrics-recorder');

export class MetricsRecorder {
  constructor(
    private bus: MessageBus,
    private collector: MetricsCollector = MetricsCollector.getInstance()
  ) {}

  /**
   * Subscribe to pipeline lifecycle events. Call once during bootstrap.
   */
  register(): void {
    this.bus.on('message:incoming', (ctx) => this.onIncoming(ctx));
    this.bus.on('message:response', (ctx) => this.onResponse(ctx));
    this.bus.on('message:sent', (ctx) => this.onSent(ctx));
    debug('MetricsRecorder registered');
  }

  // -- Event handlers --------------------------------------------------------

  private onIncoming(_ctx: MessageContext): void {
    try {
      this.collector.incrementMessages();
    } catch (e) {
      // Recording must never break the pipeline.
      debug('onIncoming failed: %O', e);
    }
  }

  private onResponse(ctx: MessageContext): void {
    try {
      const durationMs = this.inferenceDurationMs(ctx);
      if (typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 0) {
        this.collector.recordResponseTime(durationMs);
      }
    } catch (e) {
      debug('onResponse failed: %O', e);
    }
  }

  private onSent(_ctx: MessageContext): void {
    try {
      this.collector.incrementMessages();
    } catch (e) {
      debug('onSent failed: %O', e);
    }
  }

  // -- Helpers ---------------------------------------------------------------

  /** Inference duration captured by the InferenceStage, if present. */
  private inferenceDurationMs(ctx: MessageContext): number | undefined {
    const inference = ctx.metadata?.inference as { durationMs?: number } | undefined;
    return inference?.durationMs;
  }
}
