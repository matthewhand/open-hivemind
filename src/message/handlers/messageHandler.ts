import Debug from 'debug';
import { IMessageProvider } from '@src/message/interfaces/IMessageProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';  // ✅ Added missing import
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

const debug = Debug('app:messageHandler');
const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS') === true;

const messageProvider: IMessageProvider = getMessageProvider();

export async function handleMessage(message: IMessage, historyMessages: IMessage[]): Promise<string> {
  try {
    debug(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);
    console.log(`Handling message from user ${message.getAuthorId()} in channel ${message.getChannelId()}.`);

    if (!message.getAuthorId() || !message.getChannelId()) {
      debug('Invalid message object. Missing required methods:', JSON.stringify(message));
      return ''; // Return an empty string
    }

    if (message.isFromBot() && ignoreBots) {
      debug(`[handleMessage] Ignoring bot message from: ${message.getAuthorId()}`);
      return ''; // Return an empty string for ignored bot messages
    }

    if (!(await validateMessage(message))) {
      debug('Message validation failed.');
      return ''; // Return an empty string if validation fails
    }

    const filterByUser = messageConfig.get('MESSAGE_FILTER_BY_USER');
    debug(`MESSAGE_FILTER_BY_USER: ${filterByUser}`);

    let processedMessage = message.getText();
    const botId = messageConfig.get('BOT_ID') || messageProvider.getClientId();
    const userId = message.getAuthorId();

    processedMessage = stripBotId(processedMessage, botId);
    processedMessage = addUserHint(processedMessage, userId, botId);

    debug(`Processed message: \"${processedMessage}\"`);
    console.log(`Processed message: \"${processedMessage}\"`);

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
          // Use active agent override if available from message metadata; otherwise default to UniversityPoet.
          const activeAgentName = (message.metadata && message.metadata.active_agent_name) || 'UniversityPoet';
          await messageProvider.sendMessageToChannel(message.getChannelId(), result, activeAgentName);
          debug('Command response sent successfully.');
          markChannelAsInteracted(message.getChannelId());
          commandProcessed = true;
        } catch (error) {
          debug('Error sending command response:', (error as Error).message);
        }
      });
      if (commandProcessed) return ''; // Return empty string if command was processed
    }

    const shouldReply = shouldReplyToMessage(message, botId, messageConfig.get('PLATFORM') as 'discord' | 'generic');
    if (!shouldReply) {
      debug('Message is not eligible for reply:', message);
      return ''; // Return empty string if not eligible for reply
    }

    const llmProvider = getLlmProvider();

    const llmResponse = await (llmProvider as ILlmProvider).generateChatCompletion(
      message.getText() || '',
      historyMessages
    );

    if (llmResponse) {
      // --- Extract active agent name from either the IMessage metadata or the LLM response if available ---
      let activeAgentName: string | undefined;
      if (message && message.metadata && message.metadata.active_agent_name) {
        activeAgentName = message.metadata.active_agent_name;
      } else if (typeof llmResponse === 'object' && llmResponse !== null) {
        const llmObj = llmResponse as any;
        if (llmObj.context_variables && llmObj.context_variables.active_agent_name) {
          activeAgentName = llmObj.context_variables.active_agent_name;
        } else if (llmObj.agent && llmObj.agent.name) {
          activeAgentName = llmObj.agent.name;
        }
      }
      debug(`Active agent name: ${activeAgentName}`);

      const timingManager = MessageDelayScheduler.getInstance();
      const startTime = Date.now();
      // Optionally, generate a confirmation response.
      const response = await generateResponse(processedMessage);
      const endTime = Date.now();
      const actualProcessingTime = endTime - startTime;

      const sendFunction = async (responseContent: any) => {
        try {
          // If responseContent is an object, extract its text property.
          const textContent = typeof responseContent === 'object' && responseContent !== null
            ? responseContent.text || ''
            : responseContent;
          // Pass activeAgentName as the third parameter so SlackService chooses the right bot.
          await messageProvider.sendMessageToChannel(message.getChannelId(), textContent, activeAgentName);
          debug(`Sent LLM-generated message from agent "${activeAgentName}": ${textContent}`);
          markChannelAsInteracted(message.getChannelId());
        } catch (error) {
          debug('Error sending LLM-generated message:', (error as Error).message);
        }
      };

      timingManager.scheduleMessage(message.getChannelId(), llmResponse, actualProcessingTime, sendFunction);
      debug('Scheduled LLM response:', llmResponse);
      return llmResponse; // Return the LLM response object (which includes text and context_variables)
    }

    if (messageConfig.get('MESSAGE_LLM_FOLLOW_UP')) {
      const followUpText = 'Follow-up text';
      await sendFollowUpRequest(message, message.getChannelId(), followUpText);
      debug('Sent follow-up request.');
    }

    return ''; // Default return if no LLM response is generated.
  } catch (error) {
    debug(`Error handling message: ${(error as Error).message}`);
    console.error(`Error handling message: ${(error as Error).message}`);
    return ''; // Return empty string on error.
  }
}

async function generateResponse(message: string): Promise<string> {
  return `You said: \"${message}\"`;
}
