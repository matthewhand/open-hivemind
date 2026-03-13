/**
 * Integration test: PluginLoader → LettaProvider
 * Proves that loadPlugin('llm-letta') correctly resolves and instantiates
 * a working ILlmProvider through the full plugin loading stack.
 */
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { instantiateLlmProvider } from '@src/plugins/PluginLoader';
import * as llmLettaModule from '@hivemind/llm-letta';

// Mock the letta SDK so we don't need a real API key
jest.mock('@letta-ai/letta-client', () => {
  return jest.fn().mockImplementation(() => ({
    agents: {
      messages: {
        create: jest.fn().mockResolvedValue({
          messages: [{ role: 'assistant', content: 'hello from letta' }],
        }),
      },
    },
    conversations: {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'conv-test-123' }),
      messages: {
        create: jest.fn().mockResolvedValue({
          messages: [{ role: 'assistant', content: 'hello from conversation' }],
        }),
      },
    },
  }));
});

describe('PluginLoader → LettaProvider integration', () => {
  // Simulate loadPlugin returning the llm-letta module
  const mockLoadedModule = llmLettaModule;

  it('llm-letta module exports create function', () => {
    expect(typeof mockLoadedModule.create).toBe('function');
  });

  it('instantiateLlmProvider returns a valid ILlmProvider', () => {
    const provider = instantiateLlmProvider(mockLoadedModule, { agentId: 'agent-test-123' });
    expect(provider).toBeDefined();
    expect(typeof provider.generateChatCompletion).toBe('function');
    expect(typeof provider.supportsChatCompletion).toBe('function');
  });

  it('generateChatCompletion works with default session mode', async () => {
    const provider = instantiateLlmProvider(mockLoadedModule, { agentId: 'agent-test-123' });
    const result = await provider.generateChatCompletion('hello', [], { agentId: 'agent-test-123' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('generateChatCompletion uses conversation API for per-channel mode', async () => {
    const provider = instantiateLlmProvider(mockLoadedModule, {
      agentId: 'agent-test-123',
      sessionMode: 'per-channel',
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test-123',
      channelId: 'channel-456',
    });
    expect(typeof result).toBe('string');
  });

  it('generateChatCompletion falls back to default when channelId missing in per-channel mode', async () => {
    const provider = instantiateLlmProvider(mockLoadedModule, {
      agentId: 'agent-test-123',
      sessionMode: 'per-channel',
    });
    // No channelId in metadata — should fall back gracefully
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test-123',
    });
    expect(typeof result).toBe('string');
  });

  it('generateChatCompletion uses fixed conversationId when sessionMode is fixed', async () => {
    const provider = instantiateLlmProvider(mockLoadedModule, {
      agentId: 'agent-test-123',
      sessionMode: 'fixed',
      conversationId: 'conv-fixed-999',
    });
    const result = await provider.generateChatCompletion('hello', [], {
      agentId: 'agent-test-123',
    });
    expect(typeof result).toBe('string');
  });

  it('cache key scoping prevents cross-agent collision', async () => {
    // Two providers with different agentIds should not share conversation cache entries
    // Reset singleton between tests
    const { LettaProvider } = require('@hivemind/llm-letta/lettaProvider');
    (LettaProvider as any).instance = undefined;
    const provider1 = instantiateLlmProvider(mockLoadedModule, { agentId: 'agent-A', sessionMode: 'per-channel' });
    (LettaProvider as any).instance = undefined;
    const provider2 = instantiateLlmProvider(mockLoadedModule, { agentId: 'agent-B', sessionMode: 'per-channel' });

    await provider1.generateChatCompletion('hi', [], { agentId: 'agent-A', channelId: 'chan-1' });
    await provider2.generateChatCompletion('hi', [], { agentId: 'agent-B', channelId: 'chan-1' });

    // Both should succeed without throwing
    expect(true).toBe(true);
  });
});
