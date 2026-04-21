import { summarizeLogWithLlm } from '../helpers/logging/LogProseSummarizer';
import { shouldReplyToMessage } from '../helpers/processing/shouldReplyToMessage';
import processingLocks from '../processing/processingLocks';
import { idleResponseManager } from './messageHandler';
import type { MessageContext } from './types';

/**
 * Determines if the bot should reply to the incoming message.
 * Handles recording interactions, decision logic, and locking.
 */
export async function determineReplyEligibility(ctx: MessageContext): Promise<boolean> {
  // Record interaction for idle response tracking
  const serviceName = String(ctx.botConfig.MESSAGE_PROVIDER || 'generic');
  if (!ctx.message.isFromBot()) {
    idleResponseManager.recordInteraction(
      serviceName,
      ctx.message.getChannelId(),
      ctx.message.getMessageId()
    );
  }

  const replyNameCandidates: string[] = Array.from(
    new Set(
      (Array.isArray(ctx.resolvedAgentContext?.nameCandidates)
        ? ctx.resolvedAgentContext.nameCandidates
        : [ctx.activeAgentName, ctx.botConfig?.name]
      )
        .filter(Boolean)
        .map((v: unknown) => String(v))
    )
  );

  const mpUnknown = ctx.messageProvider as unknown as Record<string, unknown>;
  const defaultChannelId =
    typeof mpUnknown.getDefaultChannel === 'function'
      ? (mpUnknown.getDefaultChannel as () => string | undefined)()
      : undefined;

  const replyDecision = await shouldReplyToMessage(
    ctx.message,
    ctx.resolvedBotId || '',
    ctx.platform as 'discord' | 'generic',
    replyNameCandidates,
    ctx.historyMessages,
    defaultChannelId,
    ctx.botConfig
  );

  ctx.pipelineMetrics.endStage('validate', {
    shouldReply: replyDecision.shouldReply,
    reason: replyDecision.reason,
  });

  if (!replyDecision.shouldReply) {
    ctx.logger(`Message not eligible for reply: ${replyDecision.reason}`);
    if (replyDecision.reason !== 'Message from self') {
      let prose = replyDecision.meta?.prose || replyDecision.reason;
      prose = await summarizeLogWithLlm(String(prose));

      const authorName = ((): string => {
        try {
          return (
            (typeof ctx.message.getAuthorName === 'function'
              ? ctx.message.getAuthorName()
              : null) ||
            (typeof ctx.message.getAuthorId === 'function'
              ? `user:${ctx.message.getAuthorId()}`
              : 'someone')
          );
        } catch {
          return 'someone';
        }
      })();

      const channelName = ((): string => {
        try {
          const orig = (ctx.message as any).getOriginalMessage?.();
          if (orig?.channel?.name) {
            return `#${orig.channel.name}`;
          }
          return `ch:${ctx.message.getChannelId().slice(-6)}`;
        } catch {
          return `ch:${ctx.message.getChannelId().slice(-6)}`;
        }
      })();

      ctx.logger(
        `\u{1F6AB} ${String(ctx.botConfig.name)} skips @${authorName} in ${channelName}: ${prose}`
      );
    }
    return false;
  }

  ctx.isLeaderInvocation = !!replyDecision.meta?.isLeader;
  ctx.delayKey = `${ctx.message.getChannelId()}:${ctx.resolvedBotId}`;

  // Acquire lock
  if (processingLocks.isLocked(ctx.message.getChannelId(), ctx.resolvedBotId || '')) {
    ctx.logger(`Could not acquire lock for channel ${ctx.message.getChannelId()}, skipping.`);
    return false;
  }
  processingLocks.lock(ctx.message.getChannelId(), ctx.resolvedBotId || '');
  ctx.didLock = true;

  return true;
}
