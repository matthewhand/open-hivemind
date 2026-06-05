import Debug from 'debug';
import type { ILlmProvider, IMessage } from '@hivemind/shared-types';
import Letta from '@letta-ai/letta-client';

const debug = Debug('app:lettaProvider');

export interface LettaProviderConfig {
  agentId?: string;
  systemPrompt?: string;
  sessionMode?: 'default' | 'per-channel' | 'per-user' | 'fixed';
  conversationId?: string;
}

/**
 * Minimal structural type for a Letta conversation. The SDK ships a richer
 * `Conversation` type, but we only depend on `id` and `summary`; declaring our
 * own surface keeps the provider resilient to non-breaking SDK shape changes.
 */
interface LettaConversation {
  id: string;
  summary?: string | null;
}

/**
 * The conversations sub-API we rely on for non-default session modes. Older
 * SDK versions (or stubbed/self-hosted servers) may not expose `list`/`create`.
 * We detect this at runtime via {@link getConversationsApi} rather than assuming
 * the methods exist.
 */
interface LettaConversationsApi {
  list?: (query: { agent_id: string }) => Promise<LettaConversation[] | undefined>;
  create?: (body: { agent_id: string; summary: string }) => Promise<LettaConversation | undefined>;
}

/**
 * Runtime capability check: returns the typed conversations API only when both
 * `list` and `create` are callable. Returns null when the SDK build in use does
 * not support session modes, so callers can surface (debug) the degradation
 * instead of silently behaving as if creation merely "failed".
 */
function getConversationsApi(client: Letta): LettaConversationsApi | null {
  const api = (client as unknown as { conversations?: LettaConversationsApi }).conversations;
  if (api && typeof api.list === 'function' && typeof api.create === 'function') {
    return api;
  }
  return null;
}

export class LettaProvider implements ILlmProvider {
  name = 'letta';
  private client: Letta;
  private config: LettaProviderConfig;
  private conversationCache = new Map<string, string>(); // contextKey → conv-* id

  constructor(config?: LettaProviderConfig) {
    this.config = config || {};
    // Uses LETTA_SERVER_PASSWORD for both cloud and self-hosted auth
    this.client = new Letta({
      apiKey: process.env.LETTA_SERVER_PASSWORD,
    });
  }

  /**
   * Back-compat factory. A new provider is returned for each call so that
   * multiple bots with different agentId/session configs stay isolated
   * (the previous singleton honored only the first config supplied).
   */
  static getInstance(config?: LettaProviderConfig): LettaProvider {
    return new LettaProvider(config);
  }

  supportsChatCompletion(): boolean {
    return true;
  }
  supportsCompletion(): boolean {
    return false;
  }
  supportsHistory(): boolean {
    return false;
  }

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
        return this.getOrCreateConversation(agentId, `${agentId}:channel-${channelId}`);
      }

      case 'per-user': {
        const userId = metadata?.userId;
        if (!userId) {
          debug('per-user mode but no userId provided, falling back to default');
          return 'default';
        }
        return this.getOrCreateConversation(agentId, `${agentId}:user-${userId}`);
      }

      default:
        return 'default';
    }
  }

  /**
   * Get or create a conversation for the given cache key and human-readable summary.
   * cacheKey includes agentId to prevent cross-agent cache collisions in the singleton.
   * summary is the human-readable name stored in Letta (e.g. 'channel-123', 'user-456').
   */
  private async getOrCreateConversation(agentId: string, cacheKey: string): Promise<string> {
    // Strip agentId prefix from cacheKey to get the human-readable summary
    const summary = cacheKey.includes(':') ? cacheKey.split(':').slice(1).join(':') : cacheKey;

    // Check cache first
    const cached = this.conversationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Detect whether the installed SDK exposes the conversations API. When it
    // does not, surface (debug) the capability gap explicitly instead of
    // treating it as an ordinary create failure — the two are different and a
    // missing API is a deployment/version issue worth diagnosing.
    const conversations = getConversationsApi(this.client);
    if (!conversations) {
      debug(
        'Letta SDK does not expose conversations.list/create; session mode unavailable, ' +
          'falling back to default conversation for key %s',
        cacheKey
      );
      return 'default';
    }

    try {
      // Try to list existing conversations and find by summary
      const existing = await conversations.list?.({ agent_id: agentId });
      if (existing && Array.isArray(existing)) {
        const match = existing.find((conv) => conv.summary === summary);
        if (match?.id) {
          debug('Found existing conversation for key %s: %s', cacheKey, match.id);
          this.conversationCache.set(cacheKey, match.id);
          return match.id;
        }
      }

      // Create new conversation with human-readable summary
      const created = await conversations.create?.({
        agent_id: agentId,
        summary,
      });

      if (created?.id) {
        debug('Created new conversation for key %s: %s', cacheKey, created.id);
        this.conversationCache.set(cacheKey, created.id);
        return created.id;
      }

      debug('Failed to create conversation for key %s, falling back to default', cacheKey);
      return 'default';
    } catch (error) {
      debug('Error getting/creating conversation for key %s: %s', cacheKey, error);
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

    debug(
      'Sending to Letta agent %s, conversation %s: %s',
      agentId,
      convId,
      input.substring(0, 100)
    );

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

  /**
   * Letta is a chat-first (stateful agent) provider and has no dedicated
   * non-chat completion endpoint. Rather than throwing — which breaks any
   * caller that treats completion as a generic single-turn entry point — we
   * map a non-chat completion onto a single-turn chat completion with no
   * history. This mirrors the FlowiseProvider, the other chat-only provider
   * in this repo. The prompt is sent as the user message; the agent's reply
   * is returned as the completion text.
   */
  async generateCompletion(prompt: string): Promise<string> {
    debug('generateCompletion is not natively supported; mapping to a single-turn chat completion.');
    return this.generateChatCompletion(prompt, []);
  }
}
