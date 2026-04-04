import Debug from 'debug';
import { http, isHttpError } from '@hivemind/shared-types';
import type { IMessage } from '@src/message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import openWebUIConfig from './openWebUIConfig';

const debug = Debug('app:openWebUIProvider');

const openWebUIClient = http.create(openWebUIConfig.get('apiUrl'), {
  'Content-Type': 'application/json',
  Authorization: 'Bearer ollama',
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
      const data = await openWebUIClient.post<{ choices: Array<{ message: { content: string } }> }>('/chat/completions', { model, messages });
      return data.choices[0].message.content;
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    try {
      const data = await openWebUIClient.post<{ choices: Array<{ text: string }> }>('/completions', { model, prompt, max_tokens: 100 });
      return data.choices[0].text;
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
function formatError(error: unknown): unknown {
  if (isHttpError(error)) {
    return error.data || error.message;
  }
  return getErrorMessage(error);
}
