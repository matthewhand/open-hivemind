// Message Handler
// Handles incoming messages and determines if the bot should reply.
// Includes validation, command processing, and decision-making logic.
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/handler/validateMessage';
import { processCommand } from '@src/message/helpers/handler/processCommand';
import { getMessageProvider } from '@src/message/management/getMessageProvider';
import { getLlmProvider } from '@src/message/management/getLlmProvider';
import { shouldReplyToMessage } from '@src/message/helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '@src/message/helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '@src/message/helpers/handler/sendFollowUpRequest';
import { sendTyping } from '@src/message/helpers/handler/sendTyping';
import { stopTypingIndicator } from '@src/message/helpers/handler/stopTypingIndicator';
import messageConfig from '@src/message/interfaces/messageConfig';
import { Client } from 'discord.js';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

/**
 * Handles an incoming message and determines the appropriate bot response.
 * @param client - The service handling the messaging platform (Discord, etc.)
 * @param msg - The message object received.
 * @param startTime - The timestamp when the message was received.
 */
export async function handleMessage(
client: Client,
msg: IMessage,
startTime: number
): Promise<void> {
const botClientId = process.env.DISCORD_CLIENT_ID || "botId_placeholder";
  if (!msg.getAuthorId || !msg.getChannelId) {
    debug('Invalid message object. Missing necessary methods: ' + JSON.stringify(msg));
    return;
  }

  // Guard: Ignore bot messages if configured
  if (msg.isFromBot() && ignoreBots) {
    debug(`[handleMessage] Ignoring message from bot: ${msg.getAuthorId()}`);
    return;
  }

  sendTyping(client, msg.getChannelId());

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

  // Process commands, if any
  await processCommand(msg, async (result: string) => {
    const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') as string;
    const allowedUsers = authorisedUsers ? authorisedUsers.split(',') : [];
    if (!allowedUsers.includes(msg.getAuthorId())) {
      debug('Command not authorized for user:', msg.getAuthorId());
      return;
    }
    debug('Sending command result to channel:', channelId, 'result:', result);
    await messageProvider.sendMessageToChannel(channelId, result);
    commandProcessed = true;
    debug('Command reply sent successfully.');
  });

  if (commandProcessed) {
    stopTypingIndicator(msg.getChannelId());
    return;
  }

  // Determine if bot should reply
  const shouldReply = await shouldReplyToMessage(msg, botClientId, "discord", Date.now() - startTime);
  if (!shouldReply) {
    debug('Message is not eligible for reply:', msg);
    stopTypingIndicator(msg.getChannelId());
    return;
  }

  // Generate response using LLM if enabled
  if (messageConfig.get('MESSAGE_LLM_CHAT')) {
    const llmProvider = await getLlmProvider(channelId);
    const llmResponse = await llmProvider.generateChatCompletion([], msg.getText());
    if (llmResponse) {
      const timingManager = MessageDelayScheduler.getInstance();
      await timingManager.scheduleMessage(
        client,
        channelId,
        llmResponse,
        Date.now() - startTime,
        async (content: string) => {
          await messageProvider.sendMessageToChannel(channelId, content);
        }
      );
    }
  }

  // Follow-up logic, if enabled
  if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
    await sendFollowUpRequest(client, msg, channelId, 'AI response follow-up');
  }

  stopTypingIndicator(msg.getChannelId());
}
