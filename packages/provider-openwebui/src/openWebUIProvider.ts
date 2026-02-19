import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
import openWebUIConfig from './openWebUIConfig';
import Debug from 'debug';

const debug = Debug('app:openWebUIProvider');

// Create axios instance with API URL and headers
const openWebUIClient = axios.create({
  baseURL: openWebUIConfig.get('apiUrl'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ollama',  // Adjust as needed
  },
  timeout: 15000,
});

const model = openWebUIConfig.get('model');

/**
 * Provides chat and non-chat completion functionality for OpenWebUI.
 */
export const openWebUIProvider: ILlmProvider = {
  name: 'openwebui',
  supportsChatCompletion: (): boolean => true,
  supportsCompletion: (): boolean => true,

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = [],
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const messages = [
      ...historyMessages.map(msg => ({ role: 'user', content: msg.getText() })),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await openWebUIClient.post('/chat/completions', {
        model,
        messages,
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    try {
      const response = await openWebUIClient.post('/completions', {
        model,
        prompt,
        max_tokens: 100,
      });

      return response.data.choices[0].text;
    } catch (error) {
      debug('Error generating non-chat completion:', formatError(error));
      throw new Error(`Non-chat completion failed: ${getErrorMessage(error)}`);
    }
  },
};

/**
 * Safely extracts the error message.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Formats the error for debugging purposes.
 */
function formatError(error: unknown): any {
  if (axios.isAxiosError(error)) {
    return error.response?.data || error.message;
  }
  return getErrorMessage(error);
}
