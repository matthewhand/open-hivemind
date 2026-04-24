import { getQuotaManager } from '@src/middleware/quotaMiddleware';
import { MemoryManager } from '@src/services/MemoryManager';
import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';
import { generateChatCompletionDirect } from '@integrations/openwebui/directClient';
import type { IMessage } from '@message/interfaces/IMessage';
import { trimHistoryToTokenBudget } from '../helpers/processing/HistoryBudgeter';
import { buildSystemPromptWithBotName } from './messageHandler';
import type { MessageContext } from './types';

/**
 * Prepares the inference context including delays, typing indicators, memories, and history.
 * Executes the LLM inference and handles quotas.
 */
export async function processInference(ctx: MessageContext): Promise<boolean> {
  const channelId = ctx.message.getChannelId();
  const userId = ctx.message.getAuthorId();
  const botId = ctx.resolvedBotId || '';

  // Delays
  const minDelay = Number(ctx.botConfig.MESSAGE_MIN_DELAY || 0);
  if (minDelay > 0) {
    ctx.logger(`Waiting ${minDelay}ms before processing...`);
    await new Promise((resolve) => setTimeout(resolve, minDelay));
  }

  // Typing indicators
  let typingInterval: NodeJS.Timeout | null = null;
  let typingTimeout: NodeJS.Timeout | null = null;
  let stopTyping = false;

  if (ctx.botConfig.MESSAGE_TYPING_INDICATOR) {
    typingInterval = setInterval(async () => {
      if (stopTyping) return;
      try {
        await ctx.messageProvider.sendTypingIndicator(channelId);
      } catch (err) {
        ctx.logger('Failed to send typing indicator:', err);
      }
    }, 4000);

    typingTimeout = setTimeout(() => {
      stopTyping = true;
      if (typingInterval) clearInterval(typingInterval);
    }, 30000);
  }

  try {
    // Memory retrieval
    ctx.pipelineMetrics.startStage('memory_search');
    const memoryManager = MemoryManager.getInstance();
    let memoryContext = '';
    try {
      const memories = await memoryManager.retrieveRelevantMemories(
        String(ctx.botConfig.name || botId),
        ctx.processedMessage || ''
      );
      memoryContext = memoryManager.formatMemoriesForPrompt(memories);
    } catch (memErr) {
      ctx.logger('Memory retrieval failed (non-fatal): %O', memErr);
    }
    ctx.pipelineMetrics.endStage('memory_search', { hasMemories: memoryContext.length > 0 });

    // System prompt
    const baseSystemPrompt = buildSystemPromptWithBotName(
      String(ctx.botConfig.MESSAGE_SYSTEM_PROMPT || ''),
      String(ctx.activeAgentName)
    );
    const systemPrompt = memoryContext
      ? `${baseSystemPrompt}\n\n${memoryContext}`
      : baseSystemPrompt;

    // History trimming
    ctx.pipelineMetrics.startStage('history');
    const maxHistoryTokens = Number(ctx.botConfig.LLM_MAX_HISTORY_TOKENS || 2000);
    const providerWantsHistory = ctx.llmProvider.supportsHistory
      ? ctx.llmProvider.supportsHistory()
      : true;
    const trimmedHistory = providerWantsHistory
      ? trimHistoryToTokenBudget(ctx.historyMessages, {
          inputBudgetTokens: maxHistoryTokens,
          promptText: ctx.processedMessage || '',
        })
      : { trimmed: [] as IMessage[] };
    ctx.pipelineMetrics.endStage('history', { trimmedCount: trimmedHistory.trimmed.length });

    // Quota check
    if (process.env.DISABLE_QUOTA !== 'true') {
      const quotaManager = getQuotaManager();
      const quotaEntityId = userId || channelId;
      const quotaEntityType = userId ? ('user' as const) : ('channel' as const);
      const quotaStatus = await quotaManager.checkQuota(quotaEntityId, quotaEntityType);
      if (!quotaStatus.allowed) {
        ctx.logger(
          `Quota exceeded for ${quotaEntityType}:${quotaEntityId} — ` +
            `min=${quotaStatus.used.minute} hr=${quotaStatus.used.hour} day=${quotaStatus.used.day}`
        );
        return false;
      }
      await quotaManager.consumeQuota(quotaEntityId, quotaEntityType);
    }

    // Inference
    ctx.pipelineMetrics.startStage('llm_inference');
    let llmResponse: { text: string; usage?: { total_tokens?: number } } | null = null;

    if (ctx.botConfig.MESSAGE_LLM_DIRECT) {
      const directResult = await generateChatCompletionDirect(
        ctx.botConfig as unknown as Parameters<typeof generateChatCompletionDirect>[0],
        ctx.processedMessage || '',
        trimmedHistory.trimmed,
        systemPrompt
      );
      llmResponse = typeof directResult === 'string' ? { text: directResult } : directResult;
    } else {
      const botNameForTools = String(ctx.botConfig.name || ctx.botConfig.BOT_ID || '');
      const toolResult = await toolAugmentedCompletion({
        botName: botNameForTools,
        llmProvider: ctx.llmProvider,
        userMessage: ctx.processedMessage || '',
        historyMessages: trimmedHistory.trimmed,
        metadata: {
          systemPrompt,
          maxTokens: Number(ctx.botConfig.LLM_MAX_TOKENS || 150),
          temperature: Number(ctx.botConfig.LLM_TEMPERATURE || 0.7),
          channelId,
          userId,
        },
        systemPrompt,
        toolContext: {
          userId,
          channelId,
          messageProvider: String(ctx.botConfig.MESSAGE_PROVIDER || 'generic'),
        },
      });
      llmResponse = typeof toolResult === 'string' ? { text: toolResult } : toolResult;
    }
    ctx.llmResponse = llmResponse;

    ctx.pipelineMetrics.endStage('llm_inference', {
      hasResponse: !!(llmResponse && llmResponse.text),
    });

    // Post-inference quota
    if (process.env.DISABLE_QUOTA !== 'true' && llmResponse?.text) {
      try {
        const quotaManager = getQuotaManager();
        const quotaEntityId = userId || channelId;
        const quotaEntityType = userId ? ('user' as const) : ('channel' as const);
        const estimatedTokens =
          llmResponse.usage?.total_tokens ?? Math.ceil((llmResponse.text?.length ?? 0) / 4);
        await quotaManager.consumeTokens(quotaEntityId, quotaEntityType, estimatedTokens);
      } catch (tokenErr) {
        ctx.logger('Failed to record token quota (non-fatal):', tokenErr);
      }
    }

    return true;
  } finally {
    stopTyping = true;
    if (typingInterval) clearInterval(typingInterval);
    if (typingTimeout) clearTimeout(typingTimeout);
  }
}
