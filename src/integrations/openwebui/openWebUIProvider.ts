import axios, { type AxiosInstance } from 'axios';
import Debug from 'debug';
import openWebUIConfig from '../../config/openWebUIConfig';
import type { ILlmProvider } from '../../llm/interfaces/ILlmProvider';
import type { IMessage } from '../../message/interfaces/IMessage';

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

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const messages = [
      ...historyMessages.map((msg) => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

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
        '/chat/completions',
        {
          model: metadata?.modelOverride || metadata?.model || this.model,
          messages,
        },
        reqConfig
      );

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error) {
      debug('Error generating chat completion:', error);

      if (this.hasUserPassAuth() && axios.isAxiosError(error) && error.response?.status === 401) {
        debug('Session key may be expired, clearing it and will retry on next request');
        this.sessionKey = null;
      }

      throw new Error(`OpenWebUI API error: ${this.getErrorMessage(error)}`);
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
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

      return response.data?.choices?.[0]?.text || '';
    } catch (error) {
      debug('Error generating non-chat completion:', error);

      if (this.hasUserPassAuth() && axios.isAxiosError(error) && error.response?.status === 401) {
        this.sessionKey = null;
      }

      throw new Error(`OpenWebUI API error: ${this.getErrorMessage(error)}`);
    }
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
  }

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

    return error.response?.data || error.message;
  }
}
