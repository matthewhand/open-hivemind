import Debug from 'debug';
import { AuditLogger } from '@src/common/auditLogger';
import { ErrorHandler, PerformanceMonitor } from '@src/common/errors/ErrorHandler';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { InputSanitizer } from '@src/utils/InputSanitizer';
import messageConfig from '@config/messageConfig';
import { generateChatCompletionDirect } from '@integrations/openwebui/directClient';
import { ChannelDelayManager } from '@message/helpers/handler/ChannelDelayManager';
import type { IMessage } from '@message/interfaces/IMessage';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';
import MessageDelayScheduler from '../helpers/handler/MessageDelayScheduler';
import { processCommand } from '../helpers/handler/processCommand';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import { summarizeLogWithLlm } from '../helpers/logging/LogProseSummarizer';
import TypingMonitor from '../helpers/monitoring/TypingMonitor';
import AdaptiveHistoryTuner from '../helpers/processing/AdaptiveHistoryTuner';
import { addUserHintFn as addUserHint } from '../helpers/processing/addUserHint';
import { recordBotActivity } from '../helpers/processing/ChannelActivity';
import DuplicateMessageDetector from '../helpers/processing/DuplicateMessageDetector';
import { GlobalActivityTracker } from '../helpers/processing/GlobalActivityTracker';
import { trimHistoryToTokenBudget } from '../helpers/processing/HistoryBudgeter';
import { IncomingMessageDensity } from '../helpers/processing/IncomingMessageDensity';
import {
  calculateLineDelayWithOptions,
  splitOnNewlines,
} from '../helpers/processing/LineByLineSender';
import { detectMentions } from '../helpers/processing/MentionDetector';
import OutgoingMessageRateLimiter from '../helpers/processing/OutgoingMessageRateLimiter';
import { getMessageSetting } from '../helpers/processing/ResponseProfile';
import { isNonsense, isOnTopic } from '../helpers/processing/SemanticRelevanceChecker';
import { shouldReplyToMessage } from '../helpers/processing/shouldReplyToMessage';
import { splitMessageContent } from '../helpers/processing/splitMessageContent';
import { stripBotId } from '../helpers/processing/stripBotId';
// New utilities
import TokenTracker from '../helpers/processing/TokenTracker';
import TypingActivity from '../helpers/processing/TypingActivity';
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
            // JSON stats at debug level
            logger(
              `📊 ${botConfig.name} decision stats:`,
              JSON.stringify(replyDecision.meta || {}, null, 2)
            );
          }

          return null;
        }

        const targetType =
          typeof message.isFromBot === 'function' && message.isFromBot() ? 'bot' : 'user';
        // Prose explanation at info level with context (clean output)
        let prose = replyDecision.meta?.prose || replyDecision.reason;
        prose = await summarizeLogWithLlm(prose);
        console.info(`✅ ${botConfig.name} responds to @${authorName} in ${channelName}: ${prose}`);
        // Detailed stats at debug level only
        if (replyDecision.meta?.colorizedMods) {
          logger(`   📈 ${botConfig.name} modifiers: ${replyDecision.meta.colorizedMods}`);
        }
        logger(`📊 ${botConfig.name} stats:`, JSON.stringify(replyDecision.meta || {}, null, 2));

        // Detect mentions and replies for context hints (use active agent name, not just botConfig.name)
        const mentionContext = detectMentions(message, botId, activeAgentName);
        if (mentionContext.contextHint) {
          logger(`Mention context: ${mentionContext.contextHint}`);
        }

        // -----------------------------------------------------------------------
        // Delay Before Inference (Read + Rate Backoff + Coalesce Burst)
        // -----------------------------------------------------------------------

        const delayScaleRaw = getMessageSetting('MESSAGE_DELAY_MULTIPLIER', botConfig);
        // Check botConfig first (per-bot override via BOTS_{name}_DISABLE_DELAYS), then global default
        const disableDelays =
          botConfig?.DISABLE_DELAYS === true ||
          botConfig?.disableDelays === true ||
          getMessageSetting('DISABLE_DELAYS', botConfig) === true;
        const delayScale = disableDelays
          ? 0
          : typeof delayScaleRaw === 'number'
            ? delayScaleRaw
            : Number(delayScaleRaw) || 1;
        if (disableDelays) {
          logger(
            'DISABLE_DELAYS=true: Skipping artificial delays (typing still shown during inference)'
          );
        }

        const baseDelayConfig =
          (Number(getMessageSetting('MESSAGE_COMPOUNDING_DELAY_BASE_MS', botConfig)) || 1500) *
          delayScale;
        // Add chaos: 0.9x to 1.8x of base delay (e.g. 4500 -> 4050~8100ms)
        const baseCompoundDelayMs = randInt(
          Math.floor(baseDelayConfig * 0.9),
          Math.floor(baseDelayConfig * 1.8)
        );

        const maxCompoundDelayMs =
          (Number(getMessageSetting('MESSAGE_COMPOUNDING_DELAY_MAX_MS', botConfig)) || 15000) *
          delayScale;

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
          console.info(
            `⏳ BURST QUEUE | bot: ${botConfig.name} | queued_msg: "${message.getText()?.substring(0, 50)}..." | id: ${message.getMessageId()}`
          );
          return null;
        }

        // Calculate delay based on message length (reading time) - scaled.
        // Keep short messages snappy while allowing longer messages to feel "read".
        const msgText = message.getText() || '';
        const baseReadingRaw =
          Number(getMessageSetting('MESSAGE_READING_DELAY_BASE_MS', botConfig)) || 50;
        const perCharRaw =
          Number(getMessageSetting('MESSAGE_READING_DELAY_PER_CHAR_MS', botConfig)) || 6;
        const minReadingRaw =
          Number(getMessageSetting('MESSAGE_READING_DELAY_MIN_MS', botConfig)) || 750;
        const maxReadingRaw =
          Number(getMessageSetting('MESSAGE_READING_DELAY_MAX_MS', botConfig)) || 1500;

        const baseReadingMs = baseReadingRaw * delayScale;
        const perCharMs = perCharRaw * delayScale;
        const minReadingMs = minReadingRaw * delayScale;
        const maxReadingMs = maxReadingRaw * delayScale;

        const computedReading = baseReadingMs + msgText.length * perCharMs;
        const readingDelay = Math.min(maxReadingMs, Math.max(minReadingMs, computedReading));
        const jitter = Math.floor(Math.random() * 175 * delayScale); // scaled

        console.info(
          `⏱️ [TIMING] Artificial delay calculated: ${readingDelay + jitter}ms (Reading: ${readingDelay}ms + Jitter: ${jitter}ms)`
        );

        // Bot-specific jitter: deterministic offset based on botId to spread bots apart
        // This ensures each bot has a unique delay offset that persists across invocations
        // Using a better hash to reduce collisions between similar bot IDs
        let botHash = 0;
        for (let i = 0; i < botId.length; i++) {
          botHash += botId.charCodeAt(i) * (i + 1);
        }
        const botSpecificJitter = botHash % 2000; // 0-2000ms unique per bot (halved from 4000)

        // Token usage multiplier (slower if channel is hot)
        const usageMultiplier = tokenTracker.getDelayMultiplier(channelId);

        // Outgoing message rate backoff (don't drop responses, just delay them)
        const maxPerMinute =
          Number(getMessageSetting('MESSAGE_RATE_LIMIT_PER_CHANNEL', botConfig)) || 5;
        const outgoingBackoffMs = outgoingRateLimiter.getBackoffMs(channelId, maxPerMinute, 60000);

        // DELAY CAPPING LOGIC :::::::::::::::::::::::::::::::::::::::::::::::::
        // Target artificial delay based on reading time, jitter, and bot personality
        const targetArtificialDelay = Math.floor(
          (readingDelay + jitter + botSpecificJitter) * usageMultiplier
        );

        // Calculate how much time has already passed since the message was created/received
        // If message timestamp is available, use it; otherwise use start of processing
        const messageTimestamp =
          typeof message.getTimestamp === 'function'
            ? message.getTimestamp().getTime()
            : decisionTimestamp; // fallback to when we started processing decision

        const elapsedSinceReceipt = Math.max(0, Date.now() - messageTimestamp);

        // Subtract elapsed time from target delay to keep total latency consistent
        // If we've already spent 2s processing and target is 3s, only wait 1s more.
        const cappedArtificialDelay = Math.max(0, targetArtificialDelay - elapsedSinceReceipt);

        // LOG A: Artificial delay begins
        if (cappedArtificialDelay > 50) {
          console.info(`⏱️ [TIMING] Starting artificial delay: ${cappedArtificialDelay}ms...`);
        }

        await new Promise((resolve) => setTimeout(resolve, cappedArtificialDelay));

        // LOG B: Decision made / Action starting (including time for A)
        console.info(
          `⏱️ [TIMING] Decision committed. Ready to infer. (Elapsed since receipt: ${Date.now() - (messageTimestamp || decisionTimestamp)}ms)`
        );

        if (elapsedSinceReceipt > 100) {
          logger(
            `Delay cap applied: target=${targetArtificialDelay}ms, elapsed=${elapsedSinceReceipt}ms, new_delay=${cappedArtificialDelay}ms`
          );
        }

        const totalPreDelay = cappedArtificialDelay + outgoingBackoffMs;

        // Ensure our coalescing window waits at least the computed delay.
        channelDelayManager.ensureMinimumDelay(delayKey, totalPreDelay, maxCompoundDelayMs);

        logger(
          `Waiting ~${channelDelayManager.getRemainingDelayMs(delayKey)}ms before inference (coalesce + reading + backoff)...`
        );

        // Wait for the calculated "reading/coalescing" delay
        const waitStart = Date.now();
        await channelDelayManager.waitForDelay(delayKey);

        // -----------------------------------------------------------------------
        // Collision Avoidance (Anti-Crosstalk) - with exponential backoff
        // -----------------------------------------------------------------------
        // Check if anyone else is typing or posted during our wait.
        // IMPORTANT: Typing delay only applies ONCE to prevent two typing bots from deadlocking.
        // Posted messages continue to cause backoff in a loop.
        const MAX_CROSSTALK_ITERATIONS = 5;
        let crosstalkIterations = 0;
        let typingDelayApplied = false; // Only delay for typing once

        while (crosstalkIterations < MAX_CROSSTALK_ITERATIONS) {
          // Get count of OTHER users/bots typing (excluding self)
          const allTypingUsers = TypingMonitor.getInstance().getTypingUsers(channelId);
          const otherTypingCount = allTypingUsers.filter((uid) => uid !== botId).length;

          // Compound typing penalty: 1=none, 2=slight, 3+=significant
          // Only trigger delay if 2 or more others are typing
          const shouldDelayForTyping = otherTypingCount >= 2 && !typingDelayApplied;

          // Check if ANY bot (not this one) posted during our wait
          const channelActivityImport = require('@message/helpers/processing/ChannelActivity');
          let messagesPostedCount = 0;
          try {
            const otherBotsActivity =
              channelActivityImport.getRecentChannelActivity?.(channelId, waitStart) || [];
            messagesPostedCount = otherBotsActivity.filter(
              (a: any) => a.botId !== botId && a.timestamp > waitStart
            ).length;
          } catch {
            try {
              const density = IncomingMessageDensity.getInstance();
              const { total } = density.getDensity(channelId, Date.now() - waitStart);
              messagesPostedCount = total;
            } catch {}
          }

          // TIERED TRAFFIC: Only delay if traffic is significant (3+ messages)
          const shouldDelayForTraffic = messagesPostedCount >= 3;

          if (!shouldDelayForTyping && !shouldDelayForTraffic) {
            // No collision detected (or typing already handled), proceed
            break;
          }

          // Extract probability for bypass chance
          const probStr = String(replyDecision.meta?.probability || '0').replace('<', '');
          const responseProbability = Number(probStr) || 0;
          const crosstalkRoll = Math.random();

          // Higher probability = more likely to bypass and proceed
          if (crosstalkRoll < responseProbability) {
            console.debug(
              `⚡ CROSSTALK BYPASS | bot: ${botConfig.name} | prob: ${responseProbability.toFixed(2)} | roll: ${crosstalkRoll.toFixed(2)} | PROCEEDING`
            );
            break; // Bypass delay and proceed
          }

          crosstalkIterations++;

          // Track if we've delayed for typing (only do it once)
          if (otherTypingCount > 0 && !typingDelayApplied) {
            typingDelayApplied = true;
          }

          // Exponential backoff: base delay (500-1250ms) multiplied by iteration count
          // Compound typing penalty: multiply by (1 + (typingCount-1)/2) when typing
          // Traffic penalty: 3 msgs = 1x, 4 msgs = 1.5x, 5+ msgs = 2x
          const baseDelay = 500 + Math.random() * 750;
          const typingMultiplier = shouldDelayForTyping ? 1 + (otherTypingCount - 1) / 2 : 1;
          const trafficMultiplier = shouldDelayForTraffic
            ? messagesPostedCount >= 5
              ? 2.0
              : messagesPostedCount === 4
                ? 1.5
                : 1.0
            : 1.0;

          const additionalDelay =
            baseDelay * crosstalkIterations * typingMultiplier * trafficMultiplier;
          const reason = shouldDelayForTyping
            ? `Typing(${otherTypingCount}x)`
            : `Traffic(${messagesPostedCount} msgs)`;

          logger(
            `Collision #${crosstalkIterations}: ${reason}. Delay=${Math.round(additionalDelay)}ms`
          );
          console.debug(
            `⏳ CROSSTALK #${crosstalkIterations} | bot: ${botConfig.name} | reason: ${reason} | typers: ${otherTypingCount} | delay: ${Math.round(additionalDelay)}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, additionalDelay));
        }

        if (crosstalkIterations >= MAX_CROSSTALK_ITERATIONS) {
          logger(
            `Max crosstalk iterations reached (${MAX_CROSSTALK_ITERATIONS}), proceeding anyway`
          );
          console.debug(
            `⚠️ CROSSTALK MAX | bot: ${botConfig.name} | giving up after ${MAX_CROSSTALK_ITERATIONS} iterations`
          );
        }

        // Typing behavior:
        // - Start typing immediately (minimal pre-delay).
        // - Keep typing persistent through the entire wait.
        let typingStarted = false;
        const preTypingDelayMs = Math.min(1500, Math.max(500, Math.floor(readingDelay * 0.2)));
        const typingEligibleAt = Date.now() + preTypingDelayMs;
        // Start typing much sooner - minimal lead window.
        const typingLeadBaseMs = Math.min(4500, Math.max(1500, Math.floor(readingDelay * 0.6)));
        const typingLeadMs =
          outgoingBackoffMs > 10000 ? Math.min(2000, typingLeadBaseMs) : typingLeadBaseMs;

        const scheduleNextTypingPulse = (): void => {
          if (stopTyping || !typingStarted || !messageProvider.sendTyping) {
            return;
          }

          // Keep typing alive consistently - refresh every 5-7s (Discord typing lasts ~10s).
          const nextDelayMs = randInt(5000, 7000);

          typingTimeout = setTimeout(async () => {
            if (stopTyping) {
              return;
            }
            try {
              await messageProvider.sendTyping!(channelId, providerSenderKey).catch(() => {});
            } finally {
              scheduleNextTypingPulse();
            }
          }, nextDelayMs);
        };

        // Wait in short increments so new messages can extend delay
        while (true) {
          const remaining = channelDelayManager.getRemainingDelayMs(delayKey);
          if (remaining <= 0) {
            break;
          }

          if (!typingStarted && messageProvider.sendTyping && Date.now() >= typingEligibleAt) {
            // Don't start typing too early if we still have a long delay remaining.
            if (remaining > typingLeadMs) {
              await new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 250)));
              continue;
            }

            // If other users are actively typing, wait a bit longer before showing our typing indicator
            // (to feel less like we are interrupting). Never wait indefinitely.
            const othersTypingWindowMs =
              Number(getMessageSetting('MESSAGE_OTHERS_TYPING_WINDOW_MS', botConfig)) || 8000;
            const othersTypingMaxWaitMs =
              Number(getMessageSetting('MESSAGE_OTHERS_TYPING_MAX_WAIT_MS', botConfig)) || 5000;
            const waitedSinceEligible = Date.now() - typingEligibleAt;

            if (
              waitedSinceEligible < othersTypingMaxWaitMs &&
              typingActivity.isOthersTyping(channelId, othersTypingWindowMs)
            ) {
              await new Promise((resolve) => setTimeout(resolve, 250));
              continue;
            }

            typingStarted = true;
            await messageProvider.sendTyping(channelId, providerSenderKey).catch(() => {});
            // Start pulsed typing refreshes (with occasional gaps).
            scheduleNextTypingPulse();
          }

          await new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 250)));
        }

        // Concurrency guard: lock only once we're actually about to do inference/send.
        if (processingLocks.isLocked(channelId, botId)) {
          logger(
            `Channel ${channelId} is currently processing another message for bot ${botId}, waiting...`
          );
          const startWait = Date.now();
          let waitTime = 100; // Start with 100ms
          const maxWaitTime = 2000; // Max 2 seconds between checks

          while (processingLocks.isLocked(channelId, botId) && Date.now() - startWait < 60000) {
            // Exponential backoff with jitter to avoid thundering herd
            const jitter = Math.random() * 50;
            const currentWait = Math.min(waitTime + jitter, maxWaitTime);

            await new Promise((resolve) => setTimeout(resolve, currentWait));

            // Double the wait time for next iteration (exponential backoff)
            waitTime = Math.min(waitTime * 2, maxWaitTime);
          }

          if (processingLocks.isLocked(channelId, botId)) {
            logger(
              `Timed out waiting for processing lock on ${channelId}:${botId} after 60 seconds`
            );
            return null;
          }
        }

        processingLocks.lock(channelId, botId);
        didLock = true;

        // Refetch history to capture any messages that arrived during the delay
        try {
          const baseHistoryLimit = Number(messageConfig.get('MESSAGE_HISTORY_LIMIT')) || 30;
          historyTuneKey = `${channelId}:${botId || resolvedBotId || activeAgentName}`;
          historyTuneRequestedLimit = historyTuner.getDesiredLimit(
            historyTuneKey,
            baseHistoryLimit
          );

          const fetchHistory = async () => {
            // Prefer getMessages (used in tests), but fall back to the IMessengerService shape.
            if (typeof (messageProvider as any).getMessages === 'function') {
              return await (messageProvider as any).getMessages(
                channelId,
                historyTuneRequestedLimit
              );
            }
            if (typeof (messageProvider as any).getMessagesFromChannel === 'function') {
              return await (messageProvider as any).getMessagesFromChannel(
                channelId,
                historyTuneRequestedLimit
              );
            }
            // Last resort: attempt a no-limit call
            return await (messageProvider as any).getMessagesFromChannel(channelId);
          };

          const freshHistory = await fetchHistory();

          // Sort oldest-first for LLM context (A -> B -> C)
          // Discord fetch usually returns newest-first or mixed, so explicit sort is safest
          freshHistory.sort((a, b) => a.getTimestamp().getTime() - b.getTimestamp().getTime());

          // Filter out the current message to avoid duplication (as it's added as 'userMessage' in prompt)
          const filtered = freshHistory.filter((m) => m.getMessageId() !== message.getMessageId());
          historyMessages = filtered;

          logger(`Refetched history: ${historyMessages.length} messages (latest context)`);
        } catch (err) {
          logger('Failed to refetch history, using original history:', err);
        }

        // Fetch channel topic for context hint
        let channelTopic: string | null = null;
        try {
          if (typeof (messageProvider as any).getChannelTopic === 'function') {
            channelTopic = await (messageProvider as any).getChannelTopic(channelId);
          }
        } catch {
          logger('Failed to fetch channel topic');
        }

        // LLM processing with retry for duplicates
        const startTime = Date.now();
        const MAX_DUPLICATE_RETRIES =
          Number(messageConfig.get('MESSAGE_MAX_GENERATION_RETRIES')) || 3;
        let llmResponse = '';
        let retryCount = 0;
        let avoidSystemPromptLeak = false;

        const baseSystemPrompt =
          botConfig?.OPENAI_SYSTEM_PROMPT ??
          botConfig?.openai?.systemPrompt ??
          botConfig?.llm?.systemPrompt ??
          (message.metadata as any)?.systemPrompt;

        const baseSystemPromptText =
          typeof baseSystemPrompt === 'string' ? baseSystemPrompt.trim() : '';
        let systemPrompt = buildSystemPromptWithBotName(baseSystemPrompt, activeAgentName);

        // Emphasize channel topic in system prompt if available
        if (channelTopic && channelTopic.trim().length > 0) {
          systemPrompt += `\n\nCHANNEL CONTEXT: The topic of this channel is "${channelTopic}". Use this to guide the relevance and tone of your responses.`;
        }

        // Adjust max tokens based on recent usage to prevent walls of text
        const defaultMaxTokens = botConfig.openai?.maxTokens || 150;
        const adjustedMaxTokens = tokenTracker.getAdjustedMaxTokens(channelId, defaultMaxTokens);

        // Token-budgeted history trimming: fetch more, then keep only what fits.
        // Use a configurable approximate context window and reserve a safety margin.
        const ctxWindow = Number(messageConfig.get('MESSAGE_LLM_CONTEXT_WINDOW_TOKENS')) || 8000;
        const ctxSafety =
          Number(messageConfig.get('MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS')) || 400;
        const inputBudget = Math.max(500, ctxWindow - adjustedMaxTokens - ctxSafety);

        const promptForBudget = mentionContext.contextHint
          ? `${mentionContext.contextHint}\n\n${processedMessage}`
          : processedMessage;

        const budgeted = trimHistoryToTokenBudget(historyMessages, {
          inputBudgetTokens: inputBudget,
          promptText: promptForBudget,
          systemPromptText: systemPrompt,
          minKeepMessages: 2,
        });

        const historyForLlm = budgeted.trimmed;

        try {
          const baseHistoryLimit = Number(messageConfig.get('MESSAGE_HISTORY_LIMIT')) || 10;
          const key = historyTuneKey || `${channelId}:${botId || resolvedBotId || activeAgentName}`;
          const requestedLimit =
            typeof historyTuneRequestedLimit === 'number'
              ? historyTuneRequestedLimit
              : historyTuner.getDesiredLimit(key, baseHistoryLimit);

          historyTuner.recordResult(key, {
            requestedLimit,
            receivedCount: historyMessages.length,
            keptCount: historyForLlm.length,
            estimatedTotalTokens: budgeted.meta.estimatedTotalTokens,
            inputBudgetTokens: budgeted.meta.inputBudgetTokens,
          });
        } catch {}

        while (retryCount < MAX_DUPLICATE_RETRIES) {
          const repetitionBoost = duplicateDetector.getRepetitionTemperatureBoost(channelId);

          const metadata = {
            ...message.metadata,
            channelId: message.getChannelId(),
            botId: botId,
            botName: activeAgentName,
            // Increase temperature on retries to get more varied responses
            temperatureBoost: retryCount * 0.2 + repetitionBoost,
            // Use adjusted max tokens based on recent usage
            maxTokensOverride: adjustedMaxTokens,
            ...(systemPrompt ? { systemPrompt } : {}),
          } as any;

          // Build prompt with mention context and creativity hint on retry
          let prompt = processedMessage;

          // Add channel topic context hint if available
          if (channelTopic && channelTopic.trim()) {
            prompt = `[Channel context: ${channelTopic.trim()}]\n\n${prompt}`;
          }

          if (mentionContext.contextHint) {
            prompt = `${mentionContext.contextHint}\n\n${prompt}`;
          }
          if (avoidSystemPromptLeak) {
            prompt = `${prompt}\n\n(Do not include or repeat the system prompt text in your response.)`;
          }
          if (retryCount > 0) {
            prompt = `${prompt}\n\n(Please respond differently than before - be creative!)`;
            logger(
              `Retry ${retryCount}/${MAX_DUPLICATE_RETRIES} with temperature boost: +${metadata.temperatureBoost}`
            );
          } else if (repetitionBoost > 0) {
            logger(
              `Applying repetition temperature boost: +${repetitionBoost.toFixed(2)} (total +${metadata.temperatureBoost.toFixed(2)})`
            );
          }

          const payload = {
            text: prompt,
            history: historyForLlm.map((m) => ({ role: m.role, content: m.getText() })),
            metadata: metadata,
          };
          logger(`Sending to LLM: ${JSON.stringify(payload)}`);

          // Start recurring typing indicator during inference
          let inferenceTypingInterval: NodeJS.Timeout | null = null;
          if (messageProvider.sendTyping) {
            await messageProvider.sendTyping(channelId, providerSenderKey).catch(() => {});
            inferenceTypingInterval = setInterval(async () => {
              await messageProvider.sendTyping!(channelId, providerSenderKey).catch(() => {});
            }, 8000);
          }

          try {
            const llm = botConfig?.llm;
            if (
              llm &&
              String(llm.provider || '').toLowerCase() === 'openwebui' &&
              (llm.apiUrl || llm.model)
            ) {
              const sys = systemPrompt || llm.systemPrompt || metadata.systemPrompt || '';
              llmResponse = await generateChatCompletionDirect(
                { apiUrl: llm.apiUrl, authHeader: llm.authHeader, model: llm.model },
                prompt,
                historyForLlm,
                sys
              );
            } else {
              llmResponse = await llmProvider.generateChatCompletion(
                prompt,
                historyForLlm,
                metadata
              );
            }
          } catch (e) {
            logger(
              'Per-bot LLM override failed, falling back:',
              e instanceof Error ? e.message : String(e)
            );
            llmResponse = await llmProvider.generateChatCompletion(prompt, historyForLlm, metadata);
          } finally {
            // Stop typing indicator after inference completes
            if (inferenceTypingInterval) {
              clearInterval(inferenceTypingInterval);
            }
          }
          logger(`LLM response: ${llmResponse}`);

          // Strip system prompt leakage if it appears verbatim in the model output.
          const sysText = typeof systemPrompt === 'string' ? systemPrompt : '';
          const stripped = stripSystemPromptLeak(llmResponse, sysText, baseSystemPromptText);
          if (stripped !== llmResponse) {
            avoidSystemPromptLeak = true;
            llmResponse = stripped;
            logger('Stripped system prompt text from LLM response.');
          }

          // Strip surrounding quotes if wrapped
          const quoteStripped = InputSanitizer.stripSurroundingQuotes(llmResponse);
          if (quoteStripped !== llmResponse) {
            llmResponse = quoteStripped;
            logger('Stripped surrounding quotes from LLM response.');
          }

          // If stripping removed everything, retry a few times rather than posting the system prompt.
          if (!llmResponse || llmResponse.trim() === '') {
            retryCount++;
            if (retryCount > MAX_DUPLICATE_RETRIES) {
              logger(
                `System prompt leakage persisted after ${MAX_DUPLICATE_RETRIES} retries; skipping reply.`
              );
              return null;
            }
            logger(
              `System prompt leakage detected; retrying (${retryCount}/${MAX_DUPLICATE_RETRIES})...`
            );
            continue;
          }

          // Check for duplicate response (internal history OR external recent history)
          const historyContents = historyForLlm.map((m) => m.getText());
          if (duplicateDetector.isDuplicate(message.getChannelId(), llmResponse, historyContents)) {
            retryCount++;
            if (retryCount > MAX_DUPLICATE_RETRIES) {
              logger(
                `Still duplicate after ${MAX_DUPLICATE_RETRIES} retries, giving up on this reply.`
              );
              return null; // Don't send duplicate
            }
            logger('Duplicate response detected, retrying with higher temperature...');
            continue;
          }

          // Check for nonsense / corruption / loops
          const nonsense = await isNonsense(llmResponse);
          if (nonsense) {
            retryCount++;
            if (retryCount > MAX_DUPLICATE_RETRIES) {
              const sendAnyway = Boolean(
                messageConfig.get('MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION')
              );
              if (sendAnyway) {
                logger(
                  `Still nonsense after ${MAX_DUPLICATE_RETRIES} retries, but config says SEND ANYWAY.`
                );
                break; // Break loop to send
              }
              logger(
                `Still nonsense after ${MAX_DUPLICATE_RETRIES} retries, giving up on this reply.`
              );
              return null; // Don't send nonsense
            }
            logger('Nonsense/corruption detected in response, retrying...');
            continue;
          }

          // Not a duplicate, we're good!
          break;
        }
        // Record tokens for this response
        const estimatedTokens = tokenTracker.estimateTokens(llmResponse);
        tokenTracker.recordTokens(channelId, estimatedTokens);
        logger(`Recorded ${estimatedTokens} tokens for channel ${channelId}`);

        // Record global activity (fatigue)
        GlobalActivityTracker.getInstance().recordActivity(botId);

        const inferenceTime = Date.now() - decisionTimestamp;
        const totalProcessTime = Date.now() - (messageTimestamp || decisionTimestamp);

        // LOG C: Inference complete
        console.info(
          `⏱️ [TIMING] Inference complete. Inf: ${inferenceTime}ms, Total: ${totalProcessTime}ms`
        );

        console.info(
          `💭 ${botConfig.name} finished thinking in ${(inferenceTime / 1000).toFixed(1)}s (${estimatedTokens} tokens) using ${botConfig.llmModel || botConfig.llmProvider}`
        );
        logger(
          `📊 ${botConfig.name} inference stats: tokens=${estimatedTokens}, time=${inferenceTime}ms, provider=${botConfig.llmProvider}, channel=${channelId}`
        );

        // Update Discord presence with model info (if supported)
        const modelId = botConfig.llmModel || botConfig.llmProvider || 'unknown';
        if (typeof (messageProvider as any).setModelActivity === 'function') {
          (messageProvider as any).setModelActivity(modelId, providerSenderKey).catch(() => {});
        }

        // Split response on newlines for natural line-by-line sending
        let lines = splitOnNewlines(llmResponse);
        const MAX_LINES = 5;
        if (lines.length > MAX_LINES) {
          logger(
            `Example response has ${lines.length} lines, truncating to ${MAX_LINES} to avoid spam`
          );
          lines = lines.slice(0, MAX_LINES);
        }
        logger(`Response split into ${lines.length} line(s)`);

        // Get delay multiplier based on recent token usage
        const delayMultiplier = tokenTracker.getDelayMultiplier(channelId);

        // SMART TYPING DELAY :::::::::::::::::::::::::::::::::::::::::::::::::
        // If inference was too fast for the length of the response, wait a bit
        // to simulate "reading/typing" so the user sees the indicator for a natural duration.
        const typingPerCharMs = Number(process.env.MESSAGE_TYPING_PER_CHAR_MS) || 20;
        const minTypingMs = Number(process.env.MESSAGE_TYPING_MIN_MS) || 1000;
        const responseLen = llmResponse.length;

        const targetTypingMs = Math.max(minTypingMs, responseLen * typingPerCharMs);

        // Calculate total time elapsed since we committed to the decision (Decision Time + Delay + Inference)
        // User Logic: "if [size delay] has already exceeded the time waited so far since b... immediately send"
        // We compare TargetTyping vs (Now - DecisionTimestamp).
        // Note: decisionTimestamp was set BEFORE the artificial delay, so (Now - Decision) includes Artificial Delay + Inference.
        const timeSinceDecision = Date.now() - decisionTimestamp;
        const remainingTypingWait = Math.max(0, targetTypingMs - timeSinceDecision);

        if (remainingTypingWait > 100) {
          logger(
            `Inference+Delay fast (${timeSinceDecision}ms) vs target size delay (${targetTypingMs}ms). Waiting ${remainingTypingWait}ms...`
          );
          console.info(
            `⏱️ [TIMING] Wait for size/typing: ${remainingTypingWait}ms (Target: ${targetTypingMs}ms, Elapsed: ${timeSinceDecision}ms)`
          );

          // Ensure typing indicator stays alive if we wait
          if (remainingTypingWait > 4000 && messageProvider.sendTyping) {
            await messageProvider.sendTyping(channelId, providerSenderKey).catch(() => {});
          }
          await new Promise((resolve) => setTimeout(resolve, remainingTypingWait));
        } else {
          console.info(
            `⏱️ [TIMING] Size delay (${targetTypingMs}ms) already covered by elapsed time (${timeSinceDecision}ms). Sending immediately.`
          );
        }

        // Stop sustained typing once we have the response and are transitioning into "sending" mode.
        // (Avoids looking like we type continuously while waiting on per-message rate limits.)

        stopTyping = true;
        if (typingTimeout) {
          try {
            clearTimeout(typingTimeout);
          } catch {}
          typingTimeout = null;
        }

        // Send each line with typing and delays
        // Retrieve reply-to ID (only defined if burst coalescing occurred)
        const targetReplyId = channelDelayManager.getReplyToMessageId(delayKey);
        // Clear the delay state now that we've consumed it
        channelDelayManager.clear(delayKey);

        // Send each line with typing and delays
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];

          // Strip self-mentions from response (bot shouldn't @mention itself)
          const allowSelfMention = Boolean(messageConfig.get('MESSAGE_ALLOW_SELF_MENTION'));
          if (!allowSelfMention && resolvedBotId) {
            const selfMentionPattern = new RegExp(`<@!?${resolvedBotId}>`, 'gi');
            const beforeStrip = line;
            line = line.replace(selfMentionPattern, '').replace(/\s+/g, ' ').trim();
            if (beforeStrip !== line) {
              logger(
                `Stripped self-mention from response: "${beforeStrip.substring(0, 50)}..." → "${line.substring(0, 50)}..."`
              );
            }
          }

          // Apply Discord character limit if line is too long
          if (line.length > 1997) {
            const parts = splitMessageContent(line, 1997);
            line = parts[0]; // Just take first part to avoid spam
          }

          // Calculate delay based on line length and token usage
          const lineBaseDelay = 2000 * delayScale;
          // Scale "typing time" with the configured delay multiplier so long single-line responses
          // don't appear instantly after a brief typing indicator.
          const baseDelay = calculateLineDelayWithOptions(line.length, lineBaseDelay, {
            perCharMs: 30 * delayScale,
            maxReadingMs: 8000 * delayScale,
          });
          const adjustedDelay = Math.floor(baseDelay * delayMultiplier);

          // Wait with typing indicator BEFORE sending (applies to ALL lines now, including the first)
          logger(`Waiting ${adjustedDelay}ms with typing before line ${i + 1}...`);
          if (messageProvider.sendTyping) {
            await messageProvider.sendTyping(channelId, providerSenderKey).catch(() => {});
          }
          await new Promise((resolve) => setTimeout(resolve, adjustedDelay));

          logger(
            `About to send line ${i + 1}/${lines.length} (${line.length} chars): "${line.substring(0, 50)}..."`
          );

          await timingManager.scheduleMessage(
            message.getChannelId(),
            message.getMessageId(),
            line,
            userId,
            async (text: string): Promise<string> => {
              logger(`SENDING to Discord: "${text.substring(0, 50)}..."`);
              // Only apply reply-to for the first line of the response
              const finalReplyId = i === 0 ? targetReplyId : undefined;
              const sentTs = await messageProvider.sendMessageToChannel(
                message.getChannelId(),
                text,
                providerSenderKey,
                undefined,
                finalReplyId
              );
              logger(`Sent message via ${providerSenderKey}, response: ${sentTs}`);

              const contentSnippet = text.length > 20 ? text.substring(0, 20) + '...' : text;
              const totalDuration =
                Date.now() -
                ((typeof message.getTimestamp === 'function' && message.getTimestamp()
                  ? message.getTimestamp().getTime()
                  : 0) || decisionTimestamp);
              console.info(
                `✅ SENT | bot: ${botConfig.name} | content: "${contentSnippet}" | channel: ${message.getChannelId()} | time: ${(totalDuration / 1000).toFixed(1)}s`
              );

              // Record this message for duplicate detection
              duplicateDetector.recordMessage(message.getChannelId(), text);

              // Record outgoing send for rate backoff
              outgoingRateLimiter.recordSend(message.getChannelId());

              // Record bot activity to keep conversation alive (removes silence penalty)
              if (resolvedBotId) {
                recordBotActivity(message.getChannelId(), resolvedBotId);
              }

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
                    content: text,
                  },
                }
              );

              // Record bot response for idle response tracking
              idleResponseManager.recordBotResponse(serviceName, message.getChannelId());

              if (botConfig.MESSAGE_LLM_FOLLOW_UP) {
                const followUpText = `Anything else I can help with after: "${text}"?`;
                await sendFollowUpRequest(
                  message,
                  message.getChannelId(),
                  followUpText,
                  messageProvider,
                  providerSenderKey
                );
                logger('Sent follow-up request.');
              }
              return sentTs;
            },
            false,
            botConfig
          );
        } // End for loop

        const endTime = Date.now();
        const processingTime = endTime - startTime;
        logger(`Message processed in ${processingTime}ms`);
        return llmResponse;
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
