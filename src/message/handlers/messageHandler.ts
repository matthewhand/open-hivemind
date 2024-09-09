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
  if (!msg) {
    debug('No message provided.');
    return;
  }

  const startTime = Date.now();
  debug('Received message with ID:', msg.getMessageId(), 'at', new Date(startTime).toISOString());

  if (msg.isFromBot()) {
    if (ignoreBots || msg.getAuthorId() === botClientId) {
      debug(`[messageHandler] Ignoring message from bot or self: ${msg.getAuthorId()}`);
      return;
    }
  }

  if (!(msg && 'getMessageId' in msg && typeof msg.getMessageId === 'function')) {
    debug('msg is not a valid IMessage instance.');
    return;
  }

  debug('msg is a valid instance of IMessage.');

  if (typeof msg.getText !== 'function') {
    debug('msg does not have a valid getText method.');
    return;
  }

  debug('msg has a valid getText method.');

  if (!msg.getText().trim()) {
    debug('Received an empty message.');
    return;
  }

  if (!validateMessage(msg)) {
    debug('Message validation failed.');
    return;
  }

  debug('Message validated successfully.');

  const messageProvider = getMessageProvider();
  const channelId = msg.getChannelId();
  let commandProcessed = false;
  await processCommand(msg, async (result: string) => {
    try {
      if (messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS')) {
        const allowedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS').split(',');
        if (!allowedUsers.includes(msg.getAuthorId())) {
          debug('Command not authorized for user:', msg.getAuthorId());
          return;
        }
      }

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

  // Generic handling for LLM providers
  if (messageConfig.get('MESSAGE_LLM_CHAT') && shouldReplyToMessage(msg)) {
    const llmProvider = getLlmProvider(channelId);
    const llmResponse = await llmProvider(msg.getText(), historyMessages);  // Fixing chatCompletion error

    if (llmResponse) {
      const timingManager = MessageDelayScheduler.getInstance();
      timingManager.scheduleMessage(channelId, llmResponse, Date.now() - startTime, async (content: string) => {
        try {
          await messageProvider.sendMessageToChannel(channelId, content);
          debug('LLM response sent successfully.');
        } catch (replyError) {
          debug('Failed to send LLM response:', replyError);
        }
      });
    }
  }

  if (messageConfig.get('MESSAGE_LLM_CHAT') && messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
    if (!messageConfig.get('MESSAGE_COMMAND_INLINE') && !messageConfig.get('MESSAGE_COMMAND_SLASH')) {
      debug('Follow-up logic is skipped because command processing is not enabled.');
      return;
    }

    debug('Follow-up logic is enabled.');
    await sendFollowUpRequest(msg, channelId, 'AI response follow-up');
    debug('Follow-up request handled.');
  }

  debug('Message handling completed.');
}
