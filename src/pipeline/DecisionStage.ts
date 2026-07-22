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
import type { MessageContext, MessageEvents, ReplyDecision } from '@src/events/types';
import { SwarmCoordinator, type SwarmMode } from '@src/services/SwarmCoordinator';
import { PipelineDebuggerService } from '../server/services/PipelineDebuggerService';
import { DefaultActivityRecorder, type ActivityRecorder } from './ActivityRecorder';

const debug = Debug('app:pipeline:decision');

const SWARM_MODES: readonly SwarmMode[] = [
  'exclusive',
  'broadcast',
  'rotating',
  'priority',
  'collaborative',
];

/**
 * Resolve the idle-response service name from the message context. Mirrors the
 * legacy `replyDecision.ts` / `outputProcessor.ts` resolution of
 * `MESSAGE_PROVIDER`, falling back to the platform identifier.
 */
function resolveServiceName(ctx: MessageContext): string {
  return String(ctx.botConfig.MESSAGE_PROVIDER || ctx.platform || 'generic');
}

/**
 * Resolve swarm mode from bot config. Defaults to exclusive (atomic claim).
 */
function resolveSwarmMode(ctx: MessageContext): SwarmMode {
  const raw =
    ctx.botConfig.SWARM_MODE ?? ctx.botConfig.swarmMode ?? process.env.SWARM_MODE ?? 'exclusive';
  const mode = String(raw).toLowerCase() as SwarmMode;
  return SWARM_MODES.includes(mode) ? mode : 'exclusive';
}

type DecisionPayload = MessageEvents['pipeline:decision'];

/**
 * Build the single `pipeline:decision` payload broadcast for the live
 * Orchestration Log. Promotes the probability `rolled`/`probability` fields out
 * of the decision `meta` onto the top-level `probabilityRoll`/`threshold` keys
 * (mirroring the shape the legacy `shouldReplyToMessage` emit produced) so the
 * UI keeps the richer payload after de-duplicating the event.
 */
