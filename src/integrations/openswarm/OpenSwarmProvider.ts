import axios from 'axios';
import { isSafeUrl } from '@src/utils/ssrfGuard';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';

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
}
