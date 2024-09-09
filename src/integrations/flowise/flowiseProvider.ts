import axios from 'axios';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import path from 'path';
import fs from 'fs';

const debug = Debug('app:flowiseProvider');

/**
 * Reads Flowise API key from ~/.flowise/api.json and returns it. Gracefully fails if the file doesn't exist.
 * @returns {Promise<string | null>} The Flowise API key, or null if the file doesn't exist or key can't be found.
 */
async function getFlowiseApiKey(): Promise<string | null> {
  try {
    const apiFilePath = path.join(process.env.HOME || '', '.flowise', 'api.json');
    if (!fs.existsSync(apiFilePath)) {
      debug('Flowise API config file not found.');
      return null;
    }

    const apiData = JSON.parse(fs.readFileSync(apiFilePath, 'utf8'));
    const apiKey = apiData[0]?.apiKey;
    if (!apiKey) {
      debug('Flowise API key not found in the config file.');
      return null;
    }

    return apiKey;
  } catch (error) {
    debug('Error reading Flowise API key:', error);
    return null;
  }
}

/**
 * Flowise provider to generate responses based on full message history.
 * @param {IMessage[]} messages - The messages to send to Flowise.
 * @returns {Promise<string>} The generated response from Flowise.
 */
export async function getFlowiseProvider(messages: IMessage[]): Promise<string> {
  const apiKey = await getFlowiseApiKey();
  if (!apiKey) {
    throw new Error('Flowise API key is missing.');
  }

  const flowiseChatflowId = flowiseConfig.get('FLOWISE_DEFAULT_CHATFLOW_ID');
  const apiUrl = `${process.env.FLOWISE_API_ENDPOINT}/chatflows/${flowiseChatflowId}`;

  try {
    const response = await axios.post(
      apiUrl,
      { messages },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('Failed to generate response from Flowise.');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    debug('Error generating response from Flowise:', error.message);
    throw error;
  }
}
