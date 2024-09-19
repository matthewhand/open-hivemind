import { FlowiseClient } from 'flowise-sdk';
import flowiseConfig from '@integrations/flowise/flowiseConfig';
import Debug from 'debug';

const debug = Debug('app:flowiseSdkClient');

/**
 * Fetches chat completions using Flowise SDK API.
 *
 * @param {string} prompt - The prompt/message for the chat.
 * @param {string} chatflowId - The ID of the chatflow.
 * @returns {Promise<string>} The Flowise response text.
 */
export async function getFlowiseSdkResponse(prompt: string, chatflowId: string): Promise<string> {
  const client = new FlowiseClient({ baseUrl: flowiseConfig.get('FLOWISE_API_ENDPOINT') });
  const apiKey = flowiseConfig.get('FLOWISE_API_KEY');

  try {
    debug('Sending request to Flowise SDK API with prompt:', prompt);
    const completion = await client.createPrediction({
      chatflowId,
      question: prompt,
      overrideConfig: {
        credentials: {
          'DefaultKey': apiKey,
        },
      },
      streaming: false, // Disabled streaming
    });

    if (completion.text) {
      debug('Received response:', completion.text);
      return completion.text;
    }

    throw new Error('No valid response from Flowise SDK.');
  } catch (error: any) {
    debug('Error using Flowise SDK:', error);
    throw new Error('Failed to fetch response from Flowise SDK.');
  }
}
