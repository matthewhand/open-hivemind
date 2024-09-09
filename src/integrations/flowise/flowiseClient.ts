import axios from 'axios';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import Debug from 'debug';
import { ConfigurationManager } from '@config/ConfigurationManager';

const debug = Debug('app:flowiseClient');

/**
 * Fetches chat completions from the Flowise API.
 * This function respects session management, sending the current chatId for the chat.
 *
 * @param {string} channelId - The channel or conversation ID.
 * @param {string} question - The question/message from the user.
 * @returns {Promise<string>} The Flowise response text.
 */
export async function getFlowiseResponse(channelId: string, question: string): Promise<string> {
  if (!question.trim()) {
    debug('Empty question provided. Aborting request.');
    throw new Error('Cannot send an empty question to Flowise.');
  }

  const configManager = ConfigurationManager.getInstance();
  const session = configManager.getSession('flowise', channelId) as { chatId?: string } | undefined;
  const chatId: string | undefined = session?.chatId;

  debug(`Using chatId: ${chatId || 'none'} for channelId: ${channelId}`);

  const baseURL = flowiseConfig.get('FLOWISE_API_ENDPOINT');
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY');
  const chatflowId = flowiseConfig.get('FLOWISE_CHATFLOW_ID');

  if (!baseURL || !apiKey || !chatflowId) {
    debug('Missing Flowise configuration values.', { baseURL, apiKey, chatflowId });
    throw new Error('Flowise configuration incomplete. Ensure API key, endpoint, and chatflow ID are set.');
  }

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const payload: Record<string, any> = { question };

  if (chatId) payload.chatId = chatId;

  try {
    debug('Sending request to Flowise:', { baseURL, chatflowId, payload });
    const response = await axios.post(`${baseURL}/prediction/${chatflowId}`, payload, { headers });
    const { text, chatId: newChatId } = response.data;

    debug('Received response from Flowise:', { text, newChatId });

    if (newChatId && newChatId !== chatId) {
      configManager.setSession('flowise', channelId, { chatId: newChatId });
      debug(`Updated chatId for channelId: ${channelId} to ${newChatId}`);
    }

    return text;
  } catch (error) {
    debug('Error communicating with Flowise API:', error);
    throw new Error('Failed to fetch response from Flowise.');
  }
}
