import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';
import { processCommand } from '../helpers/handler/processCommand';
import { stripBotId } from '../helpers/processing/stripBotId';
import { addUserHintFn as addUserHint } from '../helpers/processing/addUserHint';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { generateChatCompletionDirect } from '@integrations/openwebui/directClient';
import { shouldReplyToMessage } from '../helpers/processing/shouldReplyToMessage';
import MessageDelayScheduler from '../helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';
import { ErrorHandler, PerformanceMonitor } from '@src/common/errors/ErrorHandler';
import { InputSanitizer } from '@src/utils/InputSanitizer';
import processingLocks from '../processing/processingLocks';
import { AuditLogger } from '@src/common/auditLogger';
import DuplicateMessageDetector from '../helpers/processing/DuplicateMessageDetector';
import { splitMessageContent } from '../helpers/processing/splitMessageContent';
// New utilities
import TokenTracker from '../helpers/processing/TokenTracker';
import { detectMentions } from '../helpers/processing/MentionDetector';
import { splitOnNewlines, calculateLineDelay } from '../helpers/processing/LineByLineSender';
import { recordBotActivity } from '../helpers/processing/shouldReplyToMessage';

const logger = Debug('app:messageHandler');
const timingManager = MessageDelayScheduler.getInstance();
const idleResponseManager = IdleResponseManager.getInstance();
const duplicateDetector = DuplicateMessageDetector.getInstance();
const tokenTracker = TokenTracker.getInstance();

/**
 * Main message handler for processing incoming messages from various platforms
 *
 * This function orchestrates the entire message processing pipeline including:
 * - Message validation and preprocessing
 * - Bot ID stripping and user hint addition
 * - Command processing vs LLM response generation
 * - Provider selection and response generation
 * - Error handling and logging
 *
 * @param message - The incoming message object containing content and metadata
 * @param historyMessages - Array of previous messages for context (default: empty array)
 * @param botConfig - Bot configuration object containing settings and credentials
 * @returns Promise<string | null> - The bot's response or null if no response needed
 *
 * @throws Will not throw but returns error messages as strings for graceful handling
 *
 * @example
 * ```typescript
 * const response = await handleMessage(message, history, botConfig);
 * if (response) {
 *   await sendMessage(response);
 * }
 * ```
 */
