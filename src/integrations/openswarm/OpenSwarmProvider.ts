import axios from 'axios';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
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

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
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
    try {
      // Check if the base URL is reachable
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async generateResponse(message: IMessage, context?: IMessage[]): Promise<string> {
    return this.generateChatCompletion(message.getText(), context || [], message.metadata);
  }
}
