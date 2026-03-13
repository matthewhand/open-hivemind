import axios from 'axios';
import { isSafeUrl } from '@hivemind/shared-types';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { LLMResponse } from '@llm/interfaces/LLMResponse';
import type { IMessage } from '@message/interfaces/IMessage';

export class OpenSwarmProvider implements ILlmProvider {
  name = 'openswarm';

  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.OPENSWARM_BASE_URL || 'http://localhost:8000/v1';
    this.apiKey = process.env.OPENSWARM_API_KEY || 'dummy-key';
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return true;
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: any[],
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const teamName = metadata?.team || metadata?.model || 'default-team';
      const targetUrl = `${this.baseUrl}/chat/completions`;

      if (!(await isSafeUrl(targetUrl))) {
        throw new Error('OpenSwarm API URL is not safe to connect to.');
      }

      const response = await axios.post(
        targetUrl,
        {
          model: teamName,
          messages: [...historyMessages, { role: 'user', content: userMessage }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return response.data.choices[0]?.message?.content || 'No response';
    } catch (error: any) {
      console.error('OpenSwarm API error:', error.message);
      return `Error: ${error.message}`;
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    const content = await this.generateChatCompletion(prompt, [], {});
    return content;
  }

  async validateCredentials(): Promise<boolean> {
    // Check if API key is set and not the default dummy value if strict validation is needed.
    // However, user might use a local instance without auth.
    // For now, just return true if baseUrl is set.
    return !!this.baseUrl;
  }

  async generateResponse(message: IMessage, context?: IMessage[]): Promise<string> {
    return this.generateChatCompletion(message.getText(), context || [], message.metadata);
  }
}
