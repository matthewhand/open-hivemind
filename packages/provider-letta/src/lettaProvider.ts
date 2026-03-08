import Debug from 'debug';
import Letta from '@letta-ai/letta-client';
import type { IMessage } from '@message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';

const debug = Debug('app:lettaProvider');

export interface LettaProviderConfig {
  agentId?: string;
  systemPrompt?: string;
}

export class LettaProvider implements ILlmProvider {
  name = 'letta';
  private static instance: LettaProvider;
  private client: Letta;
  private config: LettaProviderConfig;

  private constructor(config?: LettaProviderConfig) {
    this.config = config || {};
    // SDK auto-reads LETTA_API_KEY and LETTA_BASE_URL from env
    this.client = new Letta();
  }

  static getInstance(config?: LettaProviderConfig): LettaProvider {
    if (!LettaProvider.instance) {
      LettaProvider.instance = new LettaProvider(config);
    }
    return LettaProvider.instance;
  }

  supportsChatCompletion(): boolean { return true; }
  supportsCompletion(): boolean { return false; }

  async generateChatCompletion(
    userMessage: string,
    _historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    const agentId = metadata?.agentId || this.config.agentId || process.env.LETTA_AGENT_ID;
    if (!agentId) {
      throw new Error('No agent ID provided. Set BOTS_{name}_LETTA_AGENT_ID or LETTA_AGENT_ID.');
    }

    const systemPrompt: string | undefined = metadata?.systemPrompt || this.config.systemPrompt;
    const input = systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage;

    debug('Sending to Letta agent %s: %s', agentId, input.substring(0, 100));

    const response = await this.client.agents.messages.create(agentId, { input });

    const assistantMsg = [...response.messages]
      .reverse()
      .find((m: any) => m.role === 'assistant' && m.content);

    const content = (assistantMsg as any)?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const text = content.find((c: any) => c.type === 'text');
      return (text as any)?.text || '';
    }
    return '';
  }

  async generateCompletion(_prompt: string): Promise<string> {
    throw new Error('Letta provider does not support non-chat completion.');
  }
}
