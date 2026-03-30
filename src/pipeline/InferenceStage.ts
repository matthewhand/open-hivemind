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
import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import type { IMessage } from '@message/interfaces/IMessage';

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
    private llmInvoker: LlmInvoker,
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
  async process(
    ctx: MessageContext & { memories: string[]; systemPrompt: string },
  ): Promise<void> {
    try {
      // Extract user message text — prefer getText() when available, fall
      // back to the public `content` property.
      const userMessage =
        typeof ctx.message.getText === 'function'
          ? ctx.message.getText()
          : ctx.message.content;

      const responseText = await this.llmInvoker.generateResponse(
        userMessage,
        ctx.history,
        ctx.systemPrompt,
        ctx.metadata,
      );

      if (!responseText) {
        await this.bus.emitAsync('message:skipped', {
          ...ctx,
          reason: 'empty LLM response',
        });
        debug('Inference skipped (empty response): bot=%s', ctx.botName);
        return;
      }

      await this.bus.emitAsync('message:response', { ...ctx, responseText });
      debug(
        'Inference complete: bot=%s responseLength=%d',
        ctx.botName,
        responseText.length,
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debug('Inference error: %O', error);

      await this.bus.emitAsync('message:error', { ...ctx, error, stage: 'inference' });
    }
  }
}