export async function handleMessage(message: IMessage, historyMessages: IMessage[] = [], botConfig: any): Promise<string | null> {
  return await PerformanceMonitor.measureAsync(async () => {
    const channelId = message.getChannelId();

    // Log received message
    const userId = message.getAuthorId();
    const text = message.getText();
    if (text) { // Only log if text exists (check logic inside later handles empty text, but we need text for log)
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
            content: text
          }
        }
      );
    }

    // Concurrency guard: prevent processing multiple messages from the same channel simultaneously (per-bot)
    const botId = botConfig.BOT_ID || botConfig.name || 'unknown-bot';
    if (processingLocks.isLocked(channelId, botId)) {
      logger(`Channel ${channelId} is currently processing another message for bot ${botId}, skipping.`);
      return null;
    }

    processingLocks.lock(channelId, botId);

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
      const messageProviders = getMessengerProvider();
      const llmProviders = getLlmProvider();

      if (messageProviders.length === 0) {
        logger('No message provider available');
        return 'Error: No message provider available';
      }

      if (llmProviders.length === 0) {
        logger('No LLM provider available');
        return 'Error: No LLM provider available';
      }

      const messageProvider = messageProviders[0];
      const llmProvider = llmProviders[0];
      const botId = botConfig.BOT_ID || messageProvider.getClientId();
      const userId = message.getAuthorId();
      let processedMessage = stripBotId(text, botId);
      processedMessage = addUserHint(processedMessage, userId, botId);

      logger(`Processing message in channel ${message.getChannelId()} from user ${userId}: "${processedMessage}"`);
      console.log(`Processed message: "${processedMessage}"`);

      // Command processing
      let commandProcessed = false;
      if (botConfig.MESSAGE_COMMAND_INLINE) {
        await processCommand(message, async (result: string): Promise<void> => {
          const authorisedUsers = botConfig.MESSAGE_COMMAND_AUTHORISED_USERS || '';
          const allowedUsers = authorisedUsers.split(',').map((user: string) => user.trim());
          const botName = botConfig.MESSAGE_USERNAME_OVERRIDE || botConfig.name || 'Bot';
          if (!allowedUsers.includes(userId)) {
            logger('User not authorized:', userId);
            await messageProvider.sendMessageToChannel(message.getChannelId(), 'You are not authorized to use commands.', botName);
            return;
          }
          await messageProvider.sendMessageToChannel(message.getChannelId(), result, botName);
          commandProcessed = true;
        });
        if (commandProcessed) return null;
      }

      // Reply eligibility
      const providerType = botConfig.integration || botConfig.MESSAGE_PROVIDER;
      const platform = providerType === 'discord' ? 'discord' : 'generic';

      // Record interaction for idle response tracking
      const serviceName = botConfig.MESSAGE_PROVIDER || 'generic';
      idleResponseManager.recordInteraction(serviceName, message.getChannelId(), message.getMessageId());

      if (!shouldReplyToMessage(message, botId, platform)) {
        logger('Message not eligible for reply');
        return null;
      }

      // Detect mentions and replies for context hints
      const mentionContext = detectMentions(message, botId, botConfig.name);
      if (mentionContext.contextHint) {
        logger(`Mention context: ${mentionContext.contextHint}`);
      }

      // Token-based spam prevention: check if we should respond based on recent token usage
      // Bypass this check if the bot is directly mentioned or replied to
      if (!mentionContext.isMentioningBot && !mentionContext.isReplyToBot) {
        const tokenProbability = tokenTracker.getResponseProbabilityModifier(channelId);
        if (tokenProbability < 1.0) {
          const roll = Math.random();
          if (roll > tokenProbability) {
            logger(`Token usage high (${tokenTracker.getTokensInWindow(channelId)} tokens), skipping response (roll ${roll.toFixed(2)} > ${tokenProbability.toFixed(2)})`);
            return null;
          }
        }
      } else {
        logger('Direct mention/reply detected - bypassing token probability check');
      }

      // -----------------------------------------------------------------------
      // Delay Before Inference (Simulate Reading & Accumulate Context)
      // -----------------------------------------------------------------------

      // Calculate delay based on message length (reading time)
      const msgText = message.getText() || '';
      const readingDelay = Math.min(8000, Math.max(1000, msgText.length * 50)); // 1s - 8s
      const jitter = Math.floor(Math.random() * 500); // 0-500ms

      // Token usage multiplier (slower if channel is hot)
      const usageMultiplier = tokenTracker.getDelayMultiplier(channelId);

      const totalPreDelay = Math.floor((readingDelay + jitter) * usageMultiplier);

      logger(`Waiting ${totalPreDelay}ms before inference (reading time + usage delay)...`);
      await new Promise(resolve => setTimeout(resolve, totalPreDelay));

      // Refetch history to capture any messages that arrived during the delay
      try {
        const freshHistory = await messageProvider.getMessages(channelId);

        // Sort oldest-first for LLM context (A -> B -> C)
        // Discord fetch usually returns newest-first or mixed, so explicit sort is safest
        freshHistory.sort((a, b) => a.getTimestamp().getTime() - b.getTimestamp().getTime());

        // Filter out the current message to avoid duplication (as it's added as 'userMessage' in prompt)
        historyMessages = freshHistory.filter(m => m.getMessageId() !== message.getMessageId());

        logger(`Refetched history: ${historyMessages.length} messages (latest context)`);
      } catch (err) {
        logger('Failed to refetch history, using original history:', err);
      }

      // LLM processing with retry for duplicates
      const startTime = Date.now();
      const MAX_DUPLICATE_RETRIES = 3;
      let llmResponse: string = '';
      let retryCount = 0;

      const historyForLlm = historyMessages.map(createTimestampedProxy);

      // Adjust max tokens based on recent usage to prevent walls of text
      const defaultMaxTokens = botConfig.openai?.maxTokens || 150;
      const adjustedMaxTokens = tokenTracker.getAdjustedMaxTokens(channelId, defaultMaxTokens);

      while (retryCount <= MAX_DUPLICATE_RETRIES) {
        const systemPrompt =
          botConfig?.OPENAI_SYSTEM_PROMPT ??
          botConfig?.openai?.systemPrompt ??
          botConfig?.llm?.systemPrompt ??
          (message.metadata as any)?.systemPrompt;

        const metadata = {
          ...message.metadata,
          channelId: message.getChannelId(),
          botId: botId,
          // Increase temperature on retries to get more varied responses
          temperatureBoost: retryCount * 0.2,
          // Use adjusted max tokens based on recent usage
          maxTokensOverride: adjustedMaxTokens,
          ...(systemPrompt ? { systemPrompt } : {})
        } as any;

        // Build prompt with mention context and creativity hint on retry
        let prompt = processedMessage;
        if (mentionContext.contextHint) {
          prompt = `${mentionContext.contextHint}\n\n${prompt}`;
        }
        if (retryCount > 0) {
          prompt = `${prompt}\n\n(Please respond differently than before - be creative!)`;
          logger(`Retry ${retryCount}/${MAX_DUPLICATE_RETRIES} with temperature boost: +${metadata.temperatureBoost}`);
        }

        const payload = {
          text: prompt,
          history: historyForLlm.map((m) => ({ role: m.role, content: m.getText() })),
          metadata: metadata,
        };
        logger(`Sending to LLM: ${JSON.stringify(payload)}`);

        try {
          const llm = botConfig?.llm;
          if (llm && String(llm.provider || '').toLowerCase() === 'openwebui' && (llm.apiUrl || llm.model)) {
            const sys = llm.systemPrompt || metadata.systemPrompt || '';
            llmResponse = await generateChatCompletionDirect(
              { apiUrl: llm.apiUrl, authHeader: llm.authHeader, model: llm.model },
              prompt,
              historyForLlm,
              sys
            );
          } else {
            llmResponse = await llmProvider.generateChatCompletion(prompt, historyForLlm, metadata);
          }
        } catch (e) {
          logger('Per-bot LLM override failed, falling back:', e instanceof Error ? e.message : String(e));
          llmResponse = await llmProvider.generateChatCompletion(prompt, historyForLlm, metadata);
        }
        logger(`LLM response: ${llmResponse}`);

        // If empty response, don't retry - just fail
        if (!llmResponse || llmResponse.trim() === '') {
          logger('LLM returned empty response, skipping reply');
          return null;
        }

        // Check for duplicate response
        if (duplicateDetector.isDuplicate(message.getChannelId(), llmResponse)) {
          retryCount++;
          if (retryCount > MAX_DUPLICATE_RETRIES) {
            logger(`Still duplicate after ${MAX_DUPLICATE_RETRIES} retries, sending anyway`);
            break; // Send it anyway after max retries
          }
          logger(`Duplicate response detected, retrying with higher temperature...`);
          continue;
        }

        // Not a duplicate, we're good!
        break;
      }

      // Record tokens for this response
      const estimatedTokens = tokenTracker.estimateTokens(llmResponse);
      tokenTracker.recordTokens(channelId, estimatedTokens);
      logger(`Recorded ${estimatedTokens} tokens for channel ${channelId}`);

      // Split response on newlines for natural line-by-line sending
      let lines = splitOnNewlines(llmResponse);
      const MAX_LINES = 5;
      if (lines.length > MAX_LINES) {
        logger(`Example response has ${lines.length} lines, truncating to ${MAX_LINES} to avoid spam`);
        lines = lines.slice(0, MAX_LINES);
      }
      logger(`Response split into ${lines.length} line(s)`);

      // Get delay multiplier based on recent token usage
      const delayMultiplier = tokenTracker.getDelayMultiplier(channelId);

      // Send each line with typing and delays
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Apply Discord character limit if line is too long
        if (line.length > 1997) {
          const parts = splitMessageContent(line, 1997);
          line = parts[0]; // Just take first part to avoid spam
        }

        // Calculate delay based on line length and token usage
        const baseDelay = calculateLineDelay(line.length);
        const adjustedDelay = Math.floor(baseDelay * delayMultiplier);

        // For lines after the first, wait with typing indicator BEFORE sending
        if (i > 0) {
          logger(`Waiting ${adjustedDelay}ms with typing before line ${i + 1}...`);
          if (messageProvider.sendTyping) {
            await messageProvider.sendTyping(channelId).catch(() => { });
          }
          await new Promise(resolve => setTimeout(resolve, adjustedDelay));
        }

        logger(`About to send line ${i + 1}/${lines.length} (${line.length} chars): "${line.substring(0, 50)}..."`);

        await timingManager.scheduleMessage(
          message.getChannelId(),
          message.getMessageId(),
          line,
          userId,
          async (text: string): Promise<string> => {
            const activeAgentName = botConfig.MESSAGE_USERNAME_OVERRIDE || botConfig.name || 'Bot';
            logger(`SENDING to Discord: "${text.substring(0, 50)}..."`);
            const sentTs = await messageProvider.sendMessageToChannel(message.getChannelId(), text, activeAgentName);
            logger(`Sent message from ${activeAgentName}, response: ${sentTs}`);

            // Record this message for duplicate detection
            duplicateDetector.recordMessage(message.getChannelId(), text);

            // Record bot activity to keep conversation alive (removes silence penalty)
            recordBotActivity(message.getChannelId());

            // Log sent response
            AuditLogger.getInstance().logBotAction(
              'bot',
              'UPDATE',
              botConfig.name || botConfig.BOT_ID || 'unknown-bot',
              'success',
              `Sent response: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
              {
                metadata: {
                  type: 'RESPONSE_SENT',
                  channelId: message.getChannelId(),
                  botId: botConfig.BOT_ID || 'unknown-bot',
                  content: text
                }
              }
            );

            // Record bot response for idle response tracking
            idleResponseManager.recordBotResponse(serviceName, message.getChannelId());

            if (botConfig.MESSAGE_LLM_FOLLOW_UP) {
              const followUpText = `Anything else I can help with after: "${text}"?`;
              await sendFollowUpRequest(message, message.getChannelId(), followUpText, messageProvider);
              logger('Sent follow-up request.');
            }
            return sentTs;
          },
          false
        );
      } // End for loop

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      logger(`Message processed in ${processingTime}ms`);
      return llmResponse;
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'messageHandler.handleMessage');
      return `Error processing message: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      // Always unlock the channel after processing
      processingLocks.unlock(channelId, botId);
    }
  }, 'handleMessage', 5000); // 5 second threshold for warnings
}

/**
 * Creates a Proxy around an IMessage to inject timestamps into getText() output.
 * This ensures the LLM receives context-aware time data without modifying the original object.
 */
function createTimestampedProxy(message: IMessage): IMessage {
  return new Proxy(message, {
    get(target, prop, receiver) {
      if (prop === 'getText') {
        return () => {
          const ts =
            typeof (target as any).getTimestamp === 'function'
              ? (target as any).getTimestamp()?.toISOString?.() ?? new Date().toISOString()
              : new Date().toISOString();

          const author =
            typeof (target as any).getAuthorName === 'function'
              ? String((target as any).getAuthorName() ?? 'Unknown')
              : (typeof (target as any).getAuthorId === 'function' ? String((target as any).getAuthorId() ?? 'Unknown') : 'Unknown');

          const text = typeof (target as any).getText === 'function' ? String((target as any).getText() ?? '') : '';
          return `[${ts}] ${author}: ${text}`;
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
