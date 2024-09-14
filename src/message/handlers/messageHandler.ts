// Message Handler
// Processes incoming messages and the message history.
// Adjusted to fit the (message, historyMessages) signature expected by DiscordService.
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/handler/validateMessage';
import { processCommand } from '@src/message/helpers/handler/processCommand';
import { getMessageProvider } from '@src/message/management/getMessageProvider';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage } from '@src/message/helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '@src/message/helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '@src/message/helpers/handler/sendFollowUpRequest';
import { sendTyping } from '@src/message/helpers/handler/sendTyping';
import { stopTypingIndicator } from '@src/message/helpers/handler/stopTypingIndicator';
import messageConfig from '@src/message/interfaces/messageConfig';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

/**
 * Processes an incoming message and determines the appropriate bot response, considering the message history.
 * @param message - The incoming message.
 * @param historyMessages - The previous messages in the channel.
 */
export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<void> {
  const botClientId = process.env.DISCORD_CLIENT_ID || "botId_placeholder";
  if (!message.getAuthorId || !message.getChannelId) {
    debug('Invalid message object. Missing necessary methods: ' + JSON.stringify(message));
    return;
  }

  // Guard: Ignore bot messages if configured
  if (message.isFromBot() && ignoreBots) {
    debug(`[handleMessage] Ignoring message from bot: ${message.getAuthorId()}`);
    return;
  }

  sendTyping(message.getChannelId());

  const isValidMessage = await validateMessage(message);
  if (!isValidMessage) {
    debug('Message validation failed. Exiting handler.');
    stopTypingIndicator(message.getChannelId());
    return;
  }
  debug('Message validated successfully.');

  let commandProcessed = false;

  // Process commands, if any
  await processCommand(message, async (result: string) => {
    const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') as string;
    const allowedUsers = authorisedUsers ? authorisedUsers.split(',') : [];
    if (!allowedUsers.includes(message.getAuthorId())) {
      debug('Command not authorized for user:', message.getAuthorId());
      return;
    }
    debug('Sending command result:', result);
    commandProcessed = true;
    debug('Command reply sent successfully.');
  });

  if (commandProcessed) {
    stopTypingIndicator(message.getChannelId());
    return;
  }

  // Determine if bot should reply
  const shouldReply = await shouldReplyToMessage(message, botClientId, "discord", Date.now());
  if (!shouldReply) {
    debug('Message is not eligible for reply:', message);
    stopTypingIndicator(message.getChannelId());
    return;
  }

  // Generate response using LLM if enabled
  if (messageConfig.get('MESSAGE_LLM_CHAT')) {
    const llmProvider = getLlmProvider();
    if (!llmProvider) {
      debug('No LLM provider available.');
      return;
    }
    const llmResponse = await llmProvider.generateChatCompletion([], message.getText());
    if (llmResponse) {
      const timingManager = MessageDelayScheduler.getInstance();
      await timingManager.scheduleMessage(sendTypingFunction,sendTypingFunction,sendTypingFunction,sendTypingFunction,
        message.getChannelId(),
        llmResponse,
        Date.now(),
        async (content: string) => {
          debug('Sending LLM-generated content:', content);
        }
      );
    }
  }

  // Follow-up logic, if enabled
  if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
    await sendFollowUpRequest(message, historyMessages);
  }

  stopTypingIndicator(message.getChannelId());
}
