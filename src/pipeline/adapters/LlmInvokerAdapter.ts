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

import { getLlmProviderForBot } from '@src/llm/getLlmProvider';
import type { LlmInvoker } from '@src/pipeline/InferenceStage';
import type { IMessage } from '@message/interfaces/IMessage';

/**
 * Dependencies required by the LlmInvokerAdapter.
 */
export interface LlmInvokerDeps {
  /** The active bot configuration used to resolve the LLM provider. */
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
    metadata?: Record<string, any>
  ): Promise<string> {
    const provider = await getLlmProviderForBot(this.deps.botConfig);

    return provider.generateChatCompletion(userMessage, history, {
      ...metadata,
      systemPrompt,
    });
  }
}
