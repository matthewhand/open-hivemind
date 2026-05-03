/**
 * Pipeline Stage 4 — InferenceStage
 *
 * Calls the LLM provider to generate a response for an enriched message
 * context.  The actual LLM call is delegated to an injectable
 * {@link LlmInvoker}, keeping this stage provider-agnostic.
 *
 * **Event flow:**
 *
 * ```
 *   message:enriched  ──►  InferenceStage  ──►  message:response
 *                                           └──►  message:skipped
 *                                           └──►  message:error
 * ```
 *
 * @module pipeline/InferenceStage
 */

import Debug from 'debug';
import type { IMessage } from '@hivemind/shared-types';
import { type MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import { DatabaseManager } from '../database/DatabaseManager';
import { sendErrorAlertMessage } from '../managers/botLifecycle';
import { BotManager } from '../managers/BotManager';
import { PersonaManager } from '../managers/PersonaManager';
import { TokenBudgetService } from '../server/services/TokenBudgetService';

const debug = Debug('app:pipeline:inference');

// ---------------------------------------------------------------------------
// LLM invoker interface
// ---------------------------------------------------------------------------

/**
 * Pluggable interface for calling an LLM provider.
 *
 * Implementations wrap the actual SDK calls (OpenAI, Anthropic, local models,
 * etc.) behind this simple contract so the pipeline stage remains agnostic.
 */
export interface LlmInvoker {
  generateResponse(
    userMessage: string,
    history: IMessage[],
    systemPrompt: string,

    metadata?: Record<string, any>,
    /**
     * Per-message bot configuration snapshot. Implementations should use this
     * to resolve the correct LLM provider for the bot handling the message,
     * rather than relying on a single config captured at construction time.
     */
    botConfig?: Record<string, unknown>
  ): Promise<string>;
}

// ---------------------------------------------------------------------------
// InferenceStage
// ---------------------------------------------------------------------------

/**
 * Subscribes to `message:enriched` events, invokes the LLM via the injected
 * {@link LlmInvoker}, and emits one of:
 *
 * - `message:response` — the LLM returned a non-empty response.
 * - `message:skipped`  — the LLM returned an empty string.
 * - `message:error`    — the LLM call threw (carries the error and stage name).
 */
export class InferenceStage {
  constructor(
    private bus: MessageBus,
    private llmInvoker: LlmInvoker
  ) {}

  /**
   * Wire up the stage by subscribing to `message:enriched`.
   *
   * Call this once during application bootstrap, after the MessageBus and
   * LLM invoker are available.
   */
  register(): void {
    this.bus.on('message:enriched', async (ctx) => {
      await this.process(ctx);
    });
    debug('InferenceStage registered on message:enriched');
  }

  /**
   * Run inference for a single enriched {@link MessageContext}.
   *
   * This method is public so it can be called directly in tests or by
   * other pipeline stages that need an imperative (non-event) code path.
   */
  async process(ctx: MessageContext & { memories: string[]; systemPrompt: string }): Promise<void> {
    const startTime = Date.now();
    const userMessage =
      typeof ctx.message.getText === 'function' ? ctx.message.getText() : ctx.message.content;
    const dbManager = DatabaseManager.getInstance();

    try {
      const budgetService = TokenBudgetService.getInstance();

      const maxTokens = (ctx.botConfig as any).maxTokensPerDay as number;

      // 1. Budget Pre-Check
      if (maxTokens && budgetService.isOverBudget(ctx.botName, maxTokens)) {
        const errorMsg = `Daily token budget exceeded for bot ${ctx.botName}. Limit: ${maxTokens}.`;
        debug(errorMsg);

        // Notify admin and pause bot
        const botManager = await BotManager.getInstance();
        const bot = await botManager.getBot(ctx.botName);
        if (bot) {
          await sendErrorAlertMessage(bot, new Error(errorMsg));
          await botManager.stopBot(bot.id);
        }

        throw new Error(errorMsg);
      }

      const responseText = await this.llmInvoker.generateResponse(
        userMessage,
        ctx.history,
        ctx.systemPrompt,
        ctx.metadata,
        ctx.botConfig
      );

      const durationMs = Date.now() - startTime;

      if (!responseText) {
        // Capture metadata for skipped response
        ctx.metadata.inference = {
          model: (ctx.botConfig.MODEL as string) || 'unknown',
          durationMs,
          status: 'empty',
        };

        await dbManager.logInference({
          botName: ctx.botName,
          prompt: userMessage,
          status: 'error',
          errorMessage: 'empty LLM response',
          latencyMs: durationMs,
          provider: (ctx.botConfig.llmProvider as string) || 'unknown',
        });

        await this.bus.emitAsync('message:skipped', {
          ...ctx,
          reason: 'empty LLM response',
        });
        debug('Inference skipped (empty response): bot=%s', ctx.botName);
        return;
      }

      // 2. Budget Increment (Heuristic: ~4 chars per token for prompt + response)
      const estimatedTokens = Math.ceil((userMessage.length + responseText.length) / 4);
      if (maxTokens) {
        const model = (ctx.botConfig.MODEL as string) || 'gpt-4o';
        await budgetService.incrementUsage(ctx.botName, estimatedTokens, model);
      }

      // Capture metadata for successful response
      ctx.metadata.inference = {
        model: (ctx.botConfig.MODEL as string) || 'unknown',
        durationMs,
        responseLength: responseText.length,
        status: 'ok',
      };

      await dbManager.logInference({
        botName: ctx.botName,
        prompt: userMessage,
        response: responseText,
        status: 'success',
        tokensUsed: estimatedTokens,
        latencyMs: durationMs,
        provider: (ctx.botConfig.llmProvider as string) || 'unknown',
      });

      // Record that the bot's configured persona was actually used to produce a
      // response. Best-effort: a missing/unknown persona (e.g. the literal
      // 'default' placeholder) increments nothing, and any failure here must
      // never abort the pipeline.
      await this.recordPersonaUsage(ctx.botConfig);

      await this.bus.emitAsync('message:response', { ...ctx, responseText });
      debug('Inference complete: bot=%s responseLength=%d', ctx.botName, responseText.length);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const durationMs = Date.now() - startTime;
      debug('Inference error: %O', error);

      await dbManager.logInference({
        botName: ctx.botName,
        prompt: userMessage,
        status: 'error',
        errorMessage: error.message,
        latencyMs: durationMs,
        provider: (ctx.botConfig.llmProvider as string) || 'unknown',
      });

      await this.bus.emitAsync('message:error', { ...ctx, error, stage: 'inference' });
    }
  }

  /**
   * Increment the usage counter for the persona configured on the bot that
   * just produced a response.
   *
   * `botConfig.persona` is a persona ID string. When it is absent, empty, or
   * does not resolve to a known persona (e.g. the `'default'` placeholder used
   * by bots with no custom persona), this is a no-op. All errors are swallowed
   * so persona bookkeeping can never break the message pipeline.
   */
  private async recordPersonaUsage(botConfig: Record<string, unknown>): Promise<void> {
    const personaId = botConfig?.persona;
    if (typeof personaId !== 'string' || !personaId) {
      return;
    }

    try {
      const manager = await PersonaManager.getInstance();
      await manager.incrementUsageCount(personaId);
    } catch (err) {
      debug('Failed to increment persona usage count for %s: %O', personaId, err);
    }
  }
}
