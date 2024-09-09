import { getLlmProvider } from '@src/message/management/getLlmProvider';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendCompletions } from '@src/llm/llm/generateCompletion';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig'; // Correct path for config import
import { ConfigurationManager } from '@config/ConfigurationManager'; // Import ConfigurationManager

const debug = Debug('app:sendFollowUpRequest');

/**
 * Sends an AI-generated follow-up message based on the conversation context.
 * @param {IMessage} msg - The message to follow up on.
 * @param {string} channelId - The channel where the follow-up should be sent.
 * @param {string} followUpText - The follow-up text to send.
 * @param {string} contextType - The context for the follow-up (e.g., 'general', 'idle', 'scheduled', 'followup').
 */
export async function sendFollowUpRequest(
  msg: IMessage,
  channelId: string,
  followUpText: string,
  contextType: 'general' | 'idle' | 'scheduled' | 'followup' = 'general'
): Promise<void> {
  const llmProvider = getLlmProvider(channelId);
  const provider = llmProvider instanceof Function ? 'openai' : 'flowise'; // Default to OpenAI if no provider is set
  const historyMessages = [msg];

  let selectedChatflowId;

  if (provider === 'flowise') {
    // Retrieve the chatflow for the channel, fallback to defaults based on contextType
    const configManager = ConfigurationManager.getInstance();
    selectedChatflowId = configManager.getSession('flowise', channelId)?.chatFlow;

    if (typeof selectedChatflowId !== 'string') {
      // Use the default chatflow based on the context
      switch (contextType) {
        case 'followup':
          selectedChatflowId = flowiseConfig.get('FLOWISE_FOLLOWUP_CHATFLOW_ID');
          break;
        case 'idle':
          selectedChatflowId = flowiseConfig.get('FLOWISE_IDLE_CHATFLOW_ID');
          break;
        case 'scheduled':
          selectedChatflowId = flowiseConfig.get('FLOWISE_SCHEDULED_CHATFLOW_ID');
          break;
        default:
          selectedChatflowId = flowiseConfig.get('FLOWISE_GENERAL_CHATFLOW_ID');
      }
    }

    debug(`[sendFollowUpRequest] Using Flowise chatflow ID: ${selectedChatflowId} for context: ${contextType}`);
  }

  try {
    debug(`[sendFollowUpRequest] Using provider: ${provider} for follow-up`);
    const response = await sendCompletions(historyMessages, provider);

    debug('[sendFollowUpRequest] Follow-up response generated:', response);

    // Send the follow-up response to the same channel
    await msg.reply(followUpText + ' ' + response);
  } catch (error) {
    debug('[sendFollowUpRequest] Error generating follow-up:', error);
  }
}
