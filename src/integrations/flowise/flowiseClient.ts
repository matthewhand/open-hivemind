import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import axios from 'axios';
import { ConfigurationManager } from '@config/ConfigurationManager';

/**
 * Sends a request to Flowise API and manages session ID per channel.
 *
 * @param {string} channelId - The Discord channel or DM ID.
 * @param {string} question - The user's question.
 * @returns {Promise<string>} The LLM response from Flowise.
 */
export async function getFlowiseResponse(channelId: string, question: string): Promise<string> {
  const baseURL = flowiseConfig.get('FLOWISE_API_ENDPOINT') as string;
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY') as string;
  const chatflowId = flowiseConfig.get('FLOWISE_CHATFLOW_ID') as string;

  if (!baseURL || !apiKey || !chatflowId) {
    throw new Error('Flowise configuration is incomplete.');
  }

  // Retrieve session ID from ConfigurationManager
  const configManager = ConfigurationManager.getInstance();
  let sessionId = configManager.getSession('flowise', channelId);

  // Prepare the payload with the session ID
  const payload: Record<string, any> = { question };
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  try {
    const response = await axios.post(`${baseURL}/prediction/${chatflowId}`, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const { text, sessionId: newSessionId } = response.data;

    // If a new session ID is generated, store it in ConfigurationManager
    if (newSessionId && newSessionId !== sessionId) {
      configManager.setSession('flowise', channelId, newSessionId);
    }

    return text;
  } catch (error) {
    console.error('Error fetching data from Flowise API:', error);
    throw error;
  }
}
