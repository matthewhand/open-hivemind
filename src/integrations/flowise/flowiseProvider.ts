// src/integrations/flowise/flowiseProvider.ts

/**
 * Flowise provider implements the ILlmProvider interface.
 * Flowise only supports chat-based completions.
 * This provider generates responses using Flowise's API based on the message history.
 */

import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
  supportsChatCompletion: () => true,
  supportsCompletion: () => false,
import Debug from 'debug';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
import path from 'path';
import fs from 'fs';

const debug = Debug('app:flowiseProvider');
  generateCompletion: async (prompt: string): Promise<string> => {
    throw new Error("Completion (non-chat) not implemented.");
  },

/**
 * Reads Flowise API key from ~/.flowise/api.json and returns it.
 * Gracefully fails if the file doesn't exist or the key can't be found.
 * @returns {Promise<string | null>} The Flowise API key, or null if unavailable.
 */
async function getFlowiseApiKey(): Promise<string | null> {
  try {
    const apiFilePath = path.join(process.env.HOME || '', '.flowise', 'api.json');
    if (!fs.existsSync(apiFilePath)) {
      debug('Flowise API config file not found at:', apiFilePath);
      return null;
    }

    const apiData = JSON.parse(fs.readFileSync(apiFilePath, 'utf8'));
    const apiKey = apiData[0]?.apiKey;
    if (!apiKey) {
      debug('Flowise API key not found in the config file.');
      return null;
    }

    debug('Successfully read Flowise API key.');
    return apiKey;
  } catch (error) {
    if (error instanceof Error) {
      debug('Error reading Flowise API key:', error.message);
    } else {
      debug('Unknown error occurred while reading Flowise API key.');
    }
    return null;
  }
}

/**
 * Flowise provider implementation.
 * This provider only supports chat-based completions.
 */
export const flowiseProvider: ILlmProvider = {
  /**
   * Indicates that Flowise does not support non-chat completions.
   * @returns {boolean} False since Flowise only supports chat completions.
   */
  supportsCompletion: () => {
    debug('Flowise supports non-chat completions: false');
    return false;
  },

  /**
   * Generates a response using the Flowise API.
   * This is a chat-based completion model, so it uses the message history.
   * @param {IMessage[]} historyMessages - The message history to send to Flowise.
   * @returns {Promise<string>} The generated response from Flowise.
   */
  generateChatCompletion: async (historyMessages: IMessage[]): Promise<string> => {
    debug('Generating response from Flowise with message history size:', historyMessages.length);

    // Get the Flowise API key
    const apiKey = await getFlowiseApiKey();
    if (!apiKey) {
      throw new Error('Flowise API key is missing.');
    }

    const flowiseChatflowId = flowiseConfig.get('FLOWISE_DEFAULT_CHATFLOW_ID');
    const apiUrl = `${process.env.FLOWISE_API_ENDPOINT}/chatflows/${flowiseChatflowId}`;

    debug(`Flowise API URL: ${apiUrl}`);
    
    try {
      // Call the Flowise API with the message history
      const response = await axios.post(
        apiUrl,
        { messages: historyMessages },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Failed to generate response from Flowise.');
      }

      const generatedText = response.data.choices[0].message.content;
      debug('Generated response from Flowise:', generatedText);
      return generatedText;
    } catch (error) {
      if (error instanceof Error) {
        debug('Error generating response from Flowise:', error.message);
      } else {
        debug('Unknown error occurred while generating response from Flowise.');
      }
      throw error;
    }
  }
};
