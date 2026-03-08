import Debug from 'debug';
import Letta from '@letta-ai/letta-client';
import type { IMessage } from '@message/interfaces/IMessage';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';

const debug = Debug('app:lettaProvider');

export interface LettaProviderConfig {
  agentId?: string;
  systemPrompt?: string;
  sessionMode?: 'default' | 'per-channel' | 'per-user' | 'fixed';
  conversationId?: string;
}

export class LettaProvider implements ILlmProvider {
  name = 'letta';
  private static instance: LettaProvider;
  private client: Letta;
  private config: LettaProviderConfig;
  private conversationCache = new Map<string, string>(); // contextKey → conv-* id

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
  supportsHistory(): boolean { return false; }

  /**
   * Resolve the conversation ID based on session mode and metadata.
   * Returns 'default' for the built-in default conversation, or a conv-* ID.
   */
  private async resolveConversationId(
    agentId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const sessionMode = this.config.sessionMode || 'default';

    switch (sessionMode) {
      case 'default':
      case undefined:
        return 'default';

      case 'fixed':
        return this.config.conversationId || 'default';

      case 'per-channel': {
        const channelId = metadata?.channelId;
        if (!channelId) {
          debug('per-channel mode but no channelId provided, falling back to default');
          return 'default';
        }
        return this.getOrCreateConversation(agentId, `channel-${channelId}`);
      }

      case 'per-user': {
        const userId = metadata?.userId;
        if (!userId) {
          debug('per-user mode but no userId provided, falling back to default');
          return 'default';
        }
        return this.getOrCreateConversation(agentId, `user-${userId}`);
      }

      default:
        return 'default';
    }
  }

  /**
   * Get or create a conversation with the given key (used as summary).
   * Returns the conversation ID (conv-* format).
   */
  private async getOrCreateConversation(agentId: string, key: string): Promise<string> {
    // Check cache first
    const cached = this.conversationCache.get(key);
    if (cached) {
      return cached;
    }

    try {
      const clientAny = this.client as any;

      // Try to list existing conversations and find by summary
      const existing = await clientAny.conversations?.list?.({ agent_id: agentId });
      if (existing && Array.isArray(existing)) {
        const match = existing.find((conv: any) => conv.summary === key);
        if (match?.id) {
          debug('Found existing conversation for key %s: %s', key, match.id);
          this.conversationCache.set(key, match.id);
          return match.id;
        }
      }

      // Create new conversation
      const created = await clientAny.conversations?.create?.({
        agent_id: agentId,
        summary: key,
      });

      if (created?.id) {
        debug('Created new conversation for key %s: %s', key, created.id);
        this.conversationCache.set(key, created.id);
        return created.id;
      }

      debug('Failed to create conversation for key %s, falling back to default', key);
      return 'default';
    } catch (error) {
      debug('Error getting/creating conversation for key %s: %s', key, error);
      return 'default';
    }
  }

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

    // Resolve conversation ID based on session mode
    const convId = await this.resolveConversationId(agentId, metadata);

    debug('Sending to Letta agent %s, conversation %s: %s', agentId, convId, input.substring(0, 100));

    // Use default conversation API (backward compatible) or conversation-specific API
    if (convId === 'default') {
      // Use existing agents.messages.create for default conversation
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
    } else {
      // Use conversations.messages.create for specific conversations
      const clientAny = this.client as any;
      const response = await clientAny.conversations.messages.create(convId, {
        agent_id: agentId,
        messages: [{ role: 'user', content: input }],
      });

      // Extract assistant response from conversation API response
      const messages = response?.messages || [];
      const assistantMsg = [...messages]
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
  }

  async generateCompletion(_prompt: string): Promise<string> {
    throw new Error('Letta provider does not support non-chat completion.');
  }
}
