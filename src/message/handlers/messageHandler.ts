import Debug from 'debug';
import { IMessageProvider } from '@src/message/interfaces/IMessageProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import { stripBotId } from '../helpers/processing/stripBotId';
import { addUserHint } from '../helpers/processing/addUserHint';
import { validateMessage } from '../helpers/handler/validateMessage';
import { processCommand } from '../helpers/handler/processCommand';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { shouldReplyToMessage, markChannelAsInteracted } from '../helpers/processing/shouldReplyToMessage';
import { MessageDelayScheduler } from '../helpers/handler/MessageDelayScheduler';
import { sendFollowUpRequest } from '../helpers/handler/sendFollowUpRequest';
import messageConfig from '@src/message/interfaces/messageConfig';
import { getMessageProvider } from '@src/message/management/getMessageProvider';
// If you have a common adapter already, import it here. For example:
// import { toCommonMessage } from '../common/adapters';

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

const messageProvider: IMessageProvider = getMessageProvider();

export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<void> {
  try {
    debug(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);
    console.log(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);

    // Validate the message
    if (!message.getAuthorId() || !message.getChannelId()) {
      debug('Invalid message object. Missing required methods:', JSON.stringify(message));
      return;
    }

    if (message.isFromBot() && ignoreBots) {
      debug(`[handleMessage] Ignoring bot message from: ${message.getAuthorId()}`);
      return;
    }

    if (!(await validateMessage(message))) {
      debug('Message validation failed.');
      return;
    }

    const filterByUser = messageConfig.get('MESSAGE_FILTER_BY_USER');
    debug(`MESSAGE_FILTER_BY_USER: ${filterByUser}`);

    let processedMessage = message.getText();
    const botId = messageConfig.get('BOT_ID') || messageProvider.getClientId();
    const userId = message.getAuthorId();

    processedMessage = stripBotId(processedMessage, botId);
    processedMessage = addUserHint(processedMessage, userId, botId);

    debug(`Processed message: "${processedMessage}"`);
    console.log(`Processed message: "${processedMessage}"`);

    // (Optional) Convert message to a common model if desired:
    // const commonMessage = toCommonMessage(message);

    // Handle inline commands
    let commandProcessed = false;
    if (messageConfig.get('MESSAGE_COMMAND_INLINE')) {
      await processCommand(message, async (result: string) => {
        const authorisedUsers = messageConfig.get('MESSAGE_COMMAND_AUTHORISED_USERS') || '';
        const allowedUsers = authorisedUsers.split(',').map(user => user.trim());
        if (!allowedUsers.includes(message.getAuthorId())) {
          debug('User not authorized to run commands:', message.getAuthorId());
          return;
        }
        try {
          await messageProvider.sendMessageToChannel(message.getChannelId(), result);
          debug('Command response sent successfully.');
          markChannelAsInteracted(message.getChannelId());
          commandProcessed = true;
        } catch (error) {
          debug('Error sending command response:', (error as Error).message);
        }
      });
      if (commandProcessed) return;
    }

    const shouldReply = shouldReplyToMessage(message, botId, messageConfig.get('PLATFORM') as 'discord' | 'generic');
    if (!shouldReply) {
      debug('Message is not eligible for reply:', message);
      return;
    }

    const llmProvider = getLlmProvider();
    const llmResponse = await llmProvider.generateChatCompletion(
      message.getText() || '',
      historyMessages
    );

    if (llmResponse) {
      const timingManager = MessageDelayScheduler.getInstance();
      const startTime = Date.now();
      const response = await generateResponse(processedMessage);
      const endTime = Date.now();
      const actualProcessingTime = endTime - startTime;

      const sendFunction = async (responseContent: string) => {
        try {
          await messageProvider.sendMessageToChannel(message.getChannelId(), responseContent);
          debug(`Sent LLM-generated message: ${responseContent}`);
          markChannelAsInteracted(message.getChannelId());
        } catch (error) {
          debug('Error sending LLM-generated message:', (error as Error).message);
        }
      };

      timingManager.scheduleMessage(message.getChannelId(), llmResponse, actualProcessingTime, sendFunction);
      debug('Scheduled LLM response:', llmResponse);
    }

    if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
      const followUpText = 'Follow-up text'; // This can be dynamic
      await sendFollowUpRequest(message, message.getChannelId(), followUpText);
      debug('Sent follow-up request.');
    }
  } catch (error) {
    debug(`Error handling message: ${(error as Error).message}`);
    console.error(`Error handling message: ${(error as Error).message}`);
  }
}

async function generateResponse(message: string): Promise<string> {
  return `You said: "${message}"`;
}
