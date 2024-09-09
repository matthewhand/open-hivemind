/**
 * Handles incoming messages in Discord and processes commands or replies using LLMs (Large Language Models).
 * 
 * @param msg - The message object containing details of the incoming message.
 * @param historyMessages - Optional array of historical messages for context (default is an empty array).
 * 
 * This function validates incoming messages, checks if the message should be processed (based on bot rules),
 * and either processes commands or sends a response from an LLM provider. Additionally, it manages follow-up requests.
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

  // Guard: Validate message format and content
  if (!validateMessage(msg)) {
    debug('Message validation failed. Exiting handler.');
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
    return;
  }

  // Handle LLM response
  if (messageConfig.get('MESSAGE_LLM_CHAT') && shouldReplyToMessage(msg)) {
    debug('Preparing to send LLM response for message:', msg.getText());

    // Guard: Ensure LLM provider is correctly configured
    const llmProvider = getLlmProvider(channelId) as unknown as { generateResponse: (historyMessages: IMessage[], text: string) => Promise<string> };
    const llmResponse = await llmProvider.generateResponse(historyMessages, msg.getText());
    debug('LLM response generated:', llmResponse);

    if (llmResponse) {
      const timingManager = MessageDelayScheduler.getInstance();
      timingManager.scheduleMessage(channelId, llmResponse, Date.now() - startTime, async (content: string) => {
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
  if (messageConfig.get('MESSAGE_LLM_CHAT') && messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
    if (!messageConfig.get('MESSAGE_COMMAND_INLINE') && !messageConfig.get('MESSAGE_COMMAND_SLASH')) {
      debug('Follow-up logic is skipped because command processing is not enabled.');
      return;
    }

    debug('Follow-up logic is enabled. Sending follow-up request.');
    await sendFollowUpRequest(msg, channelId, 'AI response follow-up');
    debug('Follow-up request handled successfully.');
  }

  debug('Message handling completed.');
}
