import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { LLMResponse } from '@llm/interfaces/LLMResponse';
import axios from 'axios';

export class OpenSwarmProvider implements ILlmProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.OPENSWARM_BASE_URL || 'http://localhost:8000/v1';
    this.apiKey = process.env.OPENSWARM_API_KEY || 'dummy-key';
  }

  async generateChatCompletion(
    message: string,
    conversationHistory: any[],
    options: any = {}
  ): Promise<string> {
    try {
      const teamName = options.team || options.model || 'default-team';
      
      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: teamName,
        messages: [
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        ...options
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0]?.message?.content || 'No response';
    } catch (error: any) {
      console.error('OpenSwarm API error:', error.message);
      return `Error: ${error.message}`;
    }
  }

  async generateCompletion(prompt: string, options: any = {}): Promise<LLMResponse> {
    const content = await this.generateChatCompletion(prompt, [], options);
    return new LLMResponse(content, { provider: 'openswarm', team: options.team });
  }
}