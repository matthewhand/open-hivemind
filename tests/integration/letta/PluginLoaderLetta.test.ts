/**
 * PluginLoader → LettaProvider Integration Tests
 *
 * Tests the full plugin loading stack: PluginLoader.instantiateLlmProvider
 * → LettaProvider creation, session modes, conversation routing, cache
 * isolation, and error handling.
 *
 * This replaces the old 113-line file where the critical "cache key scoping"
 * test asserted `expect(true).toBe(true)` — a tautological assertion that
 * proved nothing about cross-agent cache collision.
 */
import * as llmLettaModule from '@hivemind/llm-letta';
import { instantiateLlmProvider } from '@src/plugins/PluginLoader';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';

// Mock the letta SDK
const mockCreateMessages = jest.fn();
const mockListConversations = jest.fn();
const mockCreateConversation = jest.fn();
const mockCreateConvMessages = jest.fn();

jest.mock('@letta-ai/letta-client', () => {
  return jest.fn().mockImplementation(() => ({
    agents: {
      messages: {
        create: mockCreateMessages,
      },
    },
    conversations: {
      list: mockListConversations,
      create: mockCreateConversation,
      messages: {
        create: mockCreateConvMessages,
      },
    },
  }));
});

function resetLettaSingleton() {
  const { LettaProvider } = require('@hivemind/llm-letta/lettaProvider');
  (LettaProvider as any).instance = undefined;
}

