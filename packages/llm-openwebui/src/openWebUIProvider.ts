import axios from 'axios';
import Debug from 'debug';
import { isSafeUrl } from '@hivemind/shared-types';
import type { IMessage } from '@src/message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import openWebUIConfig from './openWebUIConfig';

const debug = Debug('app:openWebUIProvider');

// Create axios instance with API URL and headers
const openWebUIClient = axios.create({
  baseURL: openWebUIConfig.get('apiUrl'),
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ollama', // Adjust as needed
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
    historyMessages: IMessage[] = []
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const messages = [
      ...historyMessages.map((msg) => ({ role: 'user', content: msg.getText() })),
      { role: 'user', content: userMessage },
    ];

    try {
      const targetUrl = openWebUIConfig.get('apiUrl') + '/chat/completions';
      if (!(await isSafeUrl(targetUrl))) {
        throw new Error('OpenWebUI API URL is not safe to connect to.');
      }

      const response = await axios.post(targetUrl, { model, messages }, {
        headers: openWebUIClient.defaults.headers.common,
        timeout: 15000,
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      debug('Error generating chat completion:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    try {
      const targetUrl = openWebUIConfig.get('apiUrl') + '/completions';
      if (!(await isSafeUrl(targetUrl))) {
        throw new Error('OpenWebUI API URL is not safe to connect to.');
      }

      const response = await axios.post(targetUrl, { model, prompt, max_tokens: 100 }, {
        headers: openWebUIClient.defaults.headers.common,
        timeout: 15000,
      });

      return response.data.choices[0].text;
    } catch (error) {
      debug('Error generating non-chat completion:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  },
};


