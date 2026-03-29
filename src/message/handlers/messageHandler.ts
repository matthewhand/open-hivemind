import Debug from 'debug';
import { AuditLogger } from '@src/common/auditLogger';
import { ErrorHandler } from '@src/common/errors/ErrorHandler';
import { PerformanceMonitor } from '@src/common/errors/PerformanceMonitor';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { getQuotaManager } from '@src/middleware/quotaMiddleware';
import { MemoryManager } from '@src/services/MemoryManager';
import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';
import { InputSanitizer } from '@src/utils/InputSanitizer';
import { generateChatCompletionDirect } from '@integrations/openwebui/directClient';
import { ChannelDelayManager } from '@message/helpers/handler/ChannelDelayManager';
import type { IMessage } from '@message/interfaces/IMessage';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';
import MessageDelayScheduler from '../helpers/handler/MessageDelayScheduler';
import { processCommand } from '../helpers/handler/processCommand';
import { summarizeLogWithLlm } from '../helpers/logging/LogProseSummarizer';
import AdaptiveHistoryTuner from '../helpers/processing/AdaptiveHistoryTuner';
import { addUserHintFn as addUserHint } from '../helpers/processing/addUserHint';
import { recordBotActivity } from '../helpers/processing/ChannelActivity';
import DuplicateMessageDetector from '../helpers/processing/DuplicateMessageDetector';
import { trimHistoryToTokenBudget } from '../helpers/processing/HistoryBudgeter';
import { IncomingMessageDensity } from '../helpers/processing/IncomingMessageDensity';
import OutgoingMessageRateLimiter from '../helpers/processing/OutgoingMessageRateLimiter';
import { shouldReplyToMessage } from '../helpers/processing/shouldReplyToMessage';
import { splitMessageContent } from '../helpers/processing/splitMessageContent';
import { stripBotId } from '../helpers/processing/stripBotId';
// New utilities
import TokenTracker from '../helpers/processing/TokenTracker';
import TypingActivity from '../helpers/processing/TypingActivity';
import { ContentFilterService } from '@src/services/ContentFilterService';
import { PipelineMetrics, pipelineEventEmitter } from '../PipelineMetrics';
import { PipelineMetricsAggregator } from '../PipelineMetricsAggregator';
import processingLocks from '../processing/processingLocks';

const timingManager = MessageDelayScheduler.getInstance();
const idleResponseManager = IdleResponseManager.getInstance();
const duplicateDetector = DuplicateMessageDetector.getInstance();
const tokenTracker = TokenTracker.getInstance();
const channelDelayManager = ChannelDelayManager.getInstance();
const outgoingRateLimiter = OutgoingMessageRateLimiter.getInstance();
const typingActivity = TypingActivity.getInstance();
const historyTuner = AdaptiveHistoryTuner.getInstance();
const contentFilterService = ContentFilterService.getInstance();

/**
 * Main message handler that processes incoming messages and generates responses.
 *
 * This function handles the complete message processing pipeline including:
 * - Input sanitization and validation
 * - Command processing
 * - Reply eligibility determination
 * - Delay and timing management
 * - LLM inference with retry logic
 * - Response sending with typing indicators
 *
 * @param {IMessage} message - The incoming message to process
 * @param {IMessage[]} [historyMessages=[]] - Previous messages for context
 * @param {any} botConfig - Bot configuration settings
 * @returns {Promise<string | null>} The generated response, or null if no response should be sent
 *
 * @example
 * ```typescript
 * const response = await handleMessage(
 *   message,
 *   historyMessages,
 *   botConfig
 * );
 * if (response) {
 *   console.log('Bot responded:', response);
 * }
 * ```
 */

