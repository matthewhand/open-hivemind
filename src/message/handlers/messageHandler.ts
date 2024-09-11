import { startTypingIndicator } from '@integrations/discord/startTypingIndicator';
import { stopTypingIndicator } from '@integrations/discord/stopTypingIndicator';
/**
 * Handles and processes incoming messages in a Discord server, leveraging Large Language Models (LLMs) for automated responses or command execution.
 * 
 * The handler validates the message, checks if it's from a bot or an authorized user, processes commands if found, 
 * or generates and sends a reply using an LLM. It also manages follow-up responses and controls typing indicators 
 * to improve user experience during message processing.
 * 
 * @param msg - The message object containing details of the incoming message, including content and metadata.
 * @param historyMessages - Optional array of historical messages for context in LLM responses (default is an empty array).
 * 
 * Key steps:
 * 1. Validates the message content and checks for bot rules.
 * 2. Handles commands or generates an LLM response.
 * 3. Manages follow-up requests and typing indicators.
 */
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/processing/validateMessage';
import { processCommand } from '@src/message/helpers/processing/processCommand';
import { getMessageProvider } from '@src/message/management/getMessageProvider';
import { getLlmProvider } from '@src/message/management/getLlmProvider';
import { shouldReplyToMessage } from '@src/message/helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '@src/message/helpers/timing/MessageDelayScheduler';
import { sendFollowUpRequest } from '@src/message/helpers/followUp/sendFollowUpRequest';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import messageConfig from '@src/message/interfaces/messageConfig';
import { config } from 'dotenv';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
config();

const debug = Debug('app:messageHandler');

const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;
const botClientId = discordConfig.get('DISCORD_CLIENT_ID') as string;

export async function messageHandler(
  msg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  debug('messageHandler called with msg:', msg, 'historyMessages:', historyMessages);

  // Guard: Check if message object is valid
  if (!msg) {
    debug('No message provided. Exiting handler.');
    return;
  }

  const startTime = Date.now();
  debug('Received message with ID:', msg.getMessageId(), 'at', new Date(startTime).toISOString());

  // Guard: Ensure message is not from bot or self if bots should be ignored
  if (msg.isFromBot()) {
    if (ignoreBots || msg.getAuthorId() === botClientId) {
      debug(`[messageHandler] Ignoring message from bot or self: ${msg.getAuthorId()}`);
      return;
    }
  }

  // Guard: Ensure message object has necessary methods
  if (!(msg && 'getMessageId' in msg && typeof msg.getMessageId === 'function')) {
    debug('msg is not a valid IMessage instance. Exiting handler.');
    return;
  }
  debug('msg is a valid instance of IMessage.');

  // Guard: Ensure message has text content
  if (typeof msg.getText !== 'function' || !msg.getText().trim()) {
    debug('msg has no valid getText method or message is empty. Exiting handler.');
    return;
  }
  debug('msg has a valid getText method and contains text:', msg.getText());

  // Start typing indicator when processing starts
  console.debug('Invoking startTypingIndicator with channel ID: ' + msg.getChannelId());
  startTypingIndicator(msg.getChannelId(), () => false);

  // Guard: Validate message format and content
  const isValidMessage = await validateMessage(msg);
  if (!isValidMessage) {
    debug('Message validation failed. Exiting handler.');
    stopTypingIndicator(msg.getChannelId());
    return;
  }
  debug('Message validated successfully.');

  const messageProvider = getMessageProvider();
  const channelId = msg.getChannelId();
  let commandProcessed = false;

  // Process command, if applicable
  await processCommand(msg, async (result: string) => {
    try {
      if (messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS')) {
        const allowedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS').split(',');
        if (!allowedUsers.includes(msg.getAuthorId())) {
          debug('Command not authorized for user:', msg.getAuthorId());
          return;
        }
      }
      debug('Sending command result to channel:', channelId, 'result:', result);
      await messageProvider.sendMessageToChannel(channelId, result);
      commandProcessed = true;
      debug('Command reply sent successfully.');
    } catch (replyError) {
      debug('Failed to send command reply:', replyError);
    }
  });

  if (commandProcessed) {
    debug('Command processed, skipping LLM response.');
    stopTypingIndicator(msg.getChannelId());
    return;
  }

  // Guard: Should bot reply to this message?
  const shouldReply = await shouldReplyToMessage(msg);
  if (!shouldReply) {
    debug('Message is not eligible for reply:', msg);
    stopTypingIndicator(msg.getChannelId());
    return;
  }

  // Handle LLM response
  if (messageConfig.get('MESSAGE_LLM_CHAT')) {
    debug('Preparing to send LLM response for message:', msg.getText());

    // Guard: Ensure LLM provider is correctly configured
    const llmProvider = await getLlmProvider(channelId) as ILlmProvider;
    const llmResponse = await llmProvider.generateChatCompletion(historyMessages, msg.getText());
    debug('LLM response generated:', llmResponse);

    if (llmResponse) {
      const timingManager = MessageDelayScheduler.getInstance();
      await timingManager.scheduleMessage(channelId, llmResponse, Date.now() - startTime, async (content: string) => {
        try {
          debug('Sending LLM response to channel:', channelId, 'response:', content);
          await messageProvider.sendMessageToChannel(channelId, content);
          debug('LLM response sent successfully.');
        } catch (replyError) {
          debug('Failed to send LLM response:', replyError);
        }
      });
    }
  }

  // Follow-up request handling
  if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
    debug('Follow-up logic is enabled. Sending follow-up request.');
    await sendFollowUpRequest(msg, channelId, 'AI response follow-up');
    debug('Follow-up request handled successfully.');
  }

  stopTypingIndicator(msg.getChannelId());

  const endTime = Date.now();
  const duration = endTime - startTime;
  debug(`Message processed in ${duration} ms.`);
}
