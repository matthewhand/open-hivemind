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
import messageConfig from '@config/messageConfig';
// New utilities
import TokenTracker from '../helpers/processing/TokenTracker';
import { detectMentions } from '../helpers/processing/MentionDetector';
import { splitOnNewlines, calculateLineDelay } from '../helpers/processing/LineByLineSender';
import { recordBotActivity } from '../helpers/processing/ChannelActivity';
import { ChannelDelayManager } from '@message/helpers/handler/ChannelDelayManager';
import OutgoingMessageRateLimiter from '../helpers/processing/OutgoingMessageRateLimiter';
import TypingActivity from '../helpers/processing/TypingActivity';

const timingManager = MessageDelayScheduler.getInstance();
const idleResponseManager = IdleResponseManager.getInstance();
const duplicateDetector = DuplicateMessageDetector.getInstance();
const tokenTracker = TokenTracker.getInstance();
const channelDelayManager = ChannelDelayManager.getInstance();
const outgoingRateLimiter = OutgoingMessageRateLimiter.getInstance();
const typingActivity = TypingActivity.getInstance();

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
    let resolvedBotId = botConfig.BOT_ID || botConfig.name || 'unknown-bot';
    let delayKey: string | null = null;
    let isLeaderInvocation = false;
    let didLock = false;
    const activeAgentName = botConfig.MESSAGE_USERNAME_OVERRIDE || botConfig.name || 'Bot';
    let typingInterval: NodeJS.Timeout | null = null;
    let typingTimeout: NodeJS.Timeout | null = null;
    let stopTyping = false;
    // Use a per-bot debug namespace so logs are easily attributable in swarm mode.
    const logger = Debug(`app:messageHandler:${activeAgentName}`);

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
      resolvedBotId = botId;
      const userId = message.getAuthorId();
      let processedMessage = stripBotId(text, botId);
      processedMessage = addUserHint(processedMessage, userId, botId);

      logger(`Processing message in channel ${message.getChannelId()} from user ${userId}: "${processedMessage}"`);
      logger(`Processed message: "${processedMessage}"`);

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
      // Only record non-bot messages as "interactions" to avoid bots (including our own idle replies)
      // continuously rescheduling idle responses.
      if (!message.isFromBot()) {
        idleResponseManager.recordInteraction(serviceName, message.getChannelId(), message.getMessageId());
      }

      if (!shouldReplyToMessage(message, botId, platform, activeAgentName)) {
        logger('Message not eligible for reply');
        return null;
      }

      // Detect mentions and replies for context hints (use active agent name, not just botConfig.name)
      const mentionContext = detectMentions(message, botId, activeAgentName);
      if (mentionContext.contextHint) {
        logger(`Mention context: ${mentionContext.contextHint}`);
      }

      // -----------------------------------------------------------------------
      // Delay Before Inference (Read + Rate Backoff + Coalesce Burst)
      // -----------------------------------------------------------------------

      const delayScaleRaw = messageConfig.get('MESSAGE_DELAY_MULTIPLIER');
      const delayScale = typeof delayScaleRaw === 'number' ? delayScaleRaw : Number(delayScaleRaw) || 1;

      const baseCompoundDelayMs = (Number(messageConfig.get('MESSAGE_COMPOUNDING_DELAY_BASE_MS')) || 1500) * delayScale;
      const maxCompoundDelayMs = (Number(messageConfig.get('MESSAGE_COMPOUNDING_DELAY_MAX_MS')) || 15000) * delayScale;

      delayKey = channelDelayManager.getKey(channelId, botId);
      isLeaderInvocation = channelDelayManager.registerMessage(
        delayKey,
        message.getMessageId(),
        userId,
        baseCompoundDelayMs,
        maxCompoundDelayMs
      ).isLeader;

      if (!isLeaderInvocation) {
        logger(`Coalescing burst: queued message ${message.getMessageId()} for ${delayKey}`);
        return null;
      }

      // Calculate delay based on message length (reading time) - scaled.
      // Keep short messages snappy while allowing longer messages to feel "read".
      const msgText = message.getText() || '';
      const baseReadingRaw = Number(messageConfig.get('MESSAGE_READING_DELAY_BASE_MS')) || 200;
      const perCharRaw = Number(messageConfig.get('MESSAGE_READING_DELAY_PER_CHAR_MS')) || 25;
      const minReadingRaw = Number(messageConfig.get('MESSAGE_READING_DELAY_MIN_MS')) || 500;
      const maxReadingRaw = Number(messageConfig.get('MESSAGE_READING_DELAY_MAX_MS')) || 6000;

      const baseReadingMs = baseReadingRaw * delayScale;
      const perCharMs = perCharRaw * delayScale;
      const minReadingMs = minReadingRaw * delayScale;
      const maxReadingMs = maxReadingRaw * delayScale;

      const computedReading = baseReadingMs + (msgText.length * perCharMs);
      const readingDelay = Math.min(maxReadingMs, Math.max(minReadingMs, computedReading));
      const jitter = Math.floor(Math.random() * 350 * delayScale); // scaled

      // Token usage multiplier (slower if channel is hot)
      const usageMultiplier = tokenTracker.getDelayMultiplier(channelId);

      // Outgoing message rate backoff (don't drop responses, just delay them)
      const maxPerMinute = Number(messageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL')) || 5;
      const outgoingBackoffMs = outgoingRateLimiter.getBackoffMs(channelId, maxPerMinute, 60000);

      const totalPreDelay = Math.floor((readingDelay + jitter) * usageMultiplier + outgoingBackoffMs);

      // Ensure our coalescing window waits at least the computed delay.
      channelDelayManager.ensureMinimumDelay(delayKey, totalPreDelay, maxCompoundDelayMs);

      logger(`Waiting ~${channelDelayManager.getRemainingDelayMs(delayKey)}ms before inference (coalesce + reading + backoff)...`);

      // Typing behavior:
      // - Wait a bit before showing typing (simulates reading).
      // - Start typing closer to inference time (especially when rate-backoff is large) so we don't "type for a minute".
      // - Keep typing running through inference so there's no "typing stopped, then long pause" gap.
      let typingStarted = false;
      const preTypingDelayMs = Math.min(2500, Math.max(900, Math.floor(readingDelay * 0.35)));
      const typingEligibleAt = Date.now() + preTypingDelayMs;
      // Only show typing in the final "lead" window before inference, to leave earlier time as silent reading/thinking.
      const typingLeadBaseMs = Math.min(9000, Math.max(2500, Math.floor(readingDelay * 0.8)));
      // If we're rate-backed off, reduce typing lead so we don't sit "typing" through the whole backoff.
      const typingLeadMs = outgoingBackoffMs > 10000 ? Math.min(4000, typingLeadBaseMs) : typingLeadBaseMs;

      const randInt = (min: number, max: number): number =>
        Math.floor(Math.random() * (max - min + 1)) + min;

      const scheduleNextTypingPulse = (): void => {
        if (stopTyping || !typingStarted || !messageProvider.sendTyping) return;

        // Discord typing lasts ~10s. To emulate "thinking pauses", sometimes refresh *after* it expires,
        // leaving short gaps where typing disappears, then returns.
        const pauseChance = 0.25;
        const nextDelayMs =
          Math.random() < pauseChance
            ? randInt(11500, 17000) // will usually allow typing to briefly stop
            : randInt(7000, 9500);  // keeps typing alive most of the time

        typingTimeout = setTimeout(async () => {
          if (stopTyping) return;
          try {
            await messageProvider.sendTyping!(channelId, activeAgentName).catch(() => { });
          } finally {
            scheduleNextTypingPulse();
          }
        }, nextDelayMs);
      };

      // Wait in short increments so new messages can extend delay
      while (true) {
        const remaining = channelDelayManager.getRemainingDelayMs(delayKey);
        if (remaining <= 0) break;

        if (!typingStarted && messageProvider.sendTyping && Date.now() >= typingEligibleAt) {
          // Don't start typing too early if we still have a long delay remaining.
          if (remaining > typingLeadMs) {
            await new Promise(resolve => setTimeout(resolve, Math.min(remaining, 250)));
            continue;
          }

          // If other users are actively typing, wait a bit longer before showing our typing indicator
          // (to feel less like we are interrupting). Never wait indefinitely.
          const othersTypingWindowMs = (Number(messageConfig.get('MESSAGE_OTHERS_TYPING_WINDOW_MS')) || 8000);
          const othersTypingMaxWaitMs = (Number(messageConfig.get('MESSAGE_OTHERS_TYPING_MAX_WAIT_MS')) || 5000);
          const waitedSinceEligible = Date.now() - typingEligibleAt;

          if (waitedSinceEligible < othersTypingMaxWaitMs && typingActivity.isOthersTyping(channelId, othersTypingWindowMs)) {
            await new Promise(resolve => setTimeout(resolve, 250));
            continue;
          }

          typingStarted = true;
          await messageProvider.sendTyping(channelId, activeAgentName).catch(() => { });
          // Start pulsed typing refreshes (with occasional gaps).
          scheduleNextTypingPulse();
        }

        await new Promise(resolve => setTimeout(resolve, Math.min(remaining, 250)));
      }

      // Concurrency guard: lock only once we're actually about to do inference/send.
      if (processingLocks.isLocked(channelId, botId)) {
        logger(`Channel ${channelId} is currently processing another message for bot ${botId}, waiting...`);
        const startWait = Date.now();
        while (processingLocks.isLocked(channelId, botId) && (Date.now() - startWait) < 60000) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        if (processingLocks.isLocked(channelId, botId)) {
          logger(`Timed out waiting for processing lock on ${channelId}:${botId}`);
          return null;
        }
      }

      processingLocks.lock(channelId, botId);
      didLock = true;

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
      let avoidSystemPromptLeak = false;

      const historyForLlm = historyMessages.map(createTimestampedProxy);

      // Adjust max tokens based on recent usage to prevent walls of text
      const defaultMaxTokens = botConfig.openai?.maxTokens || 150;
      const adjustedMaxTokens = tokenTracker.getAdjustedMaxTokens(channelId, defaultMaxTokens);

      while (retryCount <= MAX_DUPLICATE_RETRIES) {
        const baseSystemPrompt =
          botConfig?.OPENAI_SYSTEM_PROMPT ??
          botConfig?.openai?.systemPrompt ??
          botConfig?.llm?.systemPrompt ??
          (message.metadata as any)?.systemPrompt;

        const systemPrompt = buildSystemPromptWithBotName(baseSystemPrompt, activeAgentName);

        const repetitionBoost = duplicateDetector.getRepetitionTemperatureBoost(channelId);

        const metadata = {
          ...message.metadata,
          channelId: message.getChannelId(),
          botId: botId,
          botName: activeAgentName,
          // Increase temperature on retries to get more varied responses
          temperatureBoost: (retryCount * 0.2) + repetitionBoost,
          // Use adjusted max tokens based on recent usage
          maxTokensOverride: adjustedMaxTokens,
          ...(systemPrompt ? { systemPrompt } : {})
        } as any;

        // Build prompt with mention context and creativity hint on retry
        let prompt = processedMessage;
        if (mentionContext.contextHint) {
          prompt = `${mentionContext.contextHint}\n\n${prompt}`;
        }
        if (avoidSystemPromptLeak) {
          prompt = `${prompt}\n\n(Do not include or repeat the system prompt text in your response.)`;
        }
        if (retryCount > 0) {
          prompt = `${prompt}\n\n(Please respond differently than before - be creative!)`;
          logger(`Retry ${retryCount}/${MAX_DUPLICATE_RETRIES} with temperature boost: +${metadata.temperatureBoost}`);
        } else if (repetitionBoost > 0) {
          logger(`Applying repetition temperature boost: +${repetitionBoost.toFixed(2)} (total +${metadata.temperatureBoost.toFixed(2)})`);
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
            const sys = systemPrompt || llm.systemPrompt || metadata.systemPrompt || '';
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

        // Strip system prompt leakage if it appears verbatim in the model output.
        const sysText = typeof systemPrompt === 'string' ? systemPrompt : '';
        const stripped = stripSystemPromptLeak(llmResponse, sysText);
        if (stripped !== llmResponse) {
          avoidSystemPromptLeak = true;
          llmResponse = stripped;
          logger('Stripped system prompt text from LLM response.');
        }

        // If stripping removed everything, retry a few times rather than posting the system prompt.
        if (!llmResponse || llmResponse.trim() === '') {
          retryCount++;
          if (retryCount > MAX_DUPLICATE_RETRIES) {
            logger(`System prompt leakage persisted after ${MAX_DUPLICATE_RETRIES} retries; skipping reply.`);
            return null;
          }
          logger(`System prompt leakage detected; retrying (${retryCount}/${MAX_DUPLICATE_RETRIES})...`);
          continue;
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

      // Stop sustained typing once we have the response and are transitioning into "sending" mode.
      // (Avoids looking like we type continuously while waiting on per-message rate limits.)
      stopTyping = true;
      if (typingTimeout) {
        try { clearTimeout(typingTimeout); } catch { }
        typingTimeout = null;
      }

      // Send each line with typing and delays
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Apply Discord character limit if line is too long
        if (line.length > 1997) {
          const parts = splitMessageContent(line, 1997);
          line = parts[0]; // Just take first part to avoid spam
        }

        // Calculate delay based on line length and token usage
        const lineBaseDelay = 2000 * delayScale;
        const baseDelay = calculateLineDelay(line.length, lineBaseDelay);
        const adjustedDelay = Math.floor(baseDelay * delayMultiplier);

        // For lines after the first, wait with typing indicator BEFORE sending
        if (i > 0) {
          logger(`Waiting ${adjustedDelay}ms with typing before line ${i + 1}...`);
          if (messageProvider.sendTyping) {
            await messageProvider.sendTyping(channelId, activeAgentName).catch(() => { });
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
            logger(`SENDING to Discord: "${text.substring(0, 50)}..."`);
            const sentTs = await messageProvider.sendMessageToChannel(message.getChannelId(), text, activeAgentName);
            logger(`Sent message from ${activeAgentName}, response: ${sentTs}`);

            // Record this message for duplicate detection
            duplicateDetector.recordMessage(message.getChannelId(), text);

            // Record outgoing send for rate backoff
            outgoingRateLimiter.recordSend(message.getChannelId());

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
      stopTyping = true;
      // Stop typing indicator interval if running.
      if (typingInterval) {
        try {
          clearInterval(typingInterval);
        } catch { }
        typingInterval = null;
      }
      if (typingTimeout) {
        try {
          clearTimeout(typingTimeout);
        } catch { }
        typingTimeout = null;
      }
      // Always unlock the channel after processing
      if (didLock) {
        try {
          processingLocks.unlock(channelId, resolvedBotId);
        } catch { }
      }
      if (isLeaderInvocation && delayKey) {
        try {
          channelDelayManager.clear(delayKey);
        } catch { }
      }
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

function stripSystemPromptLeak(response: string, systemPrompt: string): string {
  const resp = String(response ?? '');
  const sys = String(systemPrompt ?? '');
  if (!resp || !sys) return resp;
  if (!resp.includes(sys) && !resp.includes(sys.trim())) return resp;

  // Remove exact occurrences. Also try trimmed variant if different to handle minor trailing whitespace.
  let out = resp.split(sys).join('');
  const trimmed = sys.trim();
  if (trimmed && trimmed !== sys) {
    out = out.split(trimmed).join('');
  }
  return out.trim();
}

function buildSystemPromptWithBotName(baseSystemPrompt: unknown, botName: string): string {
  const base = typeof baseSystemPrompt === 'string' ? baseSystemPrompt.trim() : '';
  const name = String(botName || '').trim();
  const hint = name
    ? `You are ${name}. Your display name in chat is "${name}".`
    : 'You are an assistant operating inside a multi-user chat.';

  if (!base) return hint;
  // Put the hint first so models see it early.
  return `${hint}\n\n${base}`;
}
