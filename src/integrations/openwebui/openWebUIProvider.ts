import axios from 'axios';
import Debug from 'debug';
import type { IMessage } from '@src/message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import openWebUIConfig from './openWebUIConfig';

const debug = Debug('app:openWebUIProvider');

/**
 * Provides chat and non-chat completion functionality for OpenWebUI.
 */
export class OpenWebUIProvider implements ILlmProvider {
  name = 'openwebui';
  private config: any;
  private client: import('axios').AxiosInstance;

  constructor(config?: any) {
    this.config = config || {};

    // Fallback logic for credentials since openWebUIConfig doesn't natively expose apiKey.
    // In actual use, this logic connects to the OpenWebUI backend relying on the session API or pre-configured proxies.
    // Or we expect the user to configure API keys per profile.
    let apiKey = this.config.apiKey || 'ollama';
    try {
      apiKey = this.config.apiKey || openWebUIConfig.get('apiKey' as any) || 'ollama';
    } catch {
      // Ignore if apiKey is not in openWebUIConfig schema
    }

    this.client = axios.create({
      baseURL: this.config.apiUrl || openWebUIConfig.get('apiUrl'),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`, // Adjust as needed
      },
      timeout: 15000,
    });
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return true;
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const messages = [
      ...historyMessages.map((msg) => ({
        role: (msg as any).role || 'user',
        content: msg.getText(),
      })),
      { role: 'user', content: userMessage },
    ];

    const model = metadata?.modelOverride || this.config.model || openWebUIConfig.get('model');

    try {
      const response = await this.client.post('/chat/completions', {
        model,
        messages,
      });

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    const model = this.config.model || openWebUIConfig.get('model');

    try {
      const response = await this.client.post('/completions', {
        model,
        prompt,
        max_tokens: 100,
      });

      return response.data?.choices?.[0]?.text || '';
    } catch (error) {
      debug('Error generating non-chat completion:', formatError(error));
      throw new Error(`Non-chat completion failed: ${getErrorMessage(error)}`);
    }
  }
}

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
