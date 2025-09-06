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

const logger = Debug('app:messageHandler');
const timingManager = MessageDelayScheduler.getInstance();
const idleResponseManager = IdleResponseManager.getInstance();

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
        const rawBotName = botConfig.MESSAGE_USERNAME_OVERRIDE || 'MadgwickAI';
        const botName = rawBotName.replace('MadgwickAI', 'Madgwick AI');
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
    
    // Record interaction for idle response tracking
    const serviceName = botConfig.MESSAGE_PROVIDER || 'generic';
    idleResponseManager.recordInteraction(serviceName, message.getChannelId(), message.getMessageId());
    
    if (!shouldReplyToMessage(message, botId, providerType)) {
      logger('Message not eligible for reply');
      return null;
    }

    // LLM processing
    const startTime = Date.now();
    const metadata = { ...message.metadata, channelId: message.getChannelId(), botId: botId } as any;
    const payload = {
      text: processedMessage,
      history: historyMessages.map((m) => ({ role: m.role, content: m.getText() })),
      metadata: metadata,
    };
    logger(`Sending to LLM: ${JSON.stringify(payload)}`);
    let llmResponse: string;
    try {
      const llm = botConfig?.llm;
      if (llm && String(llm.provider || '').toLowerCase() === 'openwebui' && (llm.apiUrl || llm.model)) {
        const sys = llm.systemPrompt || metadata.systemPrompt || '';
        llmResponse = await generateChatCompletionDirect(
          { apiUrl: llm.apiUrl, authHeader: llm.authHeader, model: llm.model },
          processedMessage,
          historyMessages,
          sys
        );
      } else {
        llmResponse = await llmProvider.generateChatCompletion(processedMessage, historyMessages, metadata);
      }
    } catch (e) {
      logger('Per-bot LLM override failed, falling back:', e instanceof Error ? e.message : String(e));
      llmResponse = await llmProvider.generateChatCompletion(processedMessage, historyMessages, metadata);
    }
    logger(`LLM response: ${llmResponse}`);

    const reply = llmResponse || 'No response'; // Assume string response
    await timingManager.scheduleMessage(
      message.getChannelId(),
      message.getMessageId(),
      reply,
      userId,
      async (text: string): Promise<string> => {
        const rawBotName = botConfig.MESSAGE_USERNAME_OVERRIDE || 'MadgwickAI';
        const activeAgentName = rawBotName.replace('MadgwickAI', 'Madgwick AI');
        const sentTs = await messageProvider.sendMessageToChannel(message.getChannelId(), text, activeAgentName);
        logger(`Sent message from ${activeAgentName}: ${text}`);

        // Record bot response for idle response tracking
        idleResponseManager.recordBotResponse(serviceName, message.getChannelId());

        if (botConfig.MESSAGE_LLM_FOLLOW_UP) {
          const followUpText = `Anything else I can help with after: "${text}"?`;
          await sendFollowUpRequest(message, message.getChannelId(), followUpText);
          logger('Sent follow-up request.');
        }
        return sentTs;
      },
      false
    );

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      logger(`Message processed in ${processingTime}ms`);
      return reply;
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'messageHandler.handleMessage');
      return `Error processing message: ${error instanceof Error ? error.message : String(error)}`;
    }
  }, 'handleMessage', 5000); // 5 second threshold for warnings
}
