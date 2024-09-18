// Message Handler
// This function processes incoming messages on a Discord channel and determines the bot's appropriate response. 
// It handles message validation, command execution, reply decision-making, and generating responses using a language model (LLM). 
// If configured, it also sends follow-up messages.
// Key steps include:
// - Ignoring bot messages (if enabled).
// - Validating messages and processing commands for authorized users.
// - Deciding whether the bot should reply based on message content.
// - Generating replies via LLM if chat functionality is enabled.
// - Optionally sending follow-up messages.

import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/handler/validateMessage';
import { processCommand } from '@src/message/helpers/handler/processCommand';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage } from '@src/message/helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '@src/message/helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '@src/message/helpers/handler/sendFollowUpRequest';
import messageConfig from '@src/message/interfaces/messageConfig';
import { DiscordService } from '@src/integrations/discord/DiscordService';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

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

  const isValidMessage = await validateMessage(message);
  if (!isValidMessage) {
    debug('Message validation failed. Exiting handler.');
    return;
  }
  debug('Message validated successfully.');

  let commandProcessed = false;

  // Process inline commands, if any
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
    return;
  }

  // Determine if bot should reply
  const shouldReply = await shouldReplyToMessage(message, botClientId, "discord", Date.now());
  if (!shouldReply) {
    debug('Message is not eligible for reply:', message);
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
      const client = DiscordService.getInstance().client;
      await timingManager.scheduleMessage(
        message.getChannelId(),
        message.getChannelId(),
        Date.now(),
        (message: string) => { debug(`Generated message: ${message}`); }
      );
      debug('Sending LLM-generated content:', llmResponse);
    }
  }

  // Follow-up logic, if enabled
  if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
    const followUpText = 'Follow-up text';
    await sendFollowUpRequest(message, message.getChannelId(), followUpText);
  }
}
