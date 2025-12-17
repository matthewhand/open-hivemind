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
import AdaptiveHistoryTuner from '../helpers/processing/AdaptiveHistoryTuner';
import { trimHistoryToTokenBudget } from '../helpers/processing/HistoryBudgeter';
import { splitOnNewlines, calculateLineDelayWithOptions } from '../helpers/processing/LineByLineSender';
import { recordBotActivity, getLastBotActivity } from '../helpers/processing/ChannelActivity';
import { ChannelDelayManager } from '@message/helpers/handler/ChannelDelayManager';
import OutgoingMessageRateLimiter from '../helpers/processing/OutgoingMessageRateLimiter';
import TypingActivity from '../helpers/processing/TypingActivity';
import TypingMonitor from '../helpers/monitoring/TypingMonitor';
import { isOnTopic, isNonsense } from '../helpers/processing/SemanticRelevanceChecker';

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
export async function handleMessage(message: IMessage, historyMessages: IMessage[] = [], botConfig: any): Promise<string | null> {
  return await PerformanceMonitor.measureAsync(async () => {
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
      const providerType = botConfig.messageProvider || botConfig.MESSAGE_PROVIDER || botConfig.integration || 'generic';
      const platform = providerType.toLowerCase();

      // Delegate platform-specific identity/routing to the integration layer.
      const resolvedAgentContext =
        typeof (messageProvider as any)?.resolveAgentContext === 'function'
          ? (messageProvider as any).resolveAgentContext({ botConfig, agentDisplayName: activeAgentName })
          : null;

      const botId = String(resolvedAgentContext?.botId || botConfig?.BOT_ID || messageProvider.getClientId() || '');
      resolvedBotId = botId || resolvedBotId;
      providerSenderKey = String(resolvedAgentContext?.senderKey || botConfig?.name || activeAgentName);
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
          if (!allowedUsers.includes(userId)) {
            logger('User not authorized:', userId);
            await messageProvider.sendMessageToChannel(message.getChannelId(), 'You are not authorized to use commands.', providerSenderKey);
            recordBotActivity(message.getChannelId(), resolvedBotId);
            return;
          }
          await messageProvider.sendMessageToChannel(message.getChannelId(), result, providerSenderKey);
          recordBotActivity(message.getChannelId(), resolvedBotId);
          commandProcessed = true;
        });
        if (commandProcessed) return null;
      }

      // Reply eligibility

      // Record interaction for idle response tracking
      const serviceName = botConfig.MESSAGE_PROVIDER || 'generic';
      // Only record non-bot messages as "interactions" to avoid bots (including our own idle replies)
      // continuously rescheduling idle responses.
      if (!message.isFromBot()) {
        idleResponseManager.recordInteraction(serviceName, message.getChannelId(), message.getMessageId());
      }

      const replyNameCandidates: string[] = Array.from(new Set(
        (resolvedAgentContext?.nameCandidates || [activeAgentName, botConfig?.name])
          .filter(Boolean)
          .map((v: any) => String(v))
      ));

      const defaultChannelId = (typeof (messageProvider as any).getDefaultChannel === 'function')
        ? (messageProvider as any).getDefaultChannel()
        : undefined;

      const replyDecision = await shouldReplyToMessage(message, botId, platform, replyNameCandidates, historyMessages, defaultChannelId);
      if (!replyDecision.shouldReply) {
        logger(`Message not eligible for reply: ${replyDecision.reason}`);
        if (replyDecision.reason !== 'Message from self') {
          console.info(`🚫 SKIPPING | bot: ${botConfig.name} | reason: ${replyDecision.reason} | stats: ${JSON.stringify(replyDecision.meta || {})}`);
        }
        return null;
      }

      const targetType = (typeof message.isFromBot === 'function' && message.isFromBot()) ? 'bot' : 'user';
      console.info(`✅ RESPONDING | bot: ${botConfig.name} | platform: ${platform} | target_type: ${targetType} | reason: ${replyDecision.reason} | stats: ${JSON.stringify(replyDecision.meta || {})} | channel: ${channelId} | trigger: ${message.getMessageId()}`);

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

      const baseDelayConfig = (Number(messageConfig.get('MESSAGE_COMPOUNDING_DELAY_BASE_MS')) || 1500) * delayScale;
      // Add chaos: 0.9x to 1.8x of base delay (e.g. 4500 -> 4050~8100ms)
      const baseCompoundDelayMs = randInt(Math.floor(baseDelayConfig * 0.9), Math.floor(baseDelayConfig * 1.8));

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
        console.info(`⏳ BURST QUEUE | bot: ${botConfig.name} | queued_msg: "${message.getText()?.substring(0, 50)}..." | id: ${message.getMessageId()}`);
        return null;
      }

      // Calculate delay based on message length (reading time) - scaled.
      // Keep short messages snappy while allowing longer messages to feel "read".
      const msgText = message.getText() || '';
      const baseReadingRaw = Number(messageConfig.get('MESSAGE_READING_DELAY_BASE_MS')) || 200;
      const perCharRaw = Number(messageConfig.get('MESSAGE_READING_DELAY_PER_CHAR_MS')) || 25;
      const minReadingRaw = Number(messageConfig.get('MESSAGE_READING_DELAY_MIN_MS')) || 3000;
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

      // Wait for the calculated "reading/coalescing" delay
      const waitStart = Date.now();
      await channelDelayManager.waitForDelay(delayKey);

      // -----------------------------------------------------------------------
      // Collision Avoidance (Anti-Crosstalk)
      // -----------------------------------------------------------------------
      // If we are replying based on CHANCE (not directly addressed), check if anyone else is typing.
      // This prevents multiple bots from piling on if they both decided to reply.
      // We check this AFTER the delay to catch late-breaking typists.
      if (replyDecision.reason !== 'Directly addressed') {
        const isAnyoneTyping = TypingMonitor.getInstance().isAnyoneTyping(channelId, [botId]); // Exclude self

        // Check if ANY bot (not this one) posted during our wait - use channel-wide activity
        const channelActivity = getLastBotActivity(channelId); // No botId = channel-wide
        const someonePostedDuringWait = channelActivity > waitStart;

        if (isAnyoneTyping || someonePostedDuringWait) {
          // Instead of skipping, add a small additional delay and continue
          const additionalDelay = 2000 + Math.random() * 3000;
          logger(`Collision detected: Typing=${isAnyoneTyping}, RecentPost=${someonePostedDuringWait}. Adding ${Math.round(additionalDelay)}ms delay.`);
          console.debug(`⏳ CROSSTALK DELAY | bot: ${botConfig.name} | typing: ${isAnyoneTyping} | posted: ${someonePostedDuringWait} | delay: ${Math.round(additionalDelay)}ms`);
          await new Promise(resolve => setTimeout(resolve, additionalDelay));
        }
      }

      // Typing behavior:
      // - Wait a bit before showing typing (simulates reading).
      // - Start typing closer to inference time (especially when rate-backoff is large) so we don't "type for a minute".
      // - Keep typing running through inference so there's no "typing stopped, then long pause" gap.
      let typingStarted = false;
      const preTypingDelayMs = Math.min(4500, Math.max(2000, Math.floor(readingDelay * 0.5)));
      const typingEligibleAt = Date.now() + preTypingDelayMs;
      // Only show typing in the final "lead" window before inference, to leave earlier time as silent reading/thinking.
      const typingLeadBaseMs = Math.min(9000, Math.max(2500, Math.floor(readingDelay * 0.8)));
      // If we're rate-backed off, reduce typing lead so we don't sit "typing" through the whole backoff.
      const typingLeadMs = outgoingBackoffMs > 10000 ? Math.min(4000, typingLeadBaseMs) : typingLeadBaseMs;

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
            await messageProvider.sendTyping!(channelId, providerSenderKey).catch(() => { });
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
          await messageProvider.sendTyping(channelId, providerSenderKey).catch(() => { });
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
        const baseHistoryLimit = Number(messageConfig.get('MESSAGE_HISTORY_LIMIT')) || 30;
        historyTuneKey = `${channelId}:${botId || resolvedBotId || activeAgentName}`;
        historyTuneRequestedLimit = historyTuner.getDesiredLimit(historyTuneKey, baseHistoryLimit);

        const fetchHistory = async () => {
          // Prefer getMessages (used in tests), but fall back to the IMessengerService shape.
          if (typeof (messageProvider as any).getMessages === 'function') {
            return await (messageProvider as any).getMessages(channelId, historyTuneRequestedLimit);
          }
          if (typeof (messageProvider as any).getMessagesFromChannel === 'function') {
            return await (messageProvider as any).getMessagesFromChannel(channelId, historyTuneRequestedLimit);
          }
          // Last resort: attempt a no-limit call
          return await (messageProvider as any).getMessagesFromChannel(channelId);
        };

        const freshHistory = await fetchHistory();

        // Sort oldest-first for LLM context (A -> B -> C)
        // Discord fetch usually returns newest-first or mixed, so explicit sort is safest
        freshHistory.sort((a, b) => a.getTimestamp().getTime() - b.getTimestamp().getTime());

        // Filter out the current message to avoid duplication (as it's added as 'userMessage' in prompt)
        const filtered = freshHistory.filter(m => m.getMessageId() !== message.getMessageId());
        historyMessages = filtered;

        logger(`Refetched history: ${historyMessages.length} messages (latest context)`);
      } catch (err) {
        logger('Failed to refetch history, using original history:', err);
      }

      // LLM processing with retry for duplicates
      const startTime = Date.now();
      const MAX_DUPLICATE_RETRIES = Number(messageConfig.get('MESSAGE_MAX_GENERATION_RETRIES')) || 3;
      let llmResponse: string = '';
      let retryCount = 0;
      let avoidSystemPromptLeak = false;

      const baseSystemPrompt =
        botConfig?.OPENAI_SYSTEM_PROMPT ??
        botConfig?.openai?.systemPrompt ??
        botConfig?.llm?.systemPrompt ??
        (message.metadata as any)?.systemPrompt;

      const baseSystemPromptText = typeof baseSystemPrompt === 'string' ? baseSystemPrompt.trim() : '';
      const systemPrompt = buildSystemPromptWithBotName(baseSystemPrompt, activeAgentName);

      // Adjust max tokens based on recent usage to prevent walls of text
      const defaultMaxTokens = botConfig.openai?.maxTokens || 150;
      const adjustedMaxTokens = tokenTracker.getAdjustedMaxTokens(channelId, defaultMaxTokens);

      // Token-budgeted history trimming: fetch more, then keep only what fits.
      // Use a configurable approximate context window and reserve a safety margin.
      const ctxWindow = Number(messageConfig.get('MESSAGE_LLM_CONTEXT_WINDOW_TOKENS')) || 8000;
      const ctxSafety = Number(messageConfig.get('MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS')) || 400;
      const inputBudget = Math.max(500, ctxWindow - adjustedMaxTokens - ctxSafety);

      const promptForBudget = mentionContext.contextHint
        ? `${mentionContext.contextHint}\n\n${processedMessage}`
        : processedMessage;

      const budgeted = trimHistoryToTokenBudget(historyMessages, {
        inputBudgetTokens: inputBudget,
        promptText: promptForBudget,
        systemPromptText: systemPrompt,
        minKeepMessages: 2
      });

      const historyForLlm = budgeted.trimmed;

      try {
        const baseHistoryLimit = Number(messageConfig.get('MESSAGE_HISTORY_LIMIT')) || 10;
        const key = historyTuneKey || `${channelId}:${botId || resolvedBotId || activeAgentName}`;
        const requestedLimit = typeof historyTuneRequestedLimit === 'number'
          ? historyTuneRequestedLimit
          : historyTuner.getDesiredLimit(key, baseHistoryLimit);

        historyTuner.recordResult(key, {
          requestedLimit,
          receivedCount: historyMessages.length,
          keptCount: historyForLlm.length,
          estimatedTotalTokens: budgeted.meta.estimatedTotalTokens,
          inputBudgetTokens: budgeted.meta.inputBudgetTokens
        });
      } catch { }

      while (retryCount <= MAX_DUPLICATE_RETRIES) {
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

        // Start recurring typing indicator during inference
        let inferenceTypingInterval: NodeJS.Timeout | null = null;
        if (messageProvider.sendTyping) {
          await messageProvider.sendTyping(channelId, providerSenderKey).catch(() => { });
          inferenceTypingInterval = setInterval(async () => {
            await messageProvider.sendTyping!(channelId, providerSenderKey).catch(() => { });
          }, 8000);
        }

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
        } finally {
          // Stop typing indicator after inference completes
          if (inferenceTypingInterval) clearInterval(inferenceTypingInterval);
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



        // Check for duplicate response (internal history OR external recent history)
        const historyContents = historyForLlm.map(m => m.getText());
        if (duplicateDetector.isDuplicate(message.getChannelId(), llmResponse, historyContents)) {
          retryCount++;
          if (retryCount > MAX_DUPLICATE_RETRIES) {
            logger(`Still duplicate after ${MAX_DUPLICATE_RETRIES} retries, giving up on this reply.`);
            return null; // Don't send duplicate
          }
          logger(`Duplicate response detected, retrying with higher temperature...`);
          continue;
        }

        // Check for nonsense / corruption / loops
        const nonsense = await isNonsense(llmResponse);
        if (nonsense) {
          retryCount++;
          if (retryCount > MAX_DUPLICATE_RETRIES) {
            const sendAnyway = Boolean(messageConfig.get('MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION'));
            if (sendAnyway) {
              logger(`Still nonsense after ${MAX_DUPLICATE_RETRIES} retries, but config says SEND ANYWAY.`);
              break; // Break loop to send
            }
            logger(`Still nonsense after ${MAX_DUPLICATE_RETRIES} retries, giving up on this reply.`);
            return null; // Don't send nonsense
          }
          logger(`Nonsense/corruption detected in response, retrying...`);
          continue;
        }

        // Not a duplicate, we're good!
        break;
      }

      // Record tokens for this response
      const estimatedTokens = tokenTracker.estimateTokens(llmResponse);
      tokenTracker.recordTokens(channelId, estimatedTokens);
      logger(`Recorded ${estimatedTokens} tokens for channel ${channelId}`);
      console.info(`✅ INFERENCE COMPLETE | bot: ${botConfig.name} | provider: ${botConfig.llmProvider} | tokens: ${estimatedTokens} | channel: ${channelId}`);

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
            logger(`Stripped self-mention from response: "${beforeStrip.substring(0, 50)}..." → "${line.substring(0, 50)}..."`);
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
          maxReadingMs: 8000 * delayScale
        });
        const adjustedDelay = Math.floor(baseDelay * delayMultiplier);

        // Wait with typing indicator BEFORE sending (applies to ALL lines now, including the first)
        logger(`Waiting ${adjustedDelay}ms with typing before line ${i + 1}...`);
        if (messageProvider.sendTyping) {
          await messageProvider.sendTyping(channelId, providerSenderKey).catch(() => { });
        }
        await new Promise(resolve => setTimeout(resolve, adjustedDelay));

        logger(`About to send line ${i + 1}/${lines.length} (${line.length} chars): "${line.substring(0, 50)}..."`);

        await timingManager.scheduleMessage(
          message.getChannelId(),
          message.getMessageId(),
          line,
          userId,
          async (text: string): Promise<string> => {
            logger(`SENDING to Discord: "${text.substring(0, 50)}..."`);
            // Only apply reply-to for the first line of the response
            const finalReplyId = (i === 0) ? targetReplyId : undefined;
            const sentTs = await messageProvider.sendMessageToChannel(message.getChannelId(), text, providerSenderKey, undefined, finalReplyId);
            logger(`Sent message via ${providerSenderKey}, response: ${sentTs}`);

            const contentSnippet = text.length > 20 ? text.substring(0, 20) + '...' : text;
            console.info(`✅ SENT | bot: ${botConfig.name} | content: "${contentSnippet}" | channel: ${message.getChannelId()}`);

            // Record this message for duplicate detection
            duplicateDetector.recordMessage(message.getChannelId(), text);

            // Record outgoing send for rate backoff
            outgoingRateLimiter.recordSend(message.getChannelId());

            // Record bot activity to keep conversation alive (removes silence penalty)
            recordBotActivity(message.getChannelId(), resolvedBotId);

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
              await sendFollowUpRequest(message, message.getChannelId(), followUpText, messageProvider, providerSenderKey);
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
      console.info(`❌ INFERENCE/PROCESSING FAILED | error: ${error instanceof Error ? error.message : String(error)}`);
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

function stripSystemPromptLeak(response: string, ...promptTexts: string[]): string {
  let out = String(response ?? '');
  if (!out) return out;

  const prompts = (promptTexts || [])
    .map((p) => String(p || ''))
    .map((p) => p.trim())
    .filter(Boolean);

  if (prompts.length === 0) return out;

  for (const p of prompts) {
    if (!p) continue;
    if (!out.includes(p)) continue;
    out = out.split(p).join('');
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
