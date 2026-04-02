import axios from 'axios';
import Debug from 'debug';
import type { IMessage } from '@src/message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { getCircuitBreaker } from '@common/CircuitBreaker';
import openWebUIConfig from './openWebUIConfig';

const debug = Debug('app:openWebUIProvider');

const openWebUIClient = axios.create({
  baseURL: openWebUIConfig.get('apiUrl'),
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ollama',
  },
  timeout: 15000,
});

const model = openWebUIConfig.get('model');

const circuitBreaker = getCircuitBreaker({
  name: 'openwebui',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 3,
});

export const openWebUIProvider: ILlmProvider = {
  name: 'openwebui',
  supportsChatCompletion: (): boolean => true,
  supportsCompletion: (): boolean => true,
  supportsHistory: (): boolean => false,

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = []
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const messages = [
      ...historyMessages.map((msg) => ({ role: 'user', content: msg.getText() })),
      { role: 'user', content: userMessage },
    ];

    return circuitBreaker.execute(async () => {
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
    });
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    return circuitBreaker.execute(async () => {
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
    });
  },
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function formatError(error: unknown): any {
  if (axios.isAxiosError(error)) {
    return error.response?.data || error.message;
  }
  return getErrorMessage(error);
}
