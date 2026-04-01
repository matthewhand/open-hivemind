/**
 * Pipeline Stage 2 — DecisionStage
 *
 * Decides whether the bot should reply to a validated message by delegating
 * to an injectable {@link DecisionStrategy}.  This strategy pattern lets
 * callers wrap the existing `shouldReplyToMessage()` logic (or any other
 * heuristic) without modifying it.
 *
 * **Event flow:**
 *
 * ```
 *   message:validated  ──►  DecisionStage  ──►  message:accepted
 *                                           └──►  message:skipped
 *                                           └──►  message:error
 * ```
 *
 * @module pipeline/DecisionStage
 */

import Debug from 'debug';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext, ReplyDecision } from '@src/events/types';

const debug = Debug('app:pipeline:decision');

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

/**
 * Pluggable strategy that encapsulates the "should the bot reply?" decision.
 *
 * Implementations may consult channel rules, user allow/deny lists, rate
 * limits, random-chance thresholds, or any other criteria.  The strategy
 * receives the full {@link MessageContext} and returns a {@link ReplyDecision}.
 */
export interface DecisionStrategy {
  shouldReply(ctx: MessageContext): Promise<ReplyDecision>;
}

// ---------------------------------------------------------------------------
// DecisionStage
// ---------------------------------------------------------------------------

/**
 * Subscribes to `message:validated` events, runs the injected
 * {@link DecisionStrategy}, and emits one of:
 *
 * - `message:accepted` — the bot will reply (carries the {@link ReplyDecision}).
 * - `message:skipped`  — the bot will not reply (carries the reason string).
 * - `message:error`    — the strategy threw (carries the error and stage name).
 */
export class DecisionStage {
  constructor(
    private bus: MessageBus,
    private strategy: DecisionStrategy
  ) {}

  /**
   * Wire up the stage by subscribing to `message:validated`.
   *
   * Call this once during application bootstrap, after the MessageBus and
   * strategy are available.
   */
  register(): void {
    this.bus.on('message:validated', async (ctx) => {
      await this.process(ctx);
    });
    debug('DecisionStage registered on message:validated');
  }

  /**
   * Evaluate a single {@link MessageContext} through the decision strategy.
   *
   * This method is public so it can be called directly in tests or by
   * other pipeline stages that need an imperative (non-event) code path.
   *
   * @returns The {@link ReplyDecision} produced by the strategy, or a
   *          synthetic "shouldReply: false" decision if the strategy throws.
   */
  async process(ctx: MessageContext): Promise<ReplyDecision> {
    try {
      const decision = await this.strategy.shouldReply(ctx);

      if (decision.shouldReply) {
        await this.bus.emitAsync('message:accepted', { ...ctx, decision });
        debug('Message accepted: bot=%s reason=%s', ctx.botName, decision.reason);
      } else {
        await this.bus.emitAsync('message:skipped', { ...ctx, reason: decision.reason });
        debug('Message skipped: bot=%s reason=%s', ctx.botName, decision.reason);
      }

      return decision;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debug('Decision strategy error: %O', error);

      await this.bus.emitAsync('message:error', { ...ctx, error, stage: 'decision' });

      return { shouldReply: false, reason: `error: ${error.message}` };
    }
  }
}
