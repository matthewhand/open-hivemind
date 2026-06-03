/**
 * BusinessKpiRecorder
 *
 * Bridges the live message pipeline ({@link MessageBus}) to the
 * {@link BusinessKpiCollector} so the business KPI dashboard surfaces real,
 * pipeline-derived metrics instead of always-zero defaults.
 *
 * Before this existed, {@link BusinessKpiCollector} defined 13 KPIs and a full
 * aggregation/summary API but was never instantiated, never fed any data, and
 * never exposed via a route — every KPI read back its default value of `0`.
 *
 * This recorder mirrors the existing {@link ActivityRecorder} pattern: it is a
 * thin, dependency-light bus subscriber that feeds the engagement/performance/
 * growth KPIs that CAN be derived from pipeline events. KPIs that require data
 * not present on the bus (per-request LLM cost, multi-day retention/churn) are
 * intentionally left unfed and are listed in {@link DEFERRED_KPI_IDS}.
 *
 * Feedable KPIs (from real pipeline events):
 *  - `total_interactions`   (growth, sum)        — every inbound message.
 *  - `daily_active_users`   (engagement, count)  — unique inbound user IDs.
 *  - `messages_per_user`    (engagement, avg)    — interactions / active users.
 *  - `average_response_time`(performance, avg)    — sent processingTime.
 *  - `request_success_rate` (performance, %)      — sent vs. errored responses.
 *
 * @module observability/BusinessKpiRecorder
 */

import Debug from 'debug';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext, MessageEvents } from '@src/events/types';
import { BusinessKpiCollector } from '../monitoring/BusinessKpiCollector';

const debug = Debug('app:business-kpi-recorder');

/**
 * KPI ids that this recorder cannot feed from the message bus alone and are
 * therefore left at their default values. Surfaced so the route / docs can be
 * explicit about which metrics are live vs. placeholder.
 */
export const DEFERRED_KPI_IDS = [
  'user_engagement_rate', // needs an "eligible users" denominator
  'llm_availability', // needs provider health probing
  'new_users_daily', // needs persistent first-seen tracking across restarts
  'llm_cost_per_request', // no per-request cost on the bus
  'daily_llm_spend', // see CostAnalyticsService instead
  'user_retention_7d', // needs multi-day persistent user history
  'churn_rate', // needs multi-day persistent user history
] as const;

export class BusinessKpiRecorder {
  /** Active users seen since the last reset (drives DAU / messages-per-user). */
  private activeUsers = new Set<string>();
  /** Running interaction count (mirrors total_interactions current value). */
  private interactions = 0;
  /** Successful + errored response counts for the success-rate percentile. */
  private successes = 0;
  private failures = 0;

  constructor(
    private bus: MessageBus,
    private collector: BusinessKpiCollector = BusinessKpiCollector.getInstance()
  ) {}

  /**
   * Subscribe to pipeline lifecycle events. Call once during bootstrap.
   */
  register(): void {
    this.bus.on('message:incoming', (ctx) => this.onIncoming(ctx));
    this.bus.on('message:sent', (ctx) => this.onSent(ctx));
    this.bus.on('message:error', (ctx) => this.onError(ctx));
    debug('BusinessKpiRecorder registered');
  }

  // -- Event handlers --------------------------------------------------------

  private onIncoming(ctx: MessageContext): void {
    try {
      this.interactions += 1;
      this.collector.recordKpiValue('total_interactions', this.interactions);

      const userId = this.userId(ctx);
      if (userId && userId !== 'unknown') {
        this.activeUsers.add(userId);
      }
      const dau = this.activeUsers.size;
      this.collector.recordKpiValue('daily_active_users', dau);
      if (dau > 0) {
        this.collector.recordKpiValue('messages_per_user', this.interactions / dau);
      }
    } catch (e) {
      // Recording must never break the pipeline.
      debug('onIncoming failed: %O', e);
    }
  }

  private onSent(ctx: MessageEvents['message:sent']): void {
    try {
      this.successes += 1;
      this.recordSuccessRate();

      const processingTime = this.processingTime(ctx);
      if (typeof processingTime === 'number' && processingTime >= 0) {
        this.collector.recordKpiValue('average_response_time', processingTime);
      }
    } catch (e) {
      debug('onSent failed: %O', e);
    }
  }

  private onError(_ctx: MessageEvents['message:error']): void {
    try {
      this.failures += 1;
      this.recordSuccessRate();
    } catch (e) {
      debug('onError failed: %O', e);
    }
  }

  // -- Helpers ---------------------------------------------------------------

  private recordSuccessRate(): void {
    const total = this.successes + this.failures;
    if (total === 0) return;
    this.collector.recordKpiValue('request_success_rate', (this.successes / total) * 100);
  }

  private processingTime(ctx: MessageContext): number | undefined {
    const receive = ctx.metadata?.receive as { receivedAt?: number } | undefined;
    return receive?.receivedAt ? Date.now() - receive.receivedAt : undefined;
  }

  private userId(ctx: MessageContext): string {
    try {
      return typeof ctx.message?.getAuthorId === 'function' ? ctx.message.getAuthorId() : 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
