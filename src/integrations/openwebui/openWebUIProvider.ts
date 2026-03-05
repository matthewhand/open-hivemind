import axios from 'axios';
import Debug from 'debug';
import type { IMessage } from '@src/message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import openWebUIConfig from './openWebUIConfig';
import { generateChatCompletionDirect } from './directClient';

const debug = Debug('app:openWebUIProvider');

export class OpenWebUIProvider implements ILlmProvider {
  name = 'openwebui';
  private config: any;

  constructor(config?: any) {
    this.config = config || {};
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
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages, metadata });

    const apiUrl = this.config.apiUrl || openWebUIConfig.get('apiUrl');
    const model = metadata?.modelOverride || metadata?.model || this.config.model || openWebUIConfig.get('model');
    const systemPrompt = metadata?.systemPrompt;

    let authHeader = '';
    if (this.config.apiKey) {
      authHeader = `Bearer ${this.config.apiKey}`;
    } else if (openWebUIConfig.get('username') && openWebUIConfig.get('password')) {
      // In a real scenario, this might be a token fetched via login
      // but for direct we might just pass a bearer token if defined.
      // We will rely on directClient which takes an authHeader.
    } else {
      authHeader = 'Bearer ollama'; // Default as in original
    }

    const overrides = {
      apiUrl,
      authHeader,
      model,
    };

    return generateChatCompletionDirect(overrides, userMessage, historyMessages, systemPrompt);
  }

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    const apiUrl = this.config.apiUrl || openWebUIConfig.get('apiUrl');
    const model = this.config.model || openWebUIConfig.get('model');

    let authHeader = '';
    if (this.config.apiKey) {
      authHeader = `Bearer ${this.config.apiKey}`;
    } else {
      authHeader = 'Bearer ollama';
    }

    const baseURL = apiUrl.replace(/\/$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    };

    const client = axios.create({ baseURL, headers, timeout: 15000 });

    try {
      const response = await client.post('/completions', {
        model,
        prompt,
        max_tokens: 100,
      });

      return response.data.choices[0].text;
    } catch (error) {
      debug('Error generating non-chat completion:', formatError(error));
      throw new Error(`Non-chat completion failed: ${getErrorMessage(error)}`);
    }
  }
}

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

// Keep export for backward compatibility where it's still used as a singleton temporarily
export const openWebUIProvider = new OpenWebUIProvider();
