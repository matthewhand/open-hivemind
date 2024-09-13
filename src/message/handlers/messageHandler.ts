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
import messageConfig from '@src/message/interfaces/messageConfig';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

export async function handleMessage(
  messengerService: IMessengerService,
  msg: IMessage,
  startTime: number
): Promise<void> {
  debug('Handling message with ID: ' + msg.getMessageId());

  if (!msg.getAuthorId || !msg.getChannelId) {
    debug('Invalid message object. Missing necessary methods.');
    return;
  }

  if (msg.isFromBot() && ignoreBots) {
    debug(`[handleMessage] Ignoring message from bot: ${msg.getAuthorId()}`);
    return;
  }

  sendTyping(messengerService, msg.getChannelId());

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

  const shouldReply = await shouldReplyToMessage(msg, messengerService.getClientId(), messageProvider, Date.now() - startTime);
  if (!shouldReply) {
    debug('Message is not eligible for reply:', msg);
    stopTypingIndicator(msg.getChannelId());
    return;
  }

  if (messageConfig.get('MESSAGE_LLM_CHAT')) {
    const llmProvider = await getLlmProvider(channelId);
    const llmResponse = await llmProvider.generateChatCompletion([], msg.getText());
    if (llmResponse) {
      const timingManager = MessageDelayScheduler.getInstance();
      await timingManager.scheduleMessage(
        messengerService,
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
    await sendFollowUpRequest(messengerService, msg, channelId, 'AI response follow-up');
  }

  stopTypingIndicator(msg.getChannelId());
}
