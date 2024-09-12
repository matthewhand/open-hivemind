import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/processing/validateMessage';
import { processCommand } from '@src/message/helpers/processing/processCommand';
import { getMessageProvider } from '@src/message/management/getMessageProvider';
import { getLlmProvider } from '@src/message/management/getLlmProvider';
import { shouldReplyToMessage } from '@src/message/helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '@src/message/helpers/timing/MessageDelayScheduler';
import { sendFollowUpRequest } from '@src/message/helpers/followUp/sendFollowUpRequest';
import { sendTyping } from '@integrations/discord/interaction/sendTyping';
import { stopTypingIndicator } from '@integrations/discord/stopTypingIndicator';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import messageConfig from '@src/message/interfaces/messageConfig';
import { config } from 'dotenv';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import { Client } from 'discord.js';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';

config();
const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;
const botClientId = discordConfig.get('DISCORD_CLIENT_ID') as string;

export async function messageHandler(
  client: Client,
  messages: IMessage[]
): Promise<void> {
  debug('messageHandler called with messages:', messages);

  if (!messages || messages.length === 0) {
    debug('No messages to process');
    return;
  }

  const historyMessages = messages.slice(1); // Use the rest as history
  let msg = messages[0]; // First message for processing

  if (!(msg instanceof DiscordMessage)) {
    debug('msg is not an instance of IMessage, wrapping it in DiscordMessage');
    msg = new DiscordMessage(msg as any); // Wrap it in DiscordMessage
  }

  historyMessages.map((message) => {
    if (!(message instanceof DiscordMessage)) {
      debug('Wrapping history message in DiscordMessage');
      return new DiscordMessage(message as any);
    }
    return message;
  });

  try {
    const startTime = Date.now();
    const messageId = msg.getMessageId ? msg.getMessageId() : 'unknown';
    debug('Received message with ID:', messageId, 'at', new Date(startTime).toISOString());

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

    if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
      await sendFollowUpRequest(client, msg, channelId, 'AI response follow-up');
    }

    stopTypingIndicator(msg.getChannelId());

  } catch (error) {
    debug('Error in messageHandler:', error);
    stopTypingIndicator(msg.getChannelId());
  }
}
