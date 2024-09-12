import { FlowiseClient } from 'flowise-sdk';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import Debug from 'debug';

const debug = Debug('app:flowiseSdkClient');

/**
 * Fetches chat completions using Flowise SDK.
 *
 * @param {string} prompt - The prompt/message for the chat.
 * @param {string} chatflowId - The ID of the chatflow.
 * @returns {Promise<string>} The Flowise response text.
 */
export async function getFlowiseSdkResponse(prompt: string, chatflowId: string): Promise<string> {
  const client = new FlowiseClient({ baseUrl: flowiseConfig.get('FLOWISE_API_ENDPOINT') });

  try {
    debug('Sending request to Flowise SDK with prompt:', prompt);
    const response = await client.getCompletion({ chatflowId, question: prompt }); // Updated method
    debug('Received response from Flowise SDK:', response);

    if (response?.text) {
      return response.text;
    }

    throw new Error('No valid response from Flowise SDK.');
  } catch (error: any) {
    debug('Error using Flowise SDK:', error);
    throw new Error('Failed to fetch response from Flowise SDK.');
  }
}
