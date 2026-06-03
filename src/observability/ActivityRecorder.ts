/**
 * ActivityRecorder
 *
 * Bridges the live message pipeline ({@link MessageBus}) to the persistent
 * {@link ActivityLogger} (JSONL) and the live {@link WebSocketService} feed.
 *
 * Before this existed, `ActivityLogger.log()` was only ever called by the
 * {@link DemoActivitySimulator}, so the activity feed surfaced by
 * `DashboardService.getActivity` / the WebUI ActivityPage was empty whenever
 * the real pipeline (not demo mode) was running. This recorder subscribes to
 * the same bus events the {@link PipelineTracer} uses and records a real
 * `MessageFlowEvent` for every message that enters and leaves the pipeline.
 *
 * It is intentionally a thin, dependency-light bus subscriber that mirrors the
 * existing observability pattern rather than threading logging calls through
 * each of the five pipeline stages.
 *
 * @module observability/ActivityRecorder
 */

import { randomUUID } from 'crypto';
import Debug from 'debug';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext, MessageEvents } from '@src/events/types';
import { ActivityLogger } from '../server/services/ActivityLogger';
import type { MessageFlowEvent } from '../server/services/websocket/types';

const debug = Debug('app:activity-recorder');

/** Subset of {@link MessageFlowEvent} that the caller supplies. */
type RecorderSink = Pick<ActivityLogger, 'log'>;

/** Optional live-feed sink (WebSocketService). Kept loose to avoid a hard dep. */
interface FlowSink {
  recordMessageFlow(event: Omit<MessageFlowEvent, 'id' | 'timestamp'>): void;
}

export class ActivityRecorder {
  constructor(
    private bus: MessageBus,
    private activityLogger: RecorderSink = ActivityLogger.getInstance(),
    private flowSink?: FlowSink
  ) {}

  /**
   * Subscribe to pipeline lifecycle events. Call once during bootstrap.
   */
  register(): void {
    this.bus.on('message:incoming', (ctx) => this.onIncoming(ctx));
    this.bus.on('message:sent', (ctx) => this.onSent(ctx));
    this.bus.on('message:error', (ctx) => this.onError(ctx));
    debug('ActivityRecorder registered');
  }

  // -- Event handlers --------------------------------------------------------

  private onIncoming(ctx: MessageContext): void {
    this.record(ctx, {
      messageType: 'incoming',
      contentLength: this.textLength(ctx),
      status: 'success',
    });
  }

  private onSent(ctx: MessageEvents['message:sent']): void {
    const receivedAt = this.receivedAt(ctx);
    this.record(ctx, {
      messageType: 'outgoing',
      contentLength: ctx.responseText ? ctx.responseText.length : 0,
      status: 'success',
      processingTime: receivedAt ? Date.now() - receivedAt : undefined,
    });
  }

  private onError(ctx: MessageEvents['message:error']): void {
    const receivedAt = this.receivedAt(ctx);
    this.record(ctx, {
      messageType: 'outgoing',
      contentLength: 0,
      status: 'error',
      errorMessage: ctx.error?.message,
      processingTime: receivedAt ? Date.now() - receivedAt : undefined,
    });
  }

  // -- Helpers ---------------------------------------------------------------

  private record(
    ctx: MessageContext,
    partial: Pick<MessageFlowEvent, 'messageType' | 'contentLength' | 'status'> &
      Partial<Pick<MessageFlowEvent, 'processingTime' | 'errorMessage'>>
  ): void {
    const event: MessageFlowEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      botName: ctx.botName,
      provider: ctx.platform,
      llmProvider: this.llmProvider(ctx),
      channelId: ctx.channelId,
      userId: this.userId(ctx),
      ...partial,
    };

    try {
      this.activityLogger.log(event);
    } catch (e) {
      // Logging must never break the pipeline.
      debug('ActivityLogger.log failed: %O', e);
    }

    if (this.flowSink) {
      try {
        // recordMessageFlow assigns its own id/timestamp.
        const { id: _id, timestamp: _ts, ...rest } = event;
        this.flowSink.recordMessageFlow(rest);
      } catch (e) {
        debug('recordMessageFlow failed: %O', e);
      }
    }
  }

  private textLength(ctx: MessageContext): number {
    try {
      return typeof ctx.message?.getText === 'function' ? ctx.message.getText().length : 0;
    } catch {
      return 0;
    }
  }

  private userId(ctx: MessageContext): string {
    try {
      return typeof ctx.message?.getAuthorId === 'function' ? ctx.message.getAuthorId() : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private llmProvider(ctx: MessageContext): string | undefined {
    const cfg = ctx.botConfig || {};
    return (cfg.LLM_PROVIDER as string) || (cfg.llmProvider as string) || undefined;
  }

  private receivedAt(ctx: MessageContext): number | undefined {
    const receive = ctx.metadata?.receive as { receivedAt?: number } | undefined;
    return receive?.receivedAt;
  }
}