export async function handleMessage(
  message: IMessage,
  historyMessages: IMessage[] = [],
  botConfig: Record<string, unknown>
): Promise<string | null> {
  return await PerformanceMonitor.measureAsync(
    async () => {
      const pipelineMetrics = new PipelineMetrics();
      pipelineMetrics.startStage('receive');
      const channelId = message.getChannelId();
      let resolvedBotId = botConfig.BOT_ID || botConfig.name || 'unknown-bot';
      let delayKey: string | null = null;
      let isLeaderInvocation = false;
      let didLock = false;
      const activeAgentName = botConfig.MESSAGE_USERNAME_OVERRIDE || botConfig.name || 'Bot';
      let providerSenderKey = activeAgentName;
      let typingInterval: NodeJS.Timeout | null = null;
      let typingTimeout: NodeJS.Timeout | null = null;
      let stopTyping = false;
      let historyTuneKey: string | null = null;
      let historyTuneRequestedLimit: number | null = null;

      // Use a per-bot debug namespace so logs are easily attributable in swarm mode.
      const logger = Debug(`app:messageHandler:${activeAgentName}`);

      // Helper for random integer (chaos)
      const randInt = (min: number, max: number): number =>
        Math.floor(Math.random() * (max - min + 1)) + min;

      // Log received message
      const userId = message.getAuthorId();
      const text = message.getText();
      if (text) {
        // Only log if text exists (check logic inside later handles empty text, but we need text for log)
        AuditLogger.getInstance().logBotAction(
          userId,
          'UPDATE',
          botConfig.name || botConfig.BOT_ID || 'unknown-bot',
          'success',
          `Received message: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          {
            metadata: {
              type: 'MESSAGE_RECEIVED',
              channelId: channelId,
              botId: botConfig.BOT_ID || 'unknown-bot',
              content: text,
            },
          }
        );
      }

      try {
        const text = message.getText();
        if (!text) {
          logger('Empty message content, skipping processing.');
          return null;
        }
        pipelineMetrics.endStage('receive', { channelId, hasText: true });

        // Sanitize input
        pipelineMetrics.startStage('validate');
        const sanitizedText = InputSanitizer.sanitizeMessage(text);
        const validation = InputSanitizer.validateMessage(sanitizedText);
        if (!validation.isValid) {
          logger(`Invalid message: ${validation.reason}`);
          return null;
        }

        // Get providers safely
        const messageProviders = await getMessengerProvider();
        const llmProviders = await getLlmProvider();

        if (messageProviders.length === 0) {
          logger('ERROR:', 'No message provider available');
          logger('No message provider available');
          return null;
        }

        if (llmProviders.length === 0) {
          logger('ERROR:', 'No LLM provider available');
          logger('No LLM provider available');
          return null;
        }

        const messageProvider = messageProviders[0];
        const llmProvider = llmProviders[0];
        const providerType =
          botConfig.messageProvider ||
          botConfig.MESSAGE_PROVIDER ||
          botConfig.integration ||
          'generic';
        const platform = providerType.toLowerCase();

        // Delegate platform-specific identity/routing to the integration layer.
        const resolvedAgentContext =
          typeof (messageProvider as Record<string, unknown>)?.resolveAgentContext === 'function'
            ? (messageProvider as Record<string, unknown>).resolveAgentContext({
                botConfig,
                agentDisplayName: activeAgentName,
              })
            : null;

        const botId = String(
          resolvedAgentContext?.botId || botConfig?.BOT_ID || messageProvider.getClientId() || ''
        );
        resolvedBotId = botId || resolvedBotId;
        providerSenderKey = String(
          resolvedAgentContext?.senderKey || botConfig?.name || activeAgentName
        );
        const userId = message.getAuthorId();
        let processedMessage = stripBotId(text, botId);
        processedMessage = addUserHint(processedMessage, userId, botId);

        logger(
          `Processing message in channel ${message.getChannelId()} from user ${userId}: "${processedMessage}"`
        );
        logger(`Processed message: "${processedMessage}"`);

        // Content filter check (bypasses system messages)
        if (botConfig.contentFilter) {
          const filterResult = contentFilterService.checkContent(
            processedMessage,
            botConfig.contentFilter,
            message.role
          );

          if (!filterResult.allowed) {
            logger(
              `Content blocked by filter: ${filterResult.reason}`,
              filterResult.matchedTerms
            );
            AuditLogger.getInstance().logBotAction(
              userId,
              'BLOCK',
              botConfig.name || botConfig.BOT_ID || 'unknown-bot',
              'success',
              `Content blocked: ${filterResult.reason}`,
              {
                metadata: {
                  type: 'CONTENT_FILTER_BLOCK',
                  channelId: channelId,
                  botId: botConfig.BOT_ID || 'unknown-bot',
                  matchedTerms: filterResult.matchedTerms,
                  strictness: botConfig.contentFilter.strictness,
                },
              }
            );

            // Optionally send a message to the user (configurable)
            if (botConfig.MESSAGE_CONTENT_FILTER_NOTIFY !== false) {
              try {
                await messageProvider.sendMessageToChannel(
                  message.getChannelId(),
                  'Your message contains content that is not allowed.',
                  providerSenderKey
                );
              } catch (notifyErr) {
                logger('Failed to send content filter notification:', notifyErr);
              }
            }

            return null;
          }
        }

        // Command processing
        let commandProcessed = false;
        if (botConfig.MESSAGE_COMMAND_INLINE) {
          await processCommand(message, async (result: string): Promise<void> => {
            const authorisedUsers = botConfig.MESSAGE_COMMAND_AUTHORISED_USERS || '';
            const allowedUsers = authorisedUsers.split(',').map((user: string) => user.trim());
            if (!allowedUsers.includes(userId)) {
              logger('User not authorized:', userId);
              await messageProvider.sendMessageToChannel(
                message.getChannelId(),
                'You are not authorized to use commands.',
                providerSenderKey
              );
              if (resolvedBotId) {
                recordBotActivity(message.getChannelId(), resolvedBotId);
              }
              commandProcessed = true;
              return;
            }
            await messageProvider.sendMessageToChannel(
              message.getChannelId(),
              result,
              providerSenderKey
            );
            if (resolvedBotId) {
              recordBotActivity(message.getChannelId(), resolvedBotId);
            }
            commandProcessed = true;
          });
          if (commandProcessed) {
            return null;
          }
        }

        // Reply eligibility

        // Record interaction for idle response tracking
        const serviceName = botConfig.MESSAGE_PROVIDER || 'generic';
        // Only record non-bot messages as "interactions" to avoid bots (including our own idle replies)
        // continuously rescheduling idle responses.
        if (!message.isFromBot()) {
          idleResponseManager.recordInteraction(
            serviceName,
            message.getChannelId(),
            message.getMessageId()
          );
        }

        const replyNameCandidates: string[] = Array.from(
          new Set(
            (resolvedAgentContext?.nameCandidates || [activeAgentName, botConfig?.name])
              .filter(Boolean)
              .map((v: unknown) => String(v))
          )
        );

        const defaultChannelId =
          typeof (messageProvider as Record<string, unknown>).getDefaultChannel === 'function'
            ? (messageProvider as Record<string, unknown>).getDefaultChannel()
            : undefined;

        const replyDecision = await shouldReplyToMessage(
          message,
          botId,
          platform,
          replyNameCandidates,
          historyMessages,
          defaultChannelId,
          botConfig
        );
        const decisionTimestamp = Date.now();
        pipelineMetrics.endStage('validate', {
          shouldReply: replyDecision.shouldReply,
          reason: replyDecision.reason,
        });

        // Safely extract human-readable names for logging
        const authorName = (() => {
          try {
            return (
              (typeof message.getAuthorName === 'function' ? message.getAuthorName() : null) ||
              (typeof message.getAuthorId === 'function'
                ? `user:${message.getAuthorId()}`
                : 'someone')
            );
          } catch {
            return 'someone';
          }
        })();
        const channelName = (() => {
          try {
            // Try to get channel name from the original message if Discord
            const orig = (message as unknown as Record<string, unknown>).getOriginalMessage?.();
            if (orig?.channel?.name) {
              return `#${orig.channel.name}`;
            }
            return `ch:${channelId.slice(-6)}`; // Truncated ID fallback
          } catch {
            return `ch:${channelId.slice(-6)}`;
          }
        })();

        if (!replyDecision.shouldReply) {
          logger(`Message not eligible for reply: ${replyDecision.reason}`);
          if (replyDecision.reason !== 'Message from self') {
            // Prose explanation at info level with context
            let prose = replyDecision.meta?.prose || replyDecision.reason;
            prose = await summarizeLogWithLlm(prose);
            console.info(
              `\u{1F6AB} ${botConfig.name} skips @${authorName} in ${channelName}: ${prose}`
            );
          }
          return null;
        }

        // Logic for handling "Leader" bot role in swarm mode
        isLeaderInvocation = !!replyDecision.meta?.isLeader;
        delayKey = `${channelId}:${resolvedBotId}`;

        // If we are responding, attempt to lock this channel for this bot to prevent double-replying.
        if (processingLocks.isLocked(channelId, resolvedBotId)) {
          logger(`Could not acquire lock for channel ${channelId}, skipping.`);
          return null;
        }
        processingLocks.lock(channelId, resolvedBotId);
        didLock = true;

        // Calculate and apply delays
        const density = IncomingMessageDensity.getInstance().getDensity(channelId);
        const isFollowUp =
          historyMessages.length > 0 &&
          historyMessages[historyMessages.length - 1].getAuthorId() === botId;

        const minDelay = Number(botConfig.MESSAGE_MIN_DELAY || 0);
        if (minDelay > 0) {
          logger(`Waiting ${minDelay}ms before processing...`);
          await new Promise((resolve) => setTimeout(resolve, minDelay));
        }

        // Set up typing indicators
        if (botConfig.MESSAGE_TYPING_INDICATOR) {
          typingInterval = setInterval(async () => {
            if (stopTyping) return;
            try {
              await messageProvider.sendTypingIndicator(channelId);
            } catch (err) {
              logger('Failed to send typing indicator:', err);
            }
          }, 4000);

          typingTimeout = setTimeout(() => {
            stopTyping = true;
            if (typingInterval) clearInterval(typingInterval);
          }, 30000);
        }

        // Retrieve relevant memories (if memory provider is configured for this bot)
        pipelineMetrics.startStage('memory_search');
        const memoryManager = MemoryManager.getInstance();
        let memoryContext = '';
        try {
          const memories = await memoryManager.retrieveRelevantMemories(
            botConfig.name || resolvedBotId,
            processedMessage
          );
          memoryContext = memoryManager.formatMemoriesForPrompt(memories);
        } catch (memErr) {
          logger('Memory retrieval failed (non-fatal): %O', memErr);
        }
        pipelineMetrics.endStage('memory_search', { hasMemories: memoryContext.length > 0 });

        // Prepare LLM request
        const baseSystemPrompt = buildSystemPromptWithBotName(
          botConfig.MESSAGE_SYSTEM_PROMPT || '',
          activeAgentName
        );
        const systemPrompt = memoryContext
          ? `${baseSystemPrompt}\n\n${memoryContext}`
          : baseSystemPrompt;

        // Track and trim history (skip for stateful providers that manage their own)
        pipelineMetrics.startStage('history');
        const maxHistoryTokens = Number(botConfig.LLM_MAX_HISTORY_TOKENS || 2000);
        const providerWantsHistory = llmProvider.supportsHistory
          ? llmProvider.supportsHistory()
          : true;
        const trimmedHistory = providerWantsHistory
          ? trimHistoryToTokenBudget(historyMessages, {
              inputBudgetTokens: maxHistoryTokens,
              promptText: processedMessage,
            })
          : { trimmed: [] as IMessage[] };
        pipelineMetrics.endStage('history', { trimmedCount: trimmedHistory.trimmed.length });

        // ── Quota enforcement: check before expensive LLM inference ──
        if (process.env.DISABLE_QUOTA !== 'true') {
          const quotaManager = getQuotaManager();
          const quotaEntityId = userId || channelId;
          const quotaEntityType = userId ? ('user' as const) : ('channel' as const);
          const quotaStatus = await quotaManager.checkQuota(quotaEntityId, quotaEntityType);
          if (!quotaStatus.allowed) {
            logger(
              `Quota exceeded for ${quotaEntityType}:${quotaEntityId} — ` +
                `min=${quotaStatus.used.minute} hr=${quotaStatus.used.hour} day=${quotaStatus.used.day}`
            );
            return null;
          }
          // Consume one request unit now; tokens are consumed after inference
          await quotaManager.consumeQuota(quotaEntityId, quotaEntityType);
        }

        // Generate response
        pipelineMetrics.startStage('llm_inference');
        const startTime = Date.now();
        let llmResponse: { text: string } | null;

        if (botConfig.MESSAGE_LLM_DIRECT) {
          llmResponse = await generateChatCompletionDirect(
            botConfig as Record<string, unknown>,
            processedMessage,
            trimmedHistory.trimmed,
            systemPrompt
          );
        } else {
          // Use tool-augmented completion which transparently handles
          // tool calling when the bot has MCP servers configured, and
          // falls back to the standard path when there are no tools.
          const botNameForTools = botConfig.name || botConfig.BOT_ID || '';
          const toolResult = await toolAugmentedCompletion({
            botName: botNameForTools,
            llmProvider,
            userMessage: processedMessage,
            historyMessages: trimmedHistory.trimmed,
            metadata: {
              systemPrompt,
              maxTokens: Number(botConfig.LLM_MAX_TOKENS || 150),
              temperature: Number(botConfig.LLM_TEMPERATURE || 0.7),
              channelId: message.getChannelId(),
              userId: message.getAuthorId(),
            },
            systemPrompt,
            toolContext: {
              userId: message.getAuthorId(),
              channelId: message.getChannelId(),
              messageProvider: providerType,
            },
          });
          // Normalise to { text: string } so the downstream `.text` checks work
          // regardless of whether the provider returned a string or an object.
          llmResponse = typeof toolResult === 'string' ? { text: toolResult } : toolResult;
        }
        pipelineMetrics.endStage('llm_inference', {
          hasResponse: !!(llmResponse && llmResponse.text),
        });

        // ── Quota: consume token usage after inference completes ──
        if (process.env.DISABLE_QUOTA !== 'true' && llmResponse?.text) {
          try {
            const quotaManager = getQuotaManager();
            const quotaEntityId = userId || channelId;
            const quotaEntityType = userId ? ('user' as const) : ('channel' as const);
            // Estimate tokens from response length (rough: 1 token ~ 4 chars)
            const estimatedTokens =
              llmResponse.usage?.total_tokens ?? Math.ceil((llmResponse.text?.length ?? 0) / 4);
            await quotaManager.consumeTokens(quotaEntityId, quotaEntityType, estimatedTokens);
          } catch (tokenErr) {
            logger('Failed to record token quota (non-fatal):', tokenErr);
          }
        }

        stopTyping = true;
        if (typingInterval) clearInterval(typingInterval);
        if (typingTimeout) clearTimeout(typingTimeout);

        if (!llmResponse || !llmResponse.text) {
          logger('LLM returned empty response.');
          return null;
        }

        pipelineMetrics.startStage('format');
        let responseText = stripSystemPromptLeak(llmResponse.text, systemPrompt);

        // Clean up formatting
        responseText = responseText.replace(/\\n/g, '\n').trim();

        // Apply content filter to bot responses (optional, for safety)
        if (botConfig.contentFilter && botConfig.contentFilter.enabled) {
          const botFilterResult = contentFilterService.checkContent(
            responseText,
            botConfig.contentFilter,
            'assistant' // Bot responses are assistant role
          );

          if (!botFilterResult.allowed) {
            logger(
              `Bot response blocked by filter: ${botFilterResult.reason}`,
              botFilterResult.matchedTerms
            );
            AuditLogger.getInstance().logBotAction(
              userId,
              'BLOCK',
              botConfig.name || botConfig.BOT_ID || 'unknown-bot',
              'success',
              `Bot response blocked: ${botFilterResult.reason}`,
              {
                metadata: {
                  type: 'BOT_RESPONSE_FILTER_BLOCK',
                  channelId: channelId,
                  botId: botConfig.BOT_ID || 'unknown-bot',
                  matchedTerms: botFilterResult.matchedTerms,
                  strictness: botConfig.contentFilter.strictness,
                },
              }
            );

            // Don't send the response
            return null;
          }
        }

        // Split into parts if needed
        const parts = responseText
          ? splitMessageContent(responseText, Number(botConfig.MESSAGE_MAX_LENGTH || 2000))
          : [];
        pipelineMetrics.endStage('format', { parts: parts.length });

        if (responseText) {
          pipelineMetrics.startStage('send');
          for (const part of parts) {
            const finalReplyId = botConfig.MESSAGE_REPLY_IN_THREAD
              ? message.getMessageId()
              : undefined;
            const sentTs = await messageProvider.sendMessageToChannel(
              channelId,
              part,
              providerSenderKey,
              undefined,
              finalReplyId
            );

            // Post-send accounting
            duplicateDetector.recordMessage(channelId, part);
            outgoingRateLimiter.recordSend(channelId);
            if (resolvedBotId) recordBotActivity(channelId, resolvedBotId);

            idleResponseManager.recordBotResponse(serviceName, channelId);
          }
          pipelineMetrics.endStage('send', { partsSent: parts.length });
        }

        // Store conversation memories (user message + assistant response)
        pipelineMetrics.startStage('memory_store');
        const memBotName = botConfig.name || resolvedBotId;
        const memMeta = {
          channelId,
          userId: message.getAuthorId(),
        };
        // Fire-and-forget \u2014 memory writes must not slow down or break responses.
        memoryManager
          .storeConversationMemory(memBotName, processedMessage, 'user', memMeta)
          .catch((e: unknown) => logger('Memory store (user) failed: %O', e));
        memoryManager
          .storeConversationMemory(memBotName, llmResponse.text, 'assistant', memMeta)
          .catch((e: unknown) => logger('Memory store (assistant) failed: %O', e));
        pipelineMetrics.endStage('memory_store');

        const endTime = Date.now();
        const processingTime = endTime - startTime;
        logger(`Message processed in ${processingTime}ms`);

        // Emit pipeline metrics for monitoring
        const metricsJson = pipelineMetrics.toJSON();
        logger('Pipeline metrics: %O', metricsJson);
        pipelineEventEmitter.emit('pipeline:complete', metricsJson);
        PipelineMetricsAggregator.getInstance().record(metricsJson as any);

        return llmResponse.text;
      } catch (error: unknown) {
        ErrorHandler.handle(error, 'messageHandler.handleMessage');
        const modelInfo = botConfig
          ? ` | provider: ${botConfig.llmProvider} | model: ${botConfig.llmModel || 'default'}`
          : '';
        console.info(
          `\u274C INFERENCE/PROCESSING FAILED | error: ${error instanceof Error ? error.message : String(error)}${modelInfo}`
        );
        logger(
          'ERROR:',
          `Error processing message: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      } finally {
        stopTyping = true;
        // Stop typing indicator interval if running.
        if (typingInterval) {
          try {
            clearInterval(typingInterval);
          } catch {}
          typingInterval = null;
        }
        if (typingTimeout) {
          try {
            clearTimeout(typingTimeout);
          } catch {}
          typingTimeout = null;
        }
        // Always unlock the channel after processing
        if (didLock) {
          try {
            processingLocks.unlock(channelId, resolvedBotId);
          } catch {}
        }
        if (isLeaderInvocation && delayKey) {
          try {
            channelDelayManager.clear(delayKey);
          } catch {}
        }
      }
    },
    'handleMessage',
    5000
  ); // 5 second threshold for warnings
}

function stripSystemPromptLeak(response: string, ...promptTexts: string[]): string {
  let out = String(response ?? '');
  if (!out) {
    return out;
  }

  const prompts = (promptTexts || [])
    .map((p) => String(p || ''))
    .map((p) => p.trim())
    .filter(Boolean);

  if (prompts.length === 0) {
    return out;
  }

  for (const p of prompts) {
    if (!p) {
      continue;
    }
    if (!out.includes(p)) {
      continue;
    }
    out = out.replaceAll(p, '');
  }

  return out.trim();
}

function buildSystemPromptWithBotName(baseSystemPrompt: unknown, botName: string): string {
  const base = typeof baseSystemPrompt === 'string' ? baseSystemPrompt.trim() : '';
  const name = String(botName || '').trim();
  const hint = name
    ? `You are ${name}. Your display name in chat is "${name}".`
    : 'You are an assistant operating inside a multi-user chat.';

  if (!base) {
    return hint;
  }
  // Put the hint first so models see it early.
  return `${hint}\n\n${base}`;
}
