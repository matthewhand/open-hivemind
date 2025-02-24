import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';
import { processCommand } from '../helpers/handler/processCommand';
import { stripBotId } from '../helpers/processing/stripBotId';
import { addUserHintFn as addUserHint } from '../helpers/processing/addUserHint';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage } from '../helpers/processing/shouldReplyToMessage';
import MessageDelayScheduler from '../helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import messageConfig from '@config/messageConfig';
import { getMessengerProvider } from '@message/management/getMessengerProvider';

const logger = Debug('app:messageHandler');
const messageProvider = getMessengerProvider()[0]; // Use first provider
const llmProvider = getLlmProvider()[0]; // Returns ILlmProvider
const timingManager = MessageDelayScheduler.getInstance();

export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<string> {
  try {
    const text = message.getText();
    if (!text) {
      logger('Empty message content, skipping processing.');
      return '';
    }

    const botId = messageConfig.get('BOT_ID') || messageProvider.getClientId();
    const userId = message.getAuthorId();
    let processedMessage = stripBotId(text, botId);
    processedMessage = addUserHint(processedMessage, userId, botId);

    logger(`Processing message in channel ${message.getChannelId()} from user ${userId}: "${processedMessage}"`);
    console.log(`Processed message: "${processedMessage}"`);

    // Command processing
    let commandProcessed = false;
    if (messageConfig.get('MESSAGE_COMMAND_INLINE')) {
      await processCommand(message, async (result: string): Promise<void> => {
        const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') || '';
        const allowedUsers = authorisedUsers.split(',').map((user) => user.trim());
        if (!allowedUsers.includes(userId)) {
          logger('User not authorized:', userId);
          await messageProvider.sendMessageToChannel(message.getChannelId(), 'You are not authorized to use commands.', 'Jeeves');
          return;
        }
        await messageProvider.sendMessageToChannel(message.getChannelId(), result, 'Jeeves');
        commandProcessed = true;
      });
      if (commandProcessed) return '';
    }

    // Reply eligibility
    const providerType = messageConfig.get('MESSAGE_PROVIDER') === 'discord' ? 'discord' : 'generic';
    if (!shouldReplyToMessage(message, botId, providerType)) {
      logger('Message not eligible for reply');
      return '';
    }

    // LLM processing
    const startTime = Date.now();
    const payload = {
      text: processedMessage,
      history: historyMessages.map((m) => ({ role: m.role, content: m.getText() })),
      metadata: message.metadata,
    };
    logger(`Sending to LLM: ${JSON.stringify(payload)}`);
    const llmResponse = await llmProvider.generateChatCompletion(processedMessage, historyMessages, message.metadata);
    logger(`LLM response: ${llmResponse}`);

    const reply = llmResponse || 'No response'; // Assume string response
    await timingManager.scheduleMessage(
      message.getChannelId(),
      message.getMessageId(),
      reply,
      userId,
      async (text: string, threadId?: string): Promise<string> => {
        const activeAgentName = message.metadata?.active_agent_name || 'Jeeves';
        const sentTs = await messageProvider.sendMessageToChannel(message.getChannelId(), text, activeAgentName);
        logger(`Sent message from ${activeAgentName}: ${text}`);

        if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
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
