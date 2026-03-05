import axios, { AxiosInstance } from 'axios';
import Debug from 'debug';
import type { IMessage } from '@src/message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import openWebUIConfig from './openWebUIConfig';

const debug = Debug('app:openWebUIProvider');

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
    const rawApiUrl = this.config.apiUrl || openWebUIConfig.get('apiUrl') || 'http://localhost:3000/api/';
    this.resolvedApiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
    this.model = this.config.model || openWebUIConfig.get('model');

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      const headerName = this.config.authHeader || 'Authorization';
      if (headerName.toLowerCase() === 'authorization' && !this.config.apiKey.toLowerCase().startsWith('bearer ')) {
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
      timeout: 15000,
    });
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return true;
  }

  private hasUserPassAuth(): boolean {
    const username = this.config.username || openWebUIConfig.get('username');
    const password = this.config.password || openWebUIConfig.get('password');
    return !!(username && password && !this.config.apiKey);
  }

  private async getSessionKey(): Promise<string> {
    if (this.sessionKey) {
      return this.sessionKey;
    }

    const username = this.config.username || openWebUIConfig.get('username');
    const password = this.config.password || openWebUIConfig.get('password');

    if (!username || !password) {
      throw new Error('Authentication required: apiKey or username/password must be provided.');
    }

    debug('Requesting new session key for:', username);

    try {
      const url = this.resolvedApiUrl + '/auth/login';
      const response = await axios.post(
        url,
        { username, password },
        { timeout: 15000 }
      );
      this.sessionKey = response.data.sessionKey || response.data.token;

      if (!this.sessionKey) {
        throw new Error('Failed to obtain a valid session key.');
      }

      debug('New session key obtained');
      return this.sessionKey;
    } catch (error) {
      debug('Failed to obtain session key:', error);
      throw new Error('Authentication failed');
    }
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const messages = [
      ...historyMessages.map((msg) => ({ role: (msg as any).role || 'user', content: msg.getText() })),
      { role: 'user', content: userMessage },
    ];

    try {
      let reqConfig = {};
      if (this.hasUserPassAuth()) {
        const sessionKey = await this.getSessionKey();
        reqConfig = {
          headers: {
            Authorization: `Bearer ${sessionKey}`
          }
        };
      }

      const response = await this.client.post('/chat/completions', {
        model: metadata?.modelOverride || metadata?.model || this.model,
        messages,
      }, reqConfig);

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    try {
      let reqConfig = {};
      if (this.hasUserPassAuth()) {
        const sessionKey = await this.getSessionKey();
        reqConfig = {
          headers: {
            Authorization: `Bearer ${sessionKey}`
          }
        };
      }

      const response = await this.client.post('/completions', {
        model: this.model,
        prompt,
        max_tokens: 100,
      }, reqConfig);

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
