<<<<<<< HEAD
import axios from 'axios';
=======
import axios, { type AxiosInstance } from 'axios';
>>>>>>> origin/main
import Debug from 'debug';
import openWebUIConfig from '../../config/openWebUIConfig';
import type { ILlmProvider } from '../../llm/interfaces/ILlmProvider';
import type { IMessage } from '../../message/interfaces/IMessage';

const debug = Debug('app:openWebUIProvider');

<<<<<<< HEAD
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
=======
export interface OpenWebUIProviderConfig {
  apiUrl?: string;
  apiKey?: string;
  authHeader?: string;
  username?: string;
  password?: string;
  model?: string;
}

export class OpenWebUIProvider implements ILlmProvider {
  name = 'openwebui';
  private client: AxiosInstance;
  private model: string;
  private sessionKey: string | null = null;
  private config: OpenWebUIProviderConfig;
  private resolvedApiUrl: string;

  constructor(config?: OpenWebUIProviderConfig) {
    this.config = config || {};
    const rawApiUrl =
      this.config.apiUrl ||
      openWebUIConfig.get('OPEN_WEBUI_API_URL') ||
      'http://localhost:3000/api/';
    this.resolvedApiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
    this.model = this.config.model || openWebUIConfig.get('OPEN_WEBUI_MODEL');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.apiKey) {
      const headerName = this.config.authHeader || 'Authorization';
      if (headerName === 'Authorization' && !this.config.apiKey.startsWith('Bearer ')) {
        headers[headerName] = `Bearer ${this.config.apiKey}`;
      } else {
        headers[headerName] = this.config.apiKey;
      }
    } else {
      headers['Authorization'] = 'Bearer ollama';
    }

    this.client = axios.create({
      baseURL: this.resolvedApiUrl,
      headers,
      timeout: 30000,
    });
  }

  private hasUserPassAuth(): boolean {
    return !!(this.config.username && this.config.password);
  }
>>>>>>> origin/main

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = []
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const messages = [
<<<<<<< HEAD
      ...historyMessages.map((msg) => ({ role: 'user', content: msg.getText() })),
=======
      ...historyMessages.map((msg) => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.content,
      })),
>>>>>>> origin/main
      { role: 'user', content: userMessage },
    ];

    try {
<<<<<<< HEAD
      const response = await openWebUIClient.post('/chat/completions', {
        model,
        messages,
      });

      return response.data.choices[0].message.content;
=======
      let reqConfig: any = {};
      if (this.hasUserPassAuth()) {
        const sessionKey = await this.getSessionKey();
        reqConfig = {
          headers: {
            Authorization: `Bearer ${sessionKey}`,
          },
        };
      }

      const response = await this.client.post(
        '/chat/completions',
        {
          model: metadata?.modelOverride || metadata?.model || this.model,
          messages,
        },
        reqConfig
      );

      return response.data?.choices?.[0]?.message?.content || '';
>>>>>>> origin/main
    } catch (error) {
      debug('Error generating chat completion:', error);

      if (this.hasUserPassAuth() && axios.isAxiosError(error) && error.response?.status === 401) {
        debug('Session key may be expired, clearing it and will retry on next request');
        this.sessionKey = null;
      }

      throw new Error(`OpenWebUI API error: ${this.getErrorMessage(error)}`);
    }
  },

  async generateCompletion(prompt: string): Promise<string> {
<<<<<<< HEAD
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    try {
      const response = await openWebUIClient.post('/completions', {
        model,
        prompt,
        max_tokens: 100,
      });
=======
    debug('Generating text completion with OpenWebUI', { promptLength: prompt.length });

    try {
      let reqConfig: any = {};
      if (this.hasUserPassAuth()) {
        const sessionKey = await this.getSessionKey();
        reqConfig = {
          headers: {
            Authorization: `Bearer ${sessionKey}`,
          },
        };
      }

      const response = await this.client.post(
        '/completions',
        {
          model: this.model,
          prompt,
          max_tokens: 100,
        },
        reqConfig
      );
>>>>>>> origin/main

      return response.data.choices[0].text;
    } catch (error) {
      debug('Error generating non-chat completion:', error);

      if (this.hasUserPassAuth() && axios.isAxiosError(error) && error.response?.status === 401) {
        this.sessionKey = null;
      }

      throw new Error(`OpenWebUI API error: ${this.getErrorMessage(error)}`);
    }
<<<<<<< HEAD
  },
};

/**
 * Safely extracts the error message.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
=======
  }

  private async getSessionKey(): Promise<string> {
    if (this.sessionKey) return this.sessionKey;

    if (!this.hasUserPassAuth()) {
      throw new Error('Username and password are required to obtain a session key');
    }

    try {
      let reqConfig: any = {};
      if (this.hasUserPassAuth()) {
        const sessionKey = await this.getSessionKey();
        reqConfig = {
          headers: {
            Authorization: `Bearer ${sessionKey}`,
          },
        };
      }

      const response = await this.client.post(
        '/completions',
        {
          model: this.model,
          prompt,
          max_tokens: 100,
        },
        reqConfig
      );

      return response.data?.choices?.[0]?.text || '';
    } catch (error) {
      debug('Error generating non-chat completion:', error);

      if (this.hasUserPassAuth() && axios.isAxiosError(error) && error.response?.status === 401) {
        this.sessionKey = null;
      }

      throw new Error(`OpenWebUI API error: ${this.getErrorMessage(error)}`);
    }
>>>>>>> origin/main
  }

<<<<<<< HEAD
/**
 * Formats the error for debugging purposes.
 */
function formatError(error: unknown): any {
  if (axios.isAxiosError(error)) {
=======
  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return true;
  }

  private getErrorMessage(error: any): string {
    if (!axios.isAxiosError(error)) {
      return error.message;
    }

    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }

    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }

>>>>>>> origin/main
    return error.response?.data || error.message;
  }
}
