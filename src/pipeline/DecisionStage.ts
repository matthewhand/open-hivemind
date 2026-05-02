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
import { container } from 'tsyringe';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext, ReplyDecision } from '@src/events/types';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';
import { PipelineDebuggerService } from '../server/services/PipelineDebuggerService';

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
      // --- Pipeline Debugger Breakpoint Check ---
      try {
        const debuggerService = container.resolve(PipelineDebuggerService);
        if (debuggerService.shouldPause('validated')) {
          debug(`[Debugger] Pausing pipeline for bot ${ctx.botName} at stage 'validated'`);
          ctx = await debuggerService.pause('validated', ctx);
          debug(`[Debugger] Resuming pipeline for bot ${ctx.botName}`);
        }
        // eslint-disable-next-line unused-imports/no-unused-vars
      } catch (e) {
        // Ignore DI errors
      }

      const messageId = ctx.message.getMessageId();
      const botId = (ctx.botConfig.BOT_ID as string) || (ctx.botConfig.botId as string) || '';
      const swarm = SwarmCoordinator.getInstance();
      const channelId = ctx.channelId;
      const botName = ctx.botName;

      // --- Swarm claim check: skip if another bot already claimed ---
      const existingClaim = swarm.getClaim(messageId);
      const alreadyClaimed = existingClaim !== undefined && existingClaim.botId !== botId;
      if (alreadyClaimed) {
        const reason = existingClaim
          ? `Message already claimed by bot ${existingClaim.botId} in swarm`
          : 'Message already claimed by another bot in swarm';

        debug('[DecisionStage] Message %s: skipped (claimed)', messageId);

        // Capture metadata
        ctx.metadata.decision = {
          alreadyClaimed: true,
          claimedBy: existingClaim?.botId,
          reason,
          shouldReply: false,
        };

        // Broadcast decision to WebSocket for Live Orchestration Log
        this.bus.emit('pipeline:decision', {
          botName,
          messageId,
          channelId,
          shouldReply: false,
          reason,
          claimedBy: existingClaim?.botId,
        });

        await this.bus.emitAsync('message:skipped', { ...ctx, reason });
        return { shouldReply: false, reason };
      }

      // --- Run the decision strategy ---
      const decision = await this.strategy.shouldReply(ctx);

      // Capture metadata
      ctx.metadata.decision = {
        alreadyClaimed: false,
        shouldReply: decision.shouldReply,
        reason: decision.reason,
        meta: decision.meta,
      };

      if (decision.shouldReply) {
        // Claim the message for this bot
        swarm.claimMessage(messageId, botName);
        debug('[DecisionStage] Message %s: claimed by %s', messageId, botId);

        // Broadcast decision to WebSocket for Live Orchestration Log
        this.bus.emit('pipeline:decision', {
          botName,
          messageId,
          channelId,
          shouldReply: true,
          reason: decision.reason,
          ...(decision.meta || {}),
        });

        await this.bus.emitAsync('message:accepted', { ...ctx, decision });
        debug('Message accepted: bot=%s reason=%s', ctx.botName, decision.reason);
      } else {
        // Broadcast decision to WebSocket for Live Orchestration Log
        this.bus.emit('pipeline:decision', {
          botName,
          messageId,
          channelId,
          shouldReply: false,
          reason: decision.reason,
          ...(decision.meta || {}),
        });

        await this.bus.emitAsync('message:skipped', { ...ctx, reason: decision.reason });
        debug('Message skipped: bot=%s reason=%s', ctx.botName, decision.reason);
      }

      return decision;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debug('Decision strategy error: %O', error);

      // Broadcast error decision to WebSocket for Live Orchestration Log
      this.bus.emit('pipeline:decision', {
        botName: ctx.botName,
        messageId: ctx.message.getMessageId(),
        channelId: ctx.channelId,
        shouldReply: false,
        reason: `error: ${error.message}`,
      });

      await this.bus.emitAsync('message:error', { ...ctx, error, stage: 'decision' });

      return { shouldReply: false, reason: `error: ${error.message}` };
    }
  }
}
