import { sendTyping } from '@integrations/discord/interaction/sendTyping';
import { stopTypingIndicator } from '@integrations/discord/stopTypingIndicator';
import { Client } from 'discord.js';
import messageConfig from '@src/message/interfaces/messageConfig';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';

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
import { config } from 'dotenv';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
config();

const debug = Debug('app:messageHandler');

const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;
const botClientId = discordConfig.get('DISCORD_CLIENT_ID') as string;

export async function messageHandler(
  client: Client,
  msg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  debug('messageHandler called with msg:', msg, 'historyMessages:', historyMessages);

  // Check if msg is an instance of IMessage
  if (!(msg instanceof DiscordMessage)) {
    debug('msg is not an instance of IMessage, wrapping it in DiscordMessage');
    msg = new DiscordMessage(msg as any); // Wrap it in DiscordMessage
  }

  // Ensure all historyMessages are IMessage instances
  historyMessages = historyMessages.map(message => {
    if (!(message instanceof DiscordMessage)) {
      debug('Wrapping history message in DiscordMessage');
      return new DiscordMessage(message as any);
    }
    return message;
  });

  // Proceed with processing the message...
  try {
    const startTime = Date.now();
    const messageId = msg.getMessageId ? msg.getMessageId() : 'unknown';
    debug('Received message with ID:', messageId, 'at', new Date(startTime).toISOString());

    // Improvement: Adding guard to check if msg has required methods before proceeding
    if (!msg.getAuthorId || !msg.getChannelId) {
      debug('Invalid message object. Missing necessary methods.');
      return;
    }

    if (msg.isFromBot()) {
      if (ignoreBots || msg.getAuthorId() === botClientId) {
        debug(`[messageHandler] Ignoring message from bot or self: ${msg.getAuthorId()}`);
        return;
      }
    }

    // Start typing indicator when processing starts
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

    // Process command, if applicable
    await processCommand(msg, async (result: string) => {
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
    });

    if (commandProcessed) {
      stopTypingIndicator(msg.getChannelId());
      return;
    }

    const shouldReply = await shouldReplyToMessage(msg);
    if (!shouldReply) {
      debug('Message is not eligible for reply:', msg);
      stopTypingIndicator(msg.getChannelId());
      return;
    }

    if (messageConfig.get('MESSAGE_LLM_CHAT')) {
      const llmProvider = await getLlmProvider(channelId) as ILlmProvider;
      const llmResponse = await llmProvider.generateChatCompletion(historyMessages, msg.getText());
      if (llmResponse) {
        const timingManager = MessageDelayScheduler.getInstance();
        await timingManager.scheduleMessage(client, channelId, llmResponse, Date.now() - startTime, async (content: string) => {
          await messageProvider.sendMessageToChannel(channelId, content);
        });
      }
    }

    if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
      await sendFollowUpRequest(client, msg, channelId, 'AI response follow-up');
    }

    stopTypingIndicator(msg.getChannelId());

  } catch (error) {
    debug('Error in messageHandler:', error);
    stopTypingIndicator(msg.getChannelId());
  }
}
