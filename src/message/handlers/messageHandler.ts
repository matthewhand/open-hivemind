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

interface MessageConfig {
  MESSAGE_LLM_CHAT?: boolean;
  MESSAGE_LLM_FOLLOW_UP?: boolean;
  MESSAGE_COMMAND_INLINE?: boolean;
  MESSAGE_COMMAND_SLASH?: boolean;
  MESSAGE_COMMAND_AUTHORISED_USERS?: string;
  MESSAGE_IGNORE_BOTS?: boolean;
}

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

  // Process command and get whether a command was processed
  const commandProcessed = await processCommand(msg, async (result: string) => {
    await messageProvider.sendMessageToChannel(channelId, result);
    debug('Command reply sent successfully.');
  });

  // If no command was processed, handle LLM response generation if enabled
  if (!commandProcessed && messageConfig.get('MESSAGE_LLM_CHAT')) {
    const llmProvider = getLlmProvider(channelId);
    const providerName = llmProvider instanceof FlowiseProvider ? 'Flowise' : 'OpenAI';
    debug(`Selected LLM provider: ${providerName} for channel ${channelId}`);

    const llmResponse = await llmProvider.chatCompletion(msg.getText(), historyMessages);

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
