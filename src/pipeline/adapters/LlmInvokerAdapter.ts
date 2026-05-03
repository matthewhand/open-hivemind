/**
 * Adapter that wraps {@link getLlmProviderForBot} as a pipeline
 * {@link LlmInvoker}.
 *
 * On each `generateResponse()` call the adapter resolves the correct
 * {@link ILlmProvider} for the bot (via config) and delegates to its
 * `generateChatCompletion()` method.
 *
 * @module pipeline/adapters/LlmInvokerAdapter
 */

import type { IMessage } from '@hivemind/shared-types';
import { getLlmProviderForBot } from '@src/llm/getLlmProvider';
import type { LlmInvoker } from '@src/pipeline/InferenceStage';

/**
 * Dependencies required by the LlmInvokerAdapter.
 */
export interface LlmInvokerDeps {
  /**
   * Fallback bot configuration used to resolve the LLM provider when no
   * per-message config is supplied to {@link LlmInvokerAdapter.generateResponse}.
   *
   * In normal pipeline operation the per-message `ctx.botConfig` is passed
   * through and takes precedence, so this is only a fallback.
   */
  botConfig: Record<string, unknown>;
}

/**
 * Adapts the `getLlmProviderForBot()` + `generateChatCompletion()` flow
 * into the pipeline's {@link LlmInvoker} interface.
 */
export class LlmInvokerAdapter implements LlmInvoker {
  constructor(private deps: LlmInvokerDeps) {}

  async generateResponse(
    userMessage: string,
    history: IMessage[],
    systemPrompt: string,

    metadata?: Record<string, any>,
    botConfig?: Record<string, unknown>
  ): Promise<string> {
    // Prefer the per-message bot config so the pipeline resolves the provider
    // for the bot actually handling this message. Fall back to the config
    // captured at construction time only when none is supplied.
    const resolvedConfig =
      botConfig && Object.keys(botConfig).length > 0 ? botConfig : this.deps.botConfig;

    const provider = await getLlmProviderForBot(resolvedConfig);

    return provider.generateChatCompletion(userMessage, history, {
      ...metadata,
      systemPrompt,
    });
  }
}
