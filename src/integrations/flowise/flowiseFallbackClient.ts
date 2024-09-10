import axios from 'axios';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import Debug from 'debug';
import { ConfigurationManager } from '@config/ConfigurationManager';

const debug = Debug('app:flowiseFallbackClient');

/**
 * Fetches chat completions from the Flowise API via HTTP.
 * This method handles sessions and sends the chatId for the chat.
 *
 * @param {string} channelId - The channel or conversation ID.
 * @param {string} question - The question/message from the user.
 * @returns {Promise<string>} The Flowise response text.
 */
export async function getFlowiseResponseFallback(channelId: string, question: string): Promise<string> {
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
  const chatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');

  if (!baseURL || !apiKey || !chatflowId) {
    debug('Missing Flowise configuration values.', { baseURL, apiKey, chatflowId });
    throw new Error('Flowise configuration incomplete. Ensure API key, endpoint, and chatflow ID are set.');
  }

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const payload: Record<string, any> = { question };

  if (chatId) payload.chatId = chatId;

  try {
    debug('Sending request to Flowise via HTTP fallback:', { baseURL, chatflowId, payload });
    const response = await axios.post(`${baseURL}/prediction/${chatflowId}`, payload, { headers });
    const { text, chatId: newChatId } = response.data;

    debug('Received response from Flowise HTTP fallback:', { text, newChatId });

    if (newChatId && newChatId !== chatId) {
      configManager.setSession('flowise', channelId, newChatId);
      debug(`Updated chatId for channelId: ${channelId} to ${newChatId}`);
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      debug('Flowise returned an invalid or empty text response via HTTP.');
      throw new Error('Flowise response via HTTP is empty or invalid.');
    }

    return text;
  } catch (error) {
    debug('Error communicating with Flowise API via HTTP:', error);
    throw new Error('Failed to fetch response from Flowise via HTTP fallback.');
  }
}
