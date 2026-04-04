import Debug from 'debug';
import { http, isHttpError } from '@hivemind/shared-types';
import { ConfigurationManager } from '@config/ConfigurationManager';
import flowiseConfig from '@integrations/flowise/flowiseConfig';

const debug = Debug('app:flowiseClient');

/**
 * Fetches chat completions from the Flowise API.
 * Sends only the latest message (question) and does not include history.
 *
 * @param {string} channelId - The channel or conversation ID.
 * @param {string} question - The latest question/message from the user.
 * @returns {Promise<string>} The Flowise response text.
 * @throws {Error} When the question is empty.
 * @throws {Error} When the Flowise configuration is incomplete (missing API key, endpoint, or chatflow ID).
 * @throws {Error} When the Flowise response is empty or invalid.
 * @throws {Error} When the API request fails.
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
  const chatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');

  if (!baseURL || !apiKey || !chatflowId) {
    debug('Missing Flowise configuration values.', { baseURL, apiKey, chatflowId });
    throw new Error(
      'Flowise configuration incomplete. Ensure API key, endpoint, and chatflow ID are set.'
    );
  }

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const payload: Record<string, any> = { question }; // Send only the latest question

  if (chatId) {
    payload.chatId = chatId;
  }

  try {
    debug('Sending request to Flowise:', { baseURL, chatflowId, payload });
    const targetUrl = `${baseURL}/prediction/${chatflowId}`;

    const data = await http.post<{ text: string; chatId?: string }>(targetUrl, payload, { headers });
    const { text, chatId: newChatId } = data;

    debug('Received response from Flowise:', { text, newChatId });

    if (newChatId && newChatId !== chatId) {
      configManager.setSession('flowise', channelId, newChatId);
      debug(`Updated chatId for channelId: ${channelId} to ${newChatId}`);
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      debug('Flowise returned an invalid or empty text response.');
      throw new Error('Flowise response is empty or invalid.');
    }

    return text;
  } catch (error: unknown) {
    if (isHttpError(error)) {
      debug('Flowise API error with status:', error.status, 'response data:', error.data);
    } else {
      debug('Error communicating with Flowise API:', error);
    }
    throw new Error('Failed to fetch response from Flowise.');
  }
}

/**
 * Fallback to fetch chat completions from the Flowise API.
 * This method sends only the latest question/message to the API.
 *
 * @param {string} channelId - The channel or conversation ID.
 * @param {string} question - The question/message from the user.
 * @returns {Promise<string>} The Flowise response text.
 */
export async function getFlowiseResponseFallback(
  channelId: string,
  question: string
): Promise<string> {
  return await getFlowiseResponse(channelId, question);
}
