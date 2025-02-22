import Debug from 'debug';
import { IMessageProvider } from '@src/message/interfaces/IMessageProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { stripBotId } from '../helpers/processing/stripBotId';
import { addUserHint } from '../helpers/processing/addUserHint';
import { validateMessage } from '../helpers/handler/validateMessage';
import { processCommand } from '../helpers/handler/processCommand';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage, markChannelAsInteracted } from '../helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '../helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import messageConfig from '@message/interfaces/messageConfig';
import { getMessageProvider } from '@src/message/management/getMessageProvider';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;
const messageProvider: IMessageProvider = getMessageProvider();
const llmProvider = getLlmProvider(); // Global scope

export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<string> {
  try {
    debug(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);
    console.log(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);

    if (!message.getAuthorId() || !message.getChannelId()) {
      debug('Invalid message object. Missing required methods:', JSON.stringify(message));
      return '';
    }

    if (message.isFromBot() && ignoreBots) {
      debug(`Ignoring bot message from: ${message.getAuthorId()}`);
      return '';
    }

    if (!(await validateMessage(message))) {
      debug('Message validation failed.');
      return '';
    }

    let processedMessage = message.getText();
    const botId = String(messageConfig.get<any>('BOT_ID') || messageProvider.getClientId());
    const userId = message.getAuthorId();
    processedMessage = stripBotId(processedMessage, botId);
    processedMessage = addUserHint(processedMessage, userId, botId);

    debug(`Processed message: "${processedMessage}"`);
    console.log(`Processed message: "${processedMessage}"`);

    let commandProcessed = false;
    if (Boolean(messageConfig.get<any>('MESSAGE_COMMAND_INLINE'))) {
      await processCommand(message, async (result: string) => {
        const authorisedUsers = String(messageConfig.get<any>('MESSAGE_COMMAND_AUTHORISED_USERS') || '');
        const allowedUsers = authorisedUsers.split(',').map(user => user.trim());
        if (!allowedUsers.includes(message.getAuthorId())) {
          debug('User not authorized:', message.getAuthorId());
          return;
        }
        const activeAgentName = message.metadata?.active_agent_name || 'Jeeves';
        await messageProvider.sendMessageToChannel(message.getChannelId(), result, activeAgentName);
        debug('Command response sent successfully.');
        markChannelAsInteracted(message.getChannelId());
        commandProcessed = true;
      });
      if (commandProcessed) return '';
    }

    const messageProviderType = String(messageConfig.get<any>('MESSAGE_PROVIDER'));
    const providerType = (messageProviderType === 'discord' ? 'discord' : 'generic');
    if (!shouldReplyToMessage(message, botId, providerType)) return '';

    const timingManager = MessageDelayScheduler.getInstance();
    const startTime = Date.now();
    await timingManager.scheduleMessage(
      message.getChannelId(),
      "cmd", // dummy message id
      message.getText(),
      message.getAuthorId(),
      async (text: string, threadId?: string): Promise<string> => {
        const activeAgentName = message.metadata?.active_agent_name || 'Jeeves';
        const sentResult = await messageProvider.sendMessageToChannel(message.getChannelId(), text, activeAgentName);
        if (Boolean(messageConfig.get<any>('MESSAGE_LLM_FOLLOW_UP'))) {
          const followUpText = 'Follow-up text';
          await sendFollowUpRequest(message, message.getChannelId(), followUpText);
          debug('Sent follow-up request.');
        }
        return sentResult;
      },
      false
    );
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    debug(`Scheduled message with initial processing time: ${processingTime}ms`);
    return ''; // Response handled by scheduler
  } catch (error) {
    debug(`Error handling message: ${(error as Error).message}`);
    console.error(`Error: ${(error as Error).message}`);
    return '';
  }
}
