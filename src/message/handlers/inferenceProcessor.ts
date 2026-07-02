import crypto from 'crypto';
import type { IMessage } from '@hivemind/shared-types';
import { getQuotaManager } from '@src/middleware/quotaMiddleware';
import {
  normalizeLlmProviderType,
  ProviderMetricsCollector,
} from '@src/monitoring/ProviderMetricsCollector';
import { MemoryManager } from '@src/services/MemoryManager';
import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';
import { generateChatCompletionDirect } from '@integrations/openwebui/directClient';
import { trimHistoryToTokenBudget } from '../helpers/processing/HistoryBudgeter';
import { buildSystemPromptWithBotName } from './messageHandler';
import type { MessageContext } from './types';

/**
 * Prepares the inference context including delays, typing indicators, memories, and history.
 * Executes the LLM inference and handles quotas.
 */
export async function processInference(ctx: MessageContext): Promise<boolean> {
  const channelId = ctx.message.getChannelId();
  const _userId = ctx.message.getAuthorId();
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

    // Conversation history filtering - check if bot should include other bots' messages
    ctx.pipelineMetrics.startStage('conversation_filter');
    let filteredHistory = ctx.historyMessages;
    const includeConversationHistory = ctx.botConfig.MESSAGE_INCLUDE_CONVERSATION_HISTORY !== false;
    const globalHistoryEnabled = process.env.MESSAGE_INCLUDE_BOT_CONVERSATION_HISTORY !== 'false';

    if (includeConversationHistory && globalHistoryEnabled) {
      // Include all messages (human + bot) for philosophical debate context
      filteredHistory = ctx.historyMessages;
      ctx.logger(`Including ${filteredHistory.length} conversation messages (bots + humans)`);
    } else {
      // Filter out bot messages, only include human messages
      filteredHistory = ctx.historyMessages.filter((msg) => {
        const authorId = msg.getAuthorId();
        return authorId && !authorId.includes('bot');
      });
      ctx.logger(
        `Filtered to ${filteredHistory.length} human-only messages (conversation history disabled)`
      );
    }

    // Build conversation context for philosophical debates
    let conversationContext = '';
    if (includeConversationHistory && globalHistoryEnabled && filteredHistory.length > 0) {
      const recentBotMessages = filteredHistory
        .filter((msg) => {
          const authorId = msg.getAuthorId();
          return authorId && authorId.includes('bot');
        })
        .slice(0, 5) // Last 5 bot messages for context
        .map((msg) => `${msg.getAuthorId()}: ${msg.getText()?.substring(0, 200)}`)
        .join('\n');

      if (recentBotMessages) {
        conversationContext = `\n\nRECENT CONVERSATION:\n${recentBotMessages}\n\nConsider the philosophical perspectives and challenge or build upon what others have said. `;
      }
    }
    ctx.pipelineMetrics.endStage('conversation_filter', {
      originalCount: ctx.historyMessages.length,
      filteredCount: filteredHistory.length,
      hasConversationContext: conversationContext.length > 0,
    });

    // Smart mention instructions based on platform and user context
    const userId = ctx.message.getAuthorId();
    const authorId = ctx.message.getAuthorId();
    const mentionInstructions = userId
      ? `MENTION SYNTAX: When addressing the user, use <@${userId}> format for proper Discord mentions. `
      : `USER ADDRESSING: When addressing the user, use their ID: ${authorId}. `;

    // System prompt
    const baseSystemPrompt = buildSystemPromptWithBotName(
      String(ctx.botConfig.MESSAGE_SYSTEM_PROMPT || ''),
      String(ctx.activeAgentName)
    );
    const systemPrompt = memoryContext
      ? `${mentionInstructions}${baseSystemPrompt}\n\n${memoryContext}${conversationContext}`
      : `${mentionInstructions}${baseSystemPrompt}${conversationContext}`;

    // History trimming - use filtered history
    ctx.pipelineMetrics.startStage('history');
    const maxHistoryTokens = Number(ctx.botConfig.LLM_MAX_HISTORY_TOKENS || 2000);
    const providerWantsHistory = ctx.llmProvider.supportsHistory
      ? ctx.llmProvider.supportsHistory()
      : true;
    const trimmedHistory = providerWantsHistory
      ? trimHistoryToTokenBudget(filteredHistory, {
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
    let llmResponse: {
      text: string;
      usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
    } | null = null;

    // Resolve the provider type for metrics (no-op for untracked providers).
    const llmProviderType = normalizeLlmProviderType(
      ctx.botConfig.llmProvider ||
        ctx.botConfig.LLM_PROVIDER ||
        (ctx.llmProvider && ctx.llmProvider.name)
    );
    const llmStartedAt = Date.now();

    try {
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
    } catch (llmErr) {
      if (llmProviderType) {
        recordLlmMetric(llmProviderType, Date.now() - llmStartedAt, null, false);
      }
      throw llmErr;
    }
    ctx.llmResponse = llmResponse;

    if (llmProviderType) {
      recordLlmMetric(llmProviderType, Date.now() - llmStartedAt, llmResponse?.usage, true);
    }

    ctx.pipelineMetrics.endStage('llm_inference', {
      hasResponse: !!(llmResponse && llmResponse.text),
    });

    // Calculate realistic typing delay based on response length
    if (llmResponse?.text) {
      const responseText = llmResponse.text;
      const wordCount = responseText.split(' ').length;

      // Human-like typing speeds: 40-80 WPM with thinking time
      const minWpm = parseFloat(process.env.MESSAGE_TYPING_MIN_WPM || '40');
      const maxWpm = parseFloat(process.env.MESSAGE_TYPING_MAX_WPM || '80');
      const minThinkingTime = parseInt(process.env.MESSAGE_MIN_THINKING_TIME || '2000');
      const maxThinkingTime = parseInt(process.env.MESSAGE_MAX_THINKING_TIME || '5000');

      const getRandomFloat = () => crypto.randomBytes(4).readUInt32LE(0) / 0xffffffff;

      // Calculate typing time (ms per word)
      const wordsPerMs = (minWpm + getRandomFloat() * (maxWpm - minWpm)) / 60000;
      const typingTime = wordCount / wordsPerMs;

      // Add thinking time
      const thinkingTime = minThinkingTime + getRandomFloat() * (maxThinkingTime - minThinkingTime);
      const totalDelay = thinkingTime + typingTime;

      // Cap at reasonable maximum and add 10% variation
      const cappedDelay = Math.min(totalDelay * (0.9 + getRandomFloat() * 0.2), 120000);

      // Critical hit system - 5% chance for instant response
      const criticalHit =
        getRandomFloat() < parseFloat(process.env.MESSAGE_CRITICAL_HIT_CHANCE_0_TYPISTS || '0.05');

      if (!criticalHit && cappedDelay > 1000) {
        ctx.logger(
          `⏱️ Realistic typing delay: ${(cappedDelay / 1000).toFixed(1)}s (${wordCount} words, ${criticalHit ? 'CRITICAL HIT' : 'normal'})`
        );
        await new Promise((resolve) => setTimeout(resolve, cappedDelay));
      } else {
        ctx.logger(
          `⚡ ${criticalHit ? 'CRITICAL HIT! Instant response' : 'Quick response'} (${wordCount} words)`
        );
      }
    }

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

/**
 * Record a single LLM invocation against the provider metrics collector.
 * Failures here are swallowed so metrics never disrupt the message pipeline.
 */
function recordLlmMetric(
  provider: ReturnType<typeof normalizeLlmProviderType>,
  latencyMs: number,
  usage:
    | { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number }
    | null
    | undefined,
  success: boolean
): void {
  if (!provider) return;
  try {
    ProviderMetricsCollector.getInstance().recordLlmRequest(
      provider,
      latencyMs,
      {
        prompt: usage?.prompt_tokens,
        completion: usage?.completion_tokens,
        total: usage?.total_tokens,
      },
      undefined,
      success
    );
  } catch {
    // Metrics are best-effort; never let them break inference.
  }
}
