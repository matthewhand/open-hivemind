/**
 * Adapter that wraps {@link getLlmProviderForBot} as a pipeline
 * {@link LlmInvoker}.
 *
 * On each `generateResponse()` call the adapter resolves the correct
 * {@link ILlmProvider} for the bot (via config) and delegates to
 * {@link toolAugmentedCompletion} so MCP / tool-enabled bots can invoke
 * tools. When the bot has no tools (or tool setup fails), this falls back
 * to plain `generateChatCompletion()` — matching the legacy inference path.
 *
 * @module pipeline/adapters/LlmInvokerAdapter
 */

import Debug from 'debug';
import type { IMessage } from '@hivemind/shared-types';
import { getLlmProviderForBot } from '@src/llm/getLlmProvider';
import type { LlmInvoker } from '@src/pipeline/InferenceStage';
import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';

const debug = Debug('app:pipeline:LlmInvokerAdapter');

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
 * Resolve a bot name suitable for ToolManager lookups.
 * Prefers the same fields the legacy inference path uses, plus BOT_NAME /
 * botName for pipeline configs that use those keys.
 */
function resolveBotName(config: Record<string, unknown>): string {
  return String(config.BOT_NAME || config.name || config.botName || config.BOT_ID || '');
}

/**
 * Adapts the `getLlmProviderForBot()` + tool-augmented completion flow
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

    const plainMetadata = {
      ...metadata,
      systemPrompt,
    };

    const botName = resolveBotName(resolvedConfig);
    const channelId =
      (metadata?.channelId as string | undefined) ||
      (typeof resolvedConfig.channelId === 'string' ? resolvedConfig.channelId : undefined);
    const userId =
      (metadata?.userId as string | undefined) ||
      (typeof resolvedConfig.userId === 'string' ? resolvedConfig.userId : undefined);

    // Prefer the tool-augmented path (MCP tools, transfer_to_bot, etc.).
    // toolAugmentedCompletion itself falls back to plain generateChatCompletion
    // when the bot has no tools; we also guard setup failures here so pure LLM
    // bots keep working if ToolManager / MCP is unavailable.
    try {
      return await toolAugmentedCompletion({
        botName,
        llmProvider: provider,
        userMessage,
        historyMessages: history,
        metadata: {
          ...plainMetadata,
          maxTokens: Number(resolvedConfig.LLM_MAX_TOKENS ?? metadata?.maxTokens ?? 150),
          temperature: Number(resolvedConfig.LLM_TEMPERATURE ?? metadata?.temperature ?? 0.7),
          channelId,
          userId,
        },
        systemPrompt,
        toolContext: {
          userId,
          channelId,
          messageProvider: String(
            resolvedConfig.MESSAGE_PROVIDER ||
              metadata?.messageProvider ||
              metadata?.platform ||
              'generic'
          ),
          forumId: metadata?.forumId as string | undefined,
          forumOwnerId: metadata?.forumOwnerId as string | undefined,
        },
      });
    } catch (err) {
      debug(
        'toolAugmentedCompletion failed for bot "%s", falling back to plain completion: %O',
        botName,
        err
      );
      return provider.generateChatCompletion(userMessage, history, plainMetadata);
    }
  }
}
