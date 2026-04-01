/**
 * Adapter that wraps the existing `shouldReplyToMessage()` function
 * as a pipeline {@link DecisionStrategy}.
 *
 * This is a thin translation layer: it extracts the parameters that
 * `shouldReplyToMessage()` expects from the pipeline's
 * {@link MessageContext} and maps the returned value to the pipeline's
 * {@link ReplyDecision} type.
 *
 * @module pipeline/adapters/DecisionStrategyAdapter
 */

import type { MessageContext, ReplyDecision } from '@src/events/types';
import { shouldReplyToMessage } from '@src/message/helpers/processing/shouldReplyToMessage';
import type { DecisionStrategy } from '@src/pipeline/DecisionStage';

/**
 * Dependencies required by the DecisionStrategyAdapter.
 */
export interface DecisionStrategyDeps {
  /** The bot's user ID on the platform (used for mention/self-message detection). */
  botId?: string;
  /** Default channel ID for bot-reply-limiting logic. */
  defaultChannelId?: string;
}

/**
 * Adapts the legacy `shouldReplyToMessage()` function into the pipeline's
 * {@link DecisionStrategy} interface.
 */
export class DecisionStrategyAdapter implements DecisionStrategy {
  constructor(private deps: DecisionStrategyDeps = {}) {}

  async shouldReply(ctx: MessageContext): Promise<ReplyDecision> {
    const botId =
      this.deps.botId || (ctx.botConfig.BOT_ID as string) || (ctx.botConfig.botId as string) || '';

    const platform = (ctx.platform === 'discord' ? 'discord' : 'generic') as 'discord' | 'generic';

    const botName = ctx.botName;
    const defaultChannelId =
      this.deps.defaultChannelId || (ctx.botConfig.defaultChannelId as string);

    const result = await shouldReplyToMessage(
      ctx.message,
      botId,
      platform,
      botName,
      ctx.history,
      defaultChannelId,
      ctx.botConfig as Record<string, any>
    );

    // The legacy ReplyDecision shape matches the pipeline's ReplyDecision,
    // so we can return it directly.
    return {
      shouldReply: result.shouldReply,
      reason: result.reason,
      meta: result.meta,
    };
  }
}
