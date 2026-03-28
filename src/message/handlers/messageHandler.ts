import Debug from 'debug';
import { AuditLogger } from '@src/common/auditLogger';
import { ErrorHandler } from '@src/common/errors/ErrorHandler';
import { PerformanceMonitor } from '@src/common/errors/PerformanceMonitor';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { InputSanitizer } from '@src/utils/InputSanitizer';
import { toolAugmentedCompletion } from '@src/services/toolAugmentedCompletion';
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
import { MemoryManager } from '@src/services/MemoryManager';
import processingLocks from '../processing/processingLocks';

const timingManager = MessageDelayScheduler.getInstance();
const idleResponseManager = IdleResponseManager.getInstance();
const duplicateDetector = DuplicateMessageDetector.getInstance();
const tokenTracker = TokenTracker.getInstance();
const channelDelayManager = ChannelDelayManager.getInstance();
const outgoingRateLimiter = OutgoingMessageRateLimiter.getInstance();
const typingActivity = TypingActivity.getInstance();
const historyTuner = AdaptiveHistoryTuner.getInstance();

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
  botConfig: any
): Promise<string | null> {
  return await PerformanceMonitor.measureAsync(
    async () => {
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

        // Sanitize input
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
          console.error('No message provider available');
          logger('No message provider available');
          return null;
        }

        if (llmProviders.length === 0) {
          console.error('No LLM provider available');
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
          typeof (messageProvider as any)?.resolveAgentContext === 'function'
            ? (messageProvider as any).resolveAgentContext({
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
              .map((v: any) => String(v))
          )
        );

        const defaultChannelId =
          typeof (messageProvider as any).getDefaultChannel === 'function'
            ? (messageProvider as any).getDefaultChannel()
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
            const orig = (message as any).getOriginalMessage?.();
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
            console.info(`🚫 ${botConfig.name} skips @${authorName} in ${channelName}: ${prose}`);
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
        const memoryManager = MemoryManager.getInstance();
        let memoryContext = '';
        try {
          const memories = await memoryManager.retrieveRelevantMemories(
            botConfig.name || resolvedBotId,
            processedMessage,
          );
          memoryContext = memoryManager.formatMemoriesForPrompt(memories);
        } catch (memErr) {
          logger('Memory retrieval failed (non-fatal): %O', memErr);
        }

        // Prepare LLM request
        const baseSystemPrompt = buildSystemPromptWithBotName(
          botConfig.MESSAGE_SYSTEM_PROMPT || '',
          activeAgentName
        );
        const systemPrompt = memoryContext
          ? `${baseSystemPrompt}\n\n${memoryContext}`
          : baseSystemPrompt;

        // Track and trim history (skip for stateful providers that manage their own)
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

        // Generate response
        const startTime = Date.now();
        let llmResponse: any;

        if (botConfig.MESSAGE_LLM_DIRECT) {
          llmResponse = await generateChatCompletionDirect(
            botConfig as any,
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
          llmResponse = typeof toolResult === 'string'
            ? { text: toolResult }
            : toolResult;
        }

        stopTyping = true;
        if (typingInterval) clearInterval(typingInterval);
        if (typingTimeout) clearTimeout(typingTimeout);

        if (!llmResponse || !llmResponse.text) {
          logger('LLM returned empty response.');
          return null;
        }

        let responseText = stripSystemPromptLeak(llmResponse.text, systemPrompt);

        // Clean up formatting
        responseText = responseText.replace(/\\n/g, '\n').trim();

        if (responseText) {
          // Split into parts if needed and send
          const parts = splitMessageContent(
            responseText,
            Number(botConfig.MESSAGE_MAX_LENGTH || 2000)
          );

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
        }

        // Store conversation memories (user message + assistant response)
        const memBotName = botConfig.name || resolvedBotId;
        const memMeta = {
          channelId,
          userId: message.getAuthorId(),
        };
        // Fire-and-forget — memory writes must not slow down or break responses.
        memoryManager.storeConversationMemory(memBotName, processedMessage, 'user', memMeta)
          .catch((e: unknown) => logger('Memory store (user) failed: %O', e));
        memoryManager.storeConversationMemory(memBotName, llmResponse.text, 'assistant', memMeta)
          .catch((e: unknown) => logger('Memory store (assistant) failed: %O', e));

        const endTime = Date.now();
        const processingTime = endTime - startTime;
        logger(`Message processed in ${processingTime}ms`);
        return llmResponse.text;
      } catch (error: unknown) {
        ErrorHandler.handle(error, 'messageHandler.handleMessage');
        const modelInfo = botConfig
          ? ` | provider: ${botConfig.llmProvider} | model: ${botConfig.llmModel || 'default'}`
          : '';
        console.info(
          `❌ INFERENCE/PROCESSING FAILED | error: ${error instanceof Error ? error.message : String(error)}${modelInfo}`
        );
        console.error(
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