function buildDecisionPayload(args: {
  botName: string;
  messageId: string;
  channelId: string;
  shouldReply: boolean;
  reason?: string;
  meta?: Record<string, unknown>;
  claimedBy?: string;
}): DecisionPayload {
  const { botName, messageId, channelId, shouldReply, reason, meta, claimedBy } = args;

  const payload: DecisionPayload = {
    botName,
    messageId,
    channelId,
    shouldReply,
    reason: reason ?? '',
    meta: meta ?? {},
  };

  if (claimedBy) {
    payload.claimedBy = claimedBy;
  }

  if (meta) {
    if (meta.rolled !== undefined && Number.isFinite(Number(meta.rolled))) {
      payload.probabilityRoll = Number(meta.rolled);
    }
    if (meta.probability !== undefined) {
      const threshold = parseFloat(String(meta.probability).replace(/[<>]/g, ''));
      if (Number.isFinite(threshold)) {
        payload.threshold = threshold;
      }
    }
  }

  return payload;
}

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
    private strategy: DecisionStrategy,
    private recorder: ActivityRecorder = new DefaultActivityRecorder()
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
      } catch {
        // Ignore DI errors
      }

      const messageId = ctx.message.getMessageId();

      // Record the inbound interaction for idle-response tracking. Mirrors the
      // legacy `replyDecision.ts` recording so idle response works in pipeline
      // mode. Only human messages count (skip bot-authored messages).
      try {
        if (!ctx.message.isFromBot()) {
          this.recorder.recordInteraction(resolveServiceName(ctx), ctx.channelId, messageId);
        }
      } catch (recordErr) {
        debug('Failed to record interaction (non-fatal): %O', recordErr);
      }

      const swarm = SwarmCoordinator.getInstance();
      const channelId = ctx.channelId;
      const botName = ctx.botName;
      const swarmMode = resolveSwarmMode(ctx);

      // --- Swarm claim check (exclusive): skip if another bot already claimed ---
      // Compare against `botName`, the SAME identity key used when this stage
      // claims the message below via `swarm.claimMessage(messageId, botName)`
      // (SwarmCoordinator stores that value as the claim's `botId`). Using the
      // config `BOT_ID` here instead would mismatch when `BOT_NAME !== BOT_ID`,
      // causing a bot to fail to recognize its own claim and mis-deduplicate.
      if (swarmMode === 'exclusive') {
        const existingClaim = swarm.getClaim(messageId);
        const alreadyClaimed = existingClaim !== undefined && existingClaim.botId !== botName;
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
            swarmMode,
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
      }

      // --- Run the decision strategy ---
      const decision = await this.strategy.shouldReply(ctx);

      // Capture metadata
      ctx.metadata.decision = {
        alreadyClaimed: false,
        shouldReply: decision.shouldReply,
        reason: decision.reason,
        meta: decision.meta,
        swarmMode,
      };

      // Build the single `pipeline:decision` payload for the live Orchestration
      // Log. DecisionStage is the sole owner of this broadcast for the pipeline
      // path; `shouldReplyToMessage` suppresses its own emit (via the
      // DecisionStrategyAdapter) so the event is not emitted twice per message.
      const decisionPayload = buildDecisionPayload({
        botName,
        messageId,
        channelId,
        shouldReply: decision.shouldReply,
        reason: decision.reason,
        meta: decision.meta,
      });

      if (decision.shouldReply) {
        // Atomic swarm acquisition — only accept after we win the claim/decide.
        if (swarmMode === 'exclusive') {
          const claimed = swarm.claimMessage(messageId, botName, channelId);
          if (!claimed) {
            const existing = swarm.getClaim(messageId);
            const claimedBy = existing?.botId;
            const reason = claimedBy
              ? `Message already claimed by bot ${claimedBy} in swarm`
              : 'Failed to acquire exclusive swarm claim';

            debug(
              '[DecisionStage] Message %s: claim lost by %s (claimedBy=%s)',
              messageId,
              botName,
              claimedBy ?? 'unknown'
            );

            ctx.metadata.decision = {
              alreadyClaimed: true,
              claimedBy,
              reason,
              shouldReply: false,
              swarmMode,
            };

            this.bus.emit(
              'pipeline:decision',
              buildDecisionPayload({
                botName,
                messageId,
                channelId,
                shouldReply: false,
                reason,
                claimedBy,
              })
            );

            await this.bus.emitAsync('message:skipped', { ...ctx, reason });
            return { shouldReply: false, reason };
          }
          debug('[DecisionStage] Message %s: claimed by %s', messageId, botName);
        } else {
          // Non-exclusive modes use SwarmCoordinator.decide for turn/broadcast logic.
          const swarmDecision = swarm.decide(messageId, botName, channelId, swarmMode);
          if (!swarmDecision.shouldReply) {
            const reason = swarmDecision.reason;
            debug(
              '[DecisionStage] Message %s: swarm mode=%s skipped for %s (%s)',
              messageId,
              swarmMode,
              botName,
              reason
            );

            ctx.metadata.decision = {
              alreadyClaimed: Boolean(swarmDecision.claimedBy),
              claimedBy: swarmDecision.claimedBy,
              reason,
              shouldReply: false,
              swarmMode,
            };

            this.bus.emit(
              'pipeline:decision',
              buildDecisionPayload({
                botName,
                messageId,
                channelId,
                shouldReply: false,
                reason,
                claimedBy: swarmDecision.claimedBy,
              })
            );

            await this.bus.emitAsync('message:skipped', { ...ctx, reason });
            return { shouldReply: false, reason };
          }
          debug(
            '[DecisionStage] Message %s: swarm mode=%s accepted for %s',
            messageId,
            swarmMode,
            botName
          );
        }

        // Broadcast decision to WebSocket for Live Orchestration Log
        this.bus.emit('pipeline:decision', decisionPayload);

        await this.bus.emitAsync('message:accepted', { ...ctx, decision });
        debug('Message accepted: bot=%s reason=%s', ctx.botName, decision.reason);
      } else {
        // Broadcast decision to WebSocket for Live Orchestration Log
        this.bus.emit('pipeline:decision', decisionPayload);

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
