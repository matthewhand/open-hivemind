import axios, { AxiosInstance } from 'axios';
import Debug from 'debug';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
import lettaConfig from './lettaConfig';

const debug = Debug('app:lettaProvider');

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

export interface LettaProviderConfig {
  apiUrl?: string;
  apiKey?: string;
  agentId?: string;
  timeout?: number;
}

export interface LettaAgent {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LettaMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at?: string;
}

export class LettaProvider implements ILlmProvider {
  name = 'letta';
  private static instance: LettaProvider;
  private client: AxiosInstance;
  private config: LettaProviderConfig;
  private resolvedApiUrl: string;

  private constructor(config?: LettaProviderConfig) {
    this.config = config || {};
    const rawApiUrl = this.config.apiUrl || lettaConfig.get('apiUrl') || 'https://api.letta.com/v1';
    this.resolvedApiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

    const apiKey = this.config.apiKey || lettaConfig.get('apiKey');
    const timeout = this.config.timeout || lettaConfig.get('timeout') || 30000;

    if (!apiKey) {
      debug('Warning: No API key provided for Letta provider');
    }

    this.client = axios.create({
      baseURL: this.resolvedApiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      timeout,
    });
  }

  static getInstance(config?: LettaProviderConfig): LettaProvider {
    if (!LettaProvider.instance) {
      LettaProvider.instance = new LettaProvider(config);
    }
    return LettaProvider.instance;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const isRetryable =
          axios.isAxiosError(error) &&
          (error.response?.status === undefined || // network error
            error.response.status === 429 ||
            error.response.status >= 500);
        if (!isRetryable || attempt === MAX_RETRIES - 1) break;
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        debug(`Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return false;
  }

  async listAgents(): Promise<LettaAgent[]> {
    debug('Listing Letta agents');
    try {
      const response = await this.retryWithBackoff(() => this.client.get('/agents'));
      return response.data || [];
    } catch (error) {
      debug('Error listing agents:', formatError(error));
      throw new Error(`Failed to list agents: ${getErrorMessage(error)}`);
    }
  }

  async getFirstAgentId(): Promise<string | null> {
    try {
      const agents = await this.listAgents();
      return agents.length > 0 ? agents[0].id : null;
    } catch (error) {
      debug('Error getting first agent:', error);
      return null;
    }
  }

  async sendMessage(
    agentId: string,
    message: string,
    role: 'user' | 'system' = 'user'
  ): Promise<string> {
    debug('Sending message to Letta agent:', { agentId, message: message.substring(0, 100) });
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.post(`/agents/${agentId}/messages`, {
          messages: [{ role, content: message }],
        })
      );
      const messages: LettaMessage[] = response.data?.messages || response.data || [];
      const assistantMsg = [...messages]
        .reverse()
        .find((m: LettaMessage) => m.role === 'assistant' && m.content);
      return assistantMsg?.content || '';
    } catch (error) {
      debug('Error sending message:', formatError(error));
      throw new Error(`Failed to send message: ${getErrorMessage(error)}`);
    }
  }

  async getMessages(agentId: string, limit = 50): Promise<LettaMessage[]> {
    debug('Getting messages for agent:', { agentId, limit });
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/agents/${agentId}/messages`, { params: { limit } })
      );
      return response.data || [];
    } catch (error) {
      debug('Error getting messages:', formatError(error));
      throw new Error(`Failed to get messages: ${getErrorMessage(error)}`);
    }
  }

  async generateChatCompletion(
    userMessage: string,
    _historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    const agentId = metadata?.agentId || this.config.agentId || lettaConfig.get('agentId');

    if (!agentId) {
      throw new Error(
        'No agent ID provided. Configure LETTA_AGENT_ID or pass agentId in metadata.'
      );
    }

    debug('Generating chat completion with Letta:', {
      agentId,
      userMessage: userMessage.substring(0, 100),
    });

    try {
      return await this.sendMessage(agentId, userMessage, 'user');
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  }

  async generateCompletion(_prompt: string): Promise<string> {
    throw new Error(
      'Letta provider does not support non-chat completion. Use generateChatCompletion instead.'
    );
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatError(error: unknown): any {
  if (axios.isAxiosError(error)) {
    return { status: error.response?.status, data: error.response?.data, message: error.message };
  }
  return getErrorMessage(error);
}