function clearMockCalls() {
  mockCreateMessages.mockReset();
  mockListConversations.mockReset();
  mockCreateConversation.mockReset();
  mockCreateConvMessages.mockReset();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginLoader → LettaProvider integration', () => {
  beforeEach(() => {
    resetLettaSingleton();
    clearMockCalls();
  });

  // ---- Module Structure ----

  it('llm-letta module exports create function', () => {
    expect(typeof llmLettaModule.create).toBe('function');
  });

  it('instantiateLlmProvider returns a valid ILlmProvider', () => {
    const provider = instantiateLlmProvider(llmLettaModule, { agentId: 'agent-test' });
    expect(provider).toBeDefined();
    expect(typeof provider.generateChatCompletion).toBe('function');
    expect(typeof provider.supportsChatCompletion).toBe('function');
    expect(provider.supportsChatCompletion()).toBe(true);
    expect(provider.supportsCompletion()).toBe(false);
    expect(provider.supportsHistory()).toBe(false);
  });

  // ---- Default Session Mode ----

  it('generateChatCompletion works with default session mode', async () => {
    mockCreateMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'hello from letta' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, { agentId: 'agent-test' });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
    });

    expect(result).toBe('hello from letta');
    // SDK call: client.agents.messages.create(agentId, body)
    expect(mockCreateMessages).toHaveBeenCalledWith(
      'agent-test',
      expect.anything()
    );
  });

  it('should prepend system prompt when provided', async () => {
    mockCreateMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'response' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, { agentId: 'agent-test' });
    await provider.generateChatCompletion('user message', [], {
      agentId: 'agent-test',
      systemPrompt: 'You are helpful.',
    });

    // The SDK call uses `input` field (not `message`)
    expect(mockCreateMessages).toHaveBeenCalledWith(
      'agent-test',
      expect.objectContaining({
        input: expect.stringContaining('You are helpful.'),
      })
    );
  });

  // ---- Per-Channel Mode ----

  it('should list existing conversations and reuse a matching one', async () => {
    mockListConversations.mockResolvedValue([
      { id: 'conv-existing-123', summary: 'channel-456' },
    ]);
    mockCreateConvMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'reused' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'per-channel',
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
      channelId: '456',
    });

    expect(result).toBe('reused');
    // Should NOT have called create conversation since one exists
    expect(mockCreateConversation).not.toHaveBeenCalled();
    // SDK call signature is: client.conversations.messages.create(conversationId, body)
    expect(mockCreateConvMessages).toHaveBeenCalledWith(
      'conv-existing-123',
      expect.anything()
    );
  });

  it('should create a new conversation when none exists', async () => {
    mockListConversations.mockResolvedValue([]);
    mockCreateConversation.mockResolvedValue({ id: 'conv-new-789' });
    mockCreateConvMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'new conv' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'per-channel',
    });
    await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
      channelId: 'new-channel',
    });

    expect(mockCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: 'agent-test',
        summary: 'channel-new-channel',
      })
    );
  });

  it('should fall back to default when channelId is missing in per-channel mode', async () => {
    mockCreateMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'fallback' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'per-channel',
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
    });

    expect(result).toBe('fallback');
    // Should use default API, not conversation API
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });

  // ---- Fixed Conversation Mode ----

  it('should use the configured conversationId in fixed mode', async () => {
    mockCreateConvMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'fixed response' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'fixed',
      conversationId: 'conv-fixed-999',
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
    });

    expect(result).toBe('fixed response');
    // SDK call: client.conversations.messages.create(conversationId, body)
    expect(mockCreateConvMessages).toHaveBeenCalledWith(
      'conv-fixed-999',
      expect.anything()
    );
  });

  it('should fall back to default when conversationId is missing in fixed mode', async () => {
    mockCreateMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'default fallback' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'fixed',
      // No conversationId
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
    });

    expect(result).toBe('default fallback');
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });

  // ---- Per-User Mode ----

  it('should create per-user conversations', async () => {
    mockListConversations.mockResolvedValue([]);
    mockCreateConversation.mockResolvedValue({ id: 'conv-user-123' });
    mockCreateConvMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'user response' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'per-user',
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
      userId: 'user-42',
    });

    expect(result).toBe('user response');
    // SDK call: client.conversations.create(agentId, body) — single object arg
    expect(mockCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: 'agent-test',
        summary: 'user-user-42',
      })
    );
  });

  it('should fall back to default when userId is missing in per-user mode', async () => {
    mockCreateMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'no user fallback' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'per-user',
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
    });

    expect(result).toBe('no user fallback');
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });

  // ---- Cache Key Scoping (was the tautological expect(true) test) ----

  it('should scope conversation cache per-agent to prevent cross-agent collision', async () => {
    // Track which agent_id each conversation creation uses
    const createdConvs: Array<{ agent_id: string; summary: string }> = [];
    mockCreateConversation.mockImplementation((args: any) => {
      createdConvs.push({ agent_id: args.agent_id, summary: args.summary });
      return Promise.resolve({ id: `conv-${args.summary}` });
    });
    mockCreateConvMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'ok' }],
    });
    mockListConversations.mockResolvedValue([]);

    // Agent A, channel 1
    resetLettaSingleton();
    const providerA = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-A',
      sessionMode: 'per-channel',
    });
    await providerA.generateChatCompletion('hi', [], {
      agentId: 'agent-A',
      channelId: 'chan-1',
    });

    // Agent B, same channel name
    resetLettaSingleton();
    const providerB = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-B',
      sessionMode: 'per-channel',
    });
    await providerB.generateChatCompletion('hi', [], {
      agentId: 'agent-B',
      channelId: 'chan-1',
    });

    // Verify two separate conversations were created with different agent IDs
    expect(mockCreateConversation).toHaveBeenCalledTimes(2);
    expect(createdConvs[0].agent_id).toBe('agent-A');
    expect(createdConvs[1].agent_id).toBe('agent-B');
    expect(createdConvs[0].summary).toBe('channel-chan-1');
    expect(createdConvs[1].summary).toBe('channel-chan-1');
  });

  // ---- Error Handling ----

  it('should throw when no agent ID is provided', async () => {
    const provider = instantiateLlmProvider(llmLettaModule, { agentId: undefined as any });

    await expect(
      provider.generateChatCompletion('hello', [], {})
    ).rejects.toThrow('No agent ID provided');
  });

  it('should handle SDK errors gracefully and fall back to default conversation', async () => {
    mockListConversations.mockRejectedValue(new Error('Network error'));
    mockCreateConversation.mockRejectedValue(new Error('Network error'));
    mockCreateMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'fallback after error' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'per-channel',
    });

    // Should not throw — falls back to default conversation API
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test',
      channelId: 'chan-1',
    });
    expect(result).toBe('fallback after error');
  });

  it('should cache conversation IDs to avoid redundant lookups', async () => {
    mockListConversations.mockResolvedValue([]);
    mockCreateConversation.mockResolvedValue({ id: 'conv-cached-123' });
    mockCreateConvMessages.mockResolvedValue({
      messages: [{ role: 'assistant', content: 'cached' }],
    });

    const provider = instantiateLlmProvider(llmLettaModule, {
      agentId: 'agent-test',
      sessionMode: 'per-channel',
    });

    // First call — creates conversation
    await provider.generateChatCompletion('hello 1', [], {
      agentId: 'agent-test',
      channelId: 'chan-1',
    });
    expect(mockCreateConversation).toHaveBeenCalledTimes(1);

    // Second call — should use cached conversation ID
    await provider.generateChatCompletion('hello 2', [], {
      agentId: 'agent-test',
      channelId: 'chan-1',
    });
    // Still only 1 creation call because the ID is cached
    expect(mockCreateConversation).toHaveBeenCalledTimes(1);
  });
});
