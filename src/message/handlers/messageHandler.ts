import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';
import { processCommand } from '../helpers/handler/processCommand';
import { stripBotId } from '../helpers/processing/stripBotId';
import { addUserHintFn as addUserHint } from '../helpers/processing/addUserHint';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage } from '../helpers/processing/shouldReplyToMessage';
import MessageDelayScheduler from '../helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';

const logger = Debug('app:messageHandler');
const messageProvider = getMessengerProvider()[0]; // Use first provider
const llmProvider = getLlmProvider()[0]; // Returns ILlmProvider
const timingManager = MessageDelayScheduler.getInstance();
const idleResponseManager = IdleResponseManager.getInstance();

// Message idempotency tracking
class MessageIdempotencyManager {
  private processedMessages: Map<string, number> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 10000;

  private generateIdempotencyKey(message: IMessage): string {
    const messageId = message.getMessageId();
    const channelId = message.getChannelId();
    const timestamp = message.getTimestamp?.() || Date.now();
    const text = message.getText();
    
    // Create composite key from message properties
    return `${channelId}:${messageId}:${timestamp}:${text.substring(0, 50)}`;
  }

  public isMessageProcessed(message: IMessage): boolean {
    const key = this.generateIdempotencyKey(message);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanup(now);
    
    if (this.processedMessages.has(key)) {
      logger(`Duplicate message detected: ${key}`);
      return true;
    }
    
    // Mark message as processed
    this.processedMessages.set(key, now);
    logger(`Message marked as processed: ${key}`);
    return false;
  }

  private cleanup(now: number): void {
    // Remove expired entries
    for (const [key, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > this.TTL_MS) {
        this.processedMessages.delete(key);
      }
    }
    
    // Limit map size to prevent memory leaks
    if (this.processedMessages.size > this.MAX_ENTRIES) {
      const entries = Array.from(this.processedMessages.entries());
      entries.sort((a, b) => a[1] - b[1]); // Sort by timestamp
      const toDelete = entries.slice(0, Math.floor(this.MAX_ENTRIES * 0.2)); // Remove oldest 20%
      
      for (const [key] of toDelete) {
        this.processedMessages.delete(key);
      }
      logger(`Cleaned up ${toDelete.length} old idempotency entries`);
    }
  }
}

const idempotencyManager = new MessageIdempotencyManager();

export async function handleMessage(message: IMessage, historyMessages: IMessage[] = [], botConfig: any): Promise<string> {
  try {
    const text = message.getText();
    if (!text) {
      logger('Empty message content, skipping processing.');
      return '';
    }

    // Check for duplicate message processing
    if (idempotencyManager.isMessageProcessed(message)) {
      logger('Skipping duplicate message processing');
      return '';
    }

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
      if (commandProcessed) return '';
    }

    // Reply eligibility
    const providerType = botConfig.MESSAGE_PROVIDER === 'discord' ? 'discord' : 'generic';
    
    // Record interaction for idle response tracking
    const serviceName = botConfig.MESSAGE_PROVIDER || 'generic';
    idleResponseManager.recordInteraction(serviceName, message.getChannelId(), message.getMessageId());
    
    if (!shouldReplyToMessage(message, botId, providerType)) {
      logger('Message not eligible for reply');
      return '';
    }

    // LLM processing
    const startTime = Date.now();
    const metadata = { ...message.metadata, channelId: message.getChannelId() };
    const payload = {
      text: processedMessage,
      history: historyMessages.map((m) => ({ role: m.role, content: m.getText() })),
      metadata: metadata,
    };
    logger(`Sending to LLM: ${JSON.stringify(payload)}`);
    const llmResponse = await llmProvider.generateChatCompletion(processedMessage, historyMessages, metadata);
    logger(`LLM response: ${llmResponse}`);

    const reply = llmResponse || 'No response'; // Assume string response
    await timingManager.scheduleMessage(
      message.getChannelId(),
      message.getMessageId(),
      reply,
      userId,
      async (text: string, threadId?: string): Promise<string> => {
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
    logger('Error handling message:', error instanceof Error ? error.stack : String(error));
    return '';
  }
}
