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
import messageConfig from '@src/config/messageConfig'; // Updated import
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
    const botId = messageConfig.get('BOT_ID') || messageProvider.getClientId();
    const userId = message.getAuthorId();
    processedMessage = stripBotId(processedMessage, botId);
    processedMessage = addUserHint(processedMessage, userId, botId);

    debug(`Processed message: "${processedMessage}"`);
    console.log(`Processed message: "${processedMessage}"`);

    let commandProcessed = false;
    if (messageConfig.get('MESSAGE_COMMAND_INLINE')) {
      await processCommand(message, async (result: string) => {
        const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') || '';
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

    if (!shouldReplyToMessage(message, botId, messageConfig.get('MESSAGE_PROVIDER'))) return '';

    const timingManager = MessageDelayScheduler.getInstance();
    const startTime = Date.now();
    timingManager.scheduleMessage(
      message.getChannelId(),
      message,
      0,
      async (responseContent: string) => {
        const activeAgentName = message.metadata?.active_agent_name || 'Jeeves';
        await messageProvider.sendMessageToChannel(message.getChannelId(), responseContent, activeAgentName);
        debug(`Sent LLM response from "${activeAgentName}": ${responseContent}`);
        markChannelAsInteracted(message.getChannelId());

        if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
          const followUpText = 'Follow-up text';
          await sendFollowUpRequest(message, message.getChannelId(), followUpText);
          debug('Sent follow-up request.');
        }
      },
      llmProvider
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
