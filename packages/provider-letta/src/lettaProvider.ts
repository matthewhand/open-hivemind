import axios, { AxiosInstance } from 'axios';
import Debug from 'debug';
import type { IMessage } from '@message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import lettaConfig from './lettaConfig';

const debug = Debug('app:lettaProvider');

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
  private client: AxiosInstance;
  private config: LettaProviderConfig;
  private resolvedApiUrl: string;

  constructor(config?: LettaProviderConfig) {
    this.config = config || {};
    const rawApiUrl =
      this.config.apiUrl || lettaConfig.get('apiUrl') || 'https://api.letta.com/v1';
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
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      timeout,
    });
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return false; // Letta uses chat-based messaging
  }

  /**
   * List available agents from the Letta API
   */
  async listAgents(): Promise<LettaAgent[]> {
    debug('Listing Letta agents');
    try {
      const response = await this.client.get('/agents');
      return response.data || [];
    } catch (error) {
      debug('Error listing agents:', formatError(error));
      throw new Error(`Failed to list agents: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get the first available agent ID (useful for auto-configuration)
   */
  async getFirstAgentId(): Promise<string | null> {
    try {
      const agents = await this.listAgents();
      if (agents.length > 0) {
        return agents[0].id;
      }
      return null;
    } catch (error) {
      debug('Error getting first agent:', error);
      return null;
    }
  }

  /**
   * Send a message to a Letta agent and get the response
   */
  async sendMessage(
    agentId: string,
    message: string,
    role: 'user' | 'system' = 'user'
  ): Promise<string> {
    debug('Sending message to Letta agent:', { agentId, message: message.substring(0, 100) });
    try {
      const response = await this.client.post(`/agents/${agentId}/messages`, {
        messages: [{ role, content: message }],
      });
      // Response is array of messages; find last assistant message
      const messages: LettaMessage[] = response.data?.messages || response.data || [];
      const assistantMsg = [...messages].reverse().find(
        (m: LettaMessage) => m.role === 'assistant' && m.content
      );
      return assistantMsg?.content || '';
    } catch (error) {
      debug('Error sending message:', formatError(error));
      throw new Error(`Failed to send message: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get conversation history for an agent
   */
  async getMessages(agentId: string, limit: number = 50): Promise<LettaMessage[]> {
    debug('Getting messages for agent:', { agentId, limit });
    try {
      const response = await this.client.get(`/agents/${agentId}/messages`, {
        params: { limit },
      });
      return response.data || [];
    } catch (error) {
      debug('Error getting messages:', formatError(error));
      throw new Error(`Failed to get messages: ${getErrorMessage(error)}`);
    }
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    const agentId = metadata?.agentId || this.config.agentId || lettaConfig.get('agentId');
    
    if (!agentId) {
      throw new Error('No agent ID provided. Please configure an agent ID or use the lookup feature to find available agents.');
    }

    debug('Generating chat completion with Letta:', { agentId, userMessage: userMessage.substring(0, 100) });

    try {
      return await this.sendMessage(agentId, userMessage, 'user');
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  }

  async generateCompletion(_prompt: string): Promise<string> {
    throw new Error('Letta provider does not support non-chat completion. Use generateChatCompletion instead.');
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
    return {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    };
  }
  return getErrorMessage(error);
}
