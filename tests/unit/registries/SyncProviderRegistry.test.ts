/**
 * TDD tests for SyncProviderRegistry — a startup-time registry that loads and
 * validates ALL providers once, then serves sync lookups on the hot path.
 *
 * These tests define the expected behaviour *before* the implementation exists.
 * Run with: npx jest tests/unit/registries/SyncProviderRegistry.test.ts
 */

import type {
  ILlmProvider,
  IMemoryProvider,
  IMessengerService,
  IToolProvider,
} from '@hivemind/shared-types';

// ---------------------------------------------------------------------------
// Mock the plugin loader — prevents real I/O during tests
// ---------------------------------------------------------------------------

jest.mock('@src/plugins/PluginLoader', () => ({
  loadPlugin: jest.fn(),
  instantiateLlmProvider: jest.fn(),
  instantiateMemoryProvider: jest.fn(),
  instantiateToolProvider: jest.fn(),
  instantiateMessageService: jest.fn(),
}));

import {
  loadPlugin,
  instantiateLlmProvider,
  instantiateMemoryProvider,
  instantiateToolProvider,
  instantiateMessageService,
} from '@src/plugins/PluginLoader';

// The module under test — does not exist yet (TDD).
// The import path matches the interface spec in the ticket.
import {
  SyncProviderRegistry,
  type RegistryConfig,
  type InitResult,
} from '@src/registries/SyncProviderRegistry';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeMockLlmProvider(overrides: Partial<ILlmProvider> = {}): ILlmProvider {
  return {
    name: 'mock-llm',
    supportsChatCompletion: jest.fn().mockReturnValue(true),
    supportsCompletion: jest.fn().mockReturnValue(false),
    generateChatCompletion: jest.fn().mockResolvedValue('response'),
    generateCompletion: jest.fn().mockResolvedValue('response'),
    ...overrides,
  };
}

function makeMockMemoryProvider(overrides: Partial<IMemoryProvider> = {}): IMemoryProvider {
  return {
    addMemory: jest.fn().mockResolvedValue({ id: '1', content: '' }),
    searchMemories: jest.fn().mockResolvedValue({ results: [] }),
    getMemories: jest.fn().mockResolvedValue([]),
    getMemory: jest.fn().mockResolvedValue(null),
    updateMemory: jest.fn().mockResolvedValue({ id: '1', content: '' }),
    deleteMemory: jest.fn().mockResolvedValue(undefined),
    deleteAll: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
    ...overrides,
  };
}

function makeMockToolProvider(overrides: Partial<IToolProvider> = {}): IToolProvider {
  return {
    listTools: jest.fn().mockResolvedValue([]),
    executeTool: jest.fn().mockResolvedValue({ success: true }),
    healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
    ...overrides,
  };
}

function makeMockMessengerService(overrides: Partial<IMessengerService> = {}): IMessengerService {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    sendMessageToChannel: jest.fn().mockResolvedValue('msg-id'),
    getMessagesFromChannel: jest.fn().mockResolvedValue([]),
    sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    getClientId: jest.fn().mockReturnValue('bot-123'),
    getDefaultChannel: jest.fn().mockReturnValue('general'),
    shutdown: jest.fn().mockResolvedValue(undefined),
    setMessageHandler: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedLoadPlugin = loadPlugin as jest.MockedFunction<typeof loadPlugin>;
const mockedInstantiateLlm = instantiateLlmProvider as jest.MockedFunction<
  typeof instantiateLlmProvider
>;
const mockedInstantiateMemory = instantiateMemoryProvider as jest.MockedFunction<
  typeof instantiateMemoryProvider
>;
const mockedInstantiateTool = instantiateToolProvider as jest.MockedFunction<
  typeof instantiateToolProvider
>;
const mockedInstantiateMessenger = instantiateMessageService as jest.MockedFunction<
  typeof instantiateMessageService
>;

/**
 * Wire up loadPlugin to return a stub module and the corresponding
 * instantiate* helper to return the given provider instance.
 */
function stubLlmPlugin(key: string, provider: ILlmProvider): void {
  const mod = { create: jest.fn() };
  mockedLoadPlugin.mockImplementation(async (name: string) => {
    if (name === `llm-${key}`) return mod;
    throw new Error(`Plugin '${name}' not found.`);
  });
  mockedInstantiateLlm.mockReturnValue(provider);
}

function stubAllPlugins(
  llmProviders: Record<string, ILlmProvider> = {},
  memoryProviders: Record<string, IMemoryProvider> = {},
  toolProviders: Record<string, IToolProvider> = {},
  messengerServices: Record<string, IMessengerService> = {}
): void {
  const pluginModules: Record<string, any> = {};

  for (const key of Object.keys(llmProviders)) {
    pluginModules[`llm-${key}`] = { create: jest.fn() };
  }
  for (const key of Object.keys(memoryProviders)) {
    pluginModules[`memory-${key}`] = { create: jest.fn() };
  }
  for (const key of Object.keys(toolProviders)) {
    pluginModules[`tool-${key}`] = { create: jest.fn() };
  }
  for (const platform of Object.keys(messengerServices)) {
    pluginModules[`message-${platform}`] = { create: jest.fn() };
  }

  mockedLoadPlugin.mockImplementation(async (name: string) => {
    if (pluginModules[name]) return pluginModules[name];
    throw new Error(`Plugin '${name}' not found.`);
  });

  mockedInstantiateLlm.mockImplementation((_mod, config: any) => {
    const key = config?.__key ?? Object.keys(llmProviders)[0];
    return llmProviders[key] ?? makeMockLlmProvider();
  });

  mockedInstantiateMemory.mockImplementation((_mod, config: any) => {
    const key = config?.__key ?? Object.keys(memoryProviders)[0];
    return memoryProviders[key] ?? makeMockMemoryProvider();
  });

  mockedInstantiateTool.mockImplementation((_mod, config: any) => {
    const key = config?.__key ?? Object.keys(toolProviders)[0];
    return toolProviders[key] ?? makeMockToolProvider();
  });

  mockedInstantiateMessenger.mockImplementation((_mod, config: any) => {
    const platform = config?.__platform ?? Object.keys(messengerServices)[0];
    return messengerServices[platform] ?? makeMockMessengerService();
  });
}

function makeConfig(overrides: Partial<RegistryConfig> = {}): RegistryConfig {
  return {
    llmProfiles: [],
    memoryProfiles: [],
    toolProfiles: [],
    messengerPlatforms: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SyncProviderRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SyncProviderRegistry.getInstance().reset();
  });

  afterEach(() => {
    SyncProviderRegistry.getInstance().reset();
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    test('getInstance returns the same instance on repeated calls', () => {
      const a = SyncProviderRegistry.getInstance();
      const b = SyncProviderRegistry.getInstance();
      expect(a).toBe(b);
    });

    test('getInstance returns a SyncProviderRegistry instance', () => {
      const instance = SyncProviderRegistry.getInstance();
      expect(instance).toBeInstanceOf(SyncProviderRegistry);
    });
  });

  // =========================================================================
  // Initialization
  // =========================================================================

  describe('initialize', () => {
    test('loads providers from config and returns counts', async () => {
      const llm = makeMockLlmProvider({ name: 'openai' });
      const mem = makeMockMemoryProvider();
      const tool = makeMockToolProvider();

      stubAllPlugins({ openai: llm }, { mem0: mem }, { mcp: tool });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
        memoryProfiles: [{ key: 'mem0', provider: 'mem0', config: { __key: 'mem0' } }],
        toolProfiles: [{ key: 'mcp', provider: 'mcp', config: { __key: 'mcp' } }],
      });

      const result: InitResult = await SyncProviderRegistry.getInstance().initialize(config);

      expect(result.loaded.llm).toBe(1);
      expect(result.loaded.memory).toBe(1);
      expect(result.loaded.tool).toBe(1);
      expect(result.failed).toEqual([]);
    });

    test('reports partial failures in InitResult.failed', async () => {
      const llm = makeMockLlmProvider({ name: 'openai' });
      stubAllPlugins({ openai: llm });

      // The memory plugin will fail to load
      mockedLoadPlugin.mockImplementation(async (name: string) => {
        if (name === 'llm-openai') return { create: jest.fn() };
        throw new Error(`Plugin '${name}' not found.`);
      });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
        memoryProfiles: [{ key: 'badmem', provider: 'badmem', config: {} }],
      });

      const result = await SyncProviderRegistry.getInstance().initialize(config);

      expect(result.loaded.llm).toBe(1);
      expect(result.loaded.memory).toBe(0);
      expect(result.failed.length).toBeGreaterThanOrEqual(1);
      expect(result.failed[0]).toEqual(
        expect.objectContaining({
          type: 'memory',
          id: 'badmem',
          error: expect.any(String),
        })
      );
    });

    test('loads messenger platforms from config', async () => {
      const discord = makeMockMessengerService();
      stubAllPlugins({}, {}, {}, { discord });

      const config = makeConfig({
        messengerPlatforms: ['discord'],
      });

      const result = await SyncProviderRegistry.getInstance().initialize(config);

      expect(result.loaded.messenger).toBe(1);
    });

    test('returns zero counts when config is empty', async () => {
      const result = await SyncProviderRegistry.getInstance().initialize(makeConfig());

      expect(result.loaded).toEqual({ llm: 0, memory: 0, messenger: 0, tool: 0 });
      expect(result.failed).toEqual([]);
    });
  });

  // =========================================================================
  // isInitialized
  // =========================================================================

  describe('isInitialized', () => {
    test('returns false before initialize is called', () => {
      expect(SyncProviderRegistry.getInstance().isInitialized()).toBe(false);
    });

    test('returns true after initialize completes', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(SyncProviderRegistry.getInstance().isInitialized()).toBe(true);
    });
  });

  // =========================================================================
  // Double initialization
  // =========================================================================

  describe('double initialize', () => {
    test('second call is a no-op or throws', async () => {
      const registry = SyncProviderRegistry.getInstance();
      await registry.initialize(makeConfig());

      // Either it throws or silently returns a no-op result.
      // We accept either behaviour as valid.
      let threw = false;
      try {
        await registry.initialize(makeConfig());
      } catch {
        threw = true;
      }

      // Regardless of throw vs no-op, state should remain initialized
      expect(registry.isInitialized()).toBe(true);

      // If it did not throw, loadPlugin should NOT have been called a second time
      if (!threw) {
        // First init may have called loadPlugin 0 times (empty config), so just
        // verify it was not called MORE times on the second call.
        expect(mockedLoadPlugin).toHaveBeenCalledTimes(0);
      }
    });
  });

  // =========================================================================
  // LLM provider lookups
  // =========================================================================

  describe('getLlmProvider', () => {
    test('returns provider by ID after initialization', async () => {
      const llm = makeMockLlmProvider({ name: 'openai' });
      stubAllPlugins({ openai: llm });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const result = SyncProviderRegistry.getInstance().getLlmProvider('openai');
      expect(result).toBe(llm);
    });

    test('returns undefined for unknown ID', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(SyncProviderRegistry.getInstance().getLlmProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('getLlmProviders', () => {
    test('returns all registered LLM providers', async () => {
      const llm1 = makeMockLlmProvider({ name: 'openai' });
      const llm2 = makeMockLlmProvider({ name: 'letta' });

      stubAllPlugins({ openai: llm1, letta: llm2 });

      const config = makeConfig({
        llmProfiles: [
          { key: 'openai', provider: 'openai', config: { __key: 'openai' } },
          { key: 'letta', provider: 'letta', config: { __key: 'letta' } },
        ],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const all = SyncProviderRegistry.getInstance().getLlmProviders();
      expect(all).toHaveLength(2);
      expect(all).toContain(llm1);
      expect(all).toContain(llm2);
    });

    test('returns empty array when no LLM providers registered', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(SyncProviderRegistry.getInstance().getLlmProviders()).toEqual([]);
    });
  });

  describe('getDefaultLlmProvider', () => {
    test('returns the first registered LLM provider', async () => {
      const llm = makeMockLlmProvider({ name: 'openai' });
      stubAllPlugins({ openai: llm });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().getDefaultLlmProvider()).toBe(llm);
    });

    test('returns undefined when no LLM providers exist', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(SyncProviderRegistry.getInstance().getDefaultLlmProvider()).toBeUndefined();
    });
  });

  // =========================================================================
  // Memory provider lookups
  // =========================================================================

  describe('getMemoryProvider', () => {
    test('returns memory provider by ID', async () => {
      const mem = makeMockMemoryProvider();
      stubAllPlugins({}, { mem0: mem });

      const config = makeConfig({
        memoryProfiles: [{ key: 'mem0', provider: 'mem0', config: { __key: 'mem0' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().getMemoryProvider('mem0')).toBe(mem);
    });

    test('returns undefined for unknown memory provider', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(SyncProviderRegistry.getInstance().getMemoryProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('getMemoryProviders', () => {
    test('returns a Map of all memory providers', async () => {
      const mem1 = makeMockMemoryProvider();
      const mem2 = makeMockMemoryProvider();
      stubAllPlugins({}, { mem0: mem1, zep: mem2 });

      const config = makeConfig({
        memoryProfiles: [
          { key: 'mem0', provider: 'mem0', config: { __key: 'mem0' } },
          { key: 'zep', provider: 'zep', config: { __key: 'zep' } },
        ],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const all = SyncProviderRegistry.getInstance().getMemoryProviders();
      expect(all).toBeInstanceOf(Map);
      expect(all.size).toBe(2);
      expect(all.get('mem0')).toBe(mem1);
      expect(all.get('zep')).toBe(mem2);
    });
  });

  // =========================================================================
  // Tool provider lookups
  // =========================================================================

  describe('getToolProvider', () => {
    test('returns tool provider by ID', async () => {
      const tool = makeMockToolProvider();
      stubAllPlugins({}, {}, { mcp: tool });

      const config = makeConfig({
        toolProfiles: [{ key: 'mcp', provider: 'mcp', config: { __key: 'mcp' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().getToolProvider('mcp')).toBe(tool);
    });

    test('returns undefined for unknown tool provider', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(SyncProviderRegistry.getInstance().getToolProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('getToolProviders', () => {
    test('returns a Map of all tool providers', async () => {
      const t1 = makeMockToolProvider();
      const t2 = makeMockToolProvider();
      stubAllPlugins({}, {}, { mcp: t1, langchain: t2 });

      const config = makeConfig({
        toolProfiles: [
          { key: 'mcp', provider: 'mcp', config: { __key: 'mcp' } },
          { key: 'langchain', provider: 'langchain', config: { __key: 'langchain' } },
        ],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const all = SyncProviderRegistry.getInstance().getToolProviders();
      expect(all).toBeInstanceOf(Map);
      expect(all.size).toBe(2);
    });
  });

  // =========================================================================
  // Messenger service lookups
  // =========================================================================

  describe('getMessengerService', () => {
    test('returns messenger service by platform name', async () => {
      const discord = makeMockMessengerService();
      stubAllPlugins({}, {}, {}, { discord });

      const config = makeConfig({ messengerPlatforms: ['discord'] });
      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().getMessengerService('discord')).toBe(discord);
    });

    test('returns undefined for unknown platform', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(SyncProviderRegistry.getInstance().getMessengerService('teams')).toBeUndefined();
    });
  });

  describe('getMessengerServices', () => {
    test('returns a Map of all messenger services', async () => {
      const discord = makeMockMessengerService();
      const slack = makeMockMessengerService();
      stubAllPlugins({}, {}, {}, { discord, slack });

      const config = makeConfig({ messengerPlatforms: ['discord', 'slack'] });
      await SyncProviderRegistry.getInstance().initialize(config);

      const all = SyncProviderRegistry.getInstance().getMessengerServices();
      expect(all).toBeInstanceOf(Map);
      expect(all.size).toBe(2);
      expect(all.get('discord')).toBe(discord);
      expect(all.get('slack')).toBe(slack);
    });
  });

  // =========================================================================
  // getLlmProviderForBot
  // =========================================================================

  describe('getLlmProviderForBot', () => {
    test('returns bot-specific LLM provider when botConfig specifies one', async () => {
      const defaultLlm = makeMockLlmProvider({ name: 'openai' });
      const lettaLlm = makeMockLlmProvider({ name: 'letta' });

      stubAllPlugins({ openai: defaultLlm, letta: lettaLlm });

      const config = makeConfig({
        llmProfiles: [
          { key: 'openai', provider: 'openai', config: { __key: 'openai' } },
          { key: 'letta', provider: 'letta', config: { __key: 'letta' } },
        ],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const result = SyncProviderRegistry.getInstance().getLlmProviderForBot('mybot', {
        llmProvider: 'letta',
      });

      expect(result).toBe(lettaLlm);
    });

    test('falls back to default LLM provider when bot has no specific config', async () => {
      const defaultLlm = makeMockLlmProvider({ name: 'openai' });
      stubAllPlugins({ openai: defaultLlm });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const result = SyncProviderRegistry.getInstance().getLlmProviderForBot('mybot', {});

      expect(result).toBe(defaultLlm);
    });

    test('falls back to default when botConfig references an unknown provider', async () => {
      const defaultLlm = makeMockLlmProvider({ name: 'openai' });
      stubAllPlugins({ openai: defaultLlm });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const result = SyncProviderRegistry.getInstance().getLlmProviderForBot('mybot', {
        llmProvider: 'nonexistent',
      });

      expect(result).toBe(defaultLlm);
    });

    test('throws when no LLM providers are registered at all', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());

      expect(() =>
        SyncProviderRegistry.getInstance().getLlmProviderForBot('mybot', {})
      ).toThrow();
    });
  });

  // =========================================================================
  // Health & introspection
  // =========================================================================

  describe('getHealthStatus', () => {
    test('returns per-provider health status', async () => {
      const mem = makeMockMemoryProvider({
        healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
      });
      const tool = makeMockToolProvider({
        healthCheck: jest.fn().mockResolvedValue({ status: 'error', details: { reason: 'down' } }),
      });

      stubAllPlugins({}, { mem0: mem }, { mcp: tool });

      const config = makeConfig({
        memoryProfiles: [{ key: 'mem0', provider: 'mem0', config: { __key: 'mem0' } }],
        toolProfiles: [{ key: 'mcp', provider: 'mcp', config: { __key: 'mcp' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      const health = await SyncProviderRegistry.getInstance().getHealthStatus();

      expect(health).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'mem0', status: expect.stringMatching(/ok|error/) }),
          expect.objectContaining({ id: 'mcp', status: expect.stringMatching(/ok|error/) }),
        ])
      );
    });

    test('returns empty array when no providers are registered', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());

      const health = await SyncProviderRegistry.getInstance().getHealthStatus();
      expect(health).toEqual([]);
    });
  });

  describe('getProviderCount', () => {
    test('returns correct counts per type', async () => {
      const llm = makeMockLlmProvider({ name: 'openai' });
      const mem = makeMockMemoryProvider();
      const tool = makeMockToolProvider();
      const discord = makeMockMessengerService();

      stubAllPlugins({ openai: llm }, { mem0: mem }, { mcp: tool }, { discord });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
        memoryProfiles: [{ key: 'mem0', provider: 'mem0', config: { __key: 'mem0' } }],
        toolProfiles: [{ key: 'mcp', provider: 'mcp', config: { __key: 'mcp' } }],
        messengerPlatforms: ['discord'],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().getProviderCount()).toEqual({
        llm: 1,
        memory: 1,
        messenger: 1,
        tool: 1,
      });
    });

    test('returns zeroes when no providers loaded', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());

      expect(SyncProviderRegistry.getInstance().getProviderCount()).toEqual({
        llm: 0,
        memory: 0,
        messenger: 0,
        tool: 0,
      });
    });
  });

  // =========================================================================
  // Pre-initialization guard
  // =========================================================================

  describe('throws if used before initialize', () => {
    test('getLlmProvider throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getLlmProvider('any')).toThrow();
    });

    test('getLlmProviders throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getLlmProviders()).toThrow();
    });

    test('getDefaultLlmProvider throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getDefaultLlmProvider()).toThrow();
    });

    test('getMemoryProvider throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getMemoryProvider('any')).toThrow();
    });

    test('getMemoryProviders throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getMemoryProviders()).toThrow();
    });

    test('getToolProvider throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getToolProvider('any')).toThrow();
    });

    test('getToolProviders throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getToolProviders()).toThrow();
    });

    test('getMessengerService throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getMessengerService('any')).toThrow();
    });

    test('getMessengerServices throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getMessengerServices()).toThrow();
    });

    test('getLlmProviderForBot throws before init', () => {
      expect(() =>
        SyncProviderRegistry.getInstance().getLlmProviderForBot('bot', {})
      ).toThrow();
    });

    test('getHealthStatus rejects before init', async () => {
      await expect(SyncProviderRegistry.getInstance().getHealthStatus()).rejects.toThrow();
    });

    test('getProviderCount throws before init', () => {
      expect(() => SyncProviderRegistry.getInstance().getProviderCount()).toThrow();
    });
  });

  // =========================================================================
  // reloadProvider — hot-reload support
  // =========================================================================

  describe('reloadProvider', () => {
    test('replaces an LLM provider instance', async () => {
      const original = makeMockLlmProvider({ name: 'openai-v1' });
      const replacement = makeMockLlmProvider({ name: 'openai-v2' });

      stubAllPlugins({ openai: original });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().getLlmProvider('openai')).toBe(original);

      // Re-stub so the next load returns the replacement
      mockedInstantiateLlm.mockReturnValue(replacement);

      await SyncProviderRegistry.getInstance().reloadProvider('llm', 'openai');

      expect(SyncProviderRegistry.getInstance().getLlmProvider('openai')).toBe(replacement);
    });

    test('replaces a memory provider instance', async () => {
      const original = makeMockMemoryProvider();
      const replacement = makeMockMemoryProvider();

      stubAllPlugins({}, { mem0: original });

      const config = makeConfig({
        memoryProfiles: [{ key: 'mem0', provider: 'mem0', config: { __key: 'mem0' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      mockedInstantiateMemory.mockReturnValue(replacement);

      await SyncProviderRegistry.getInstance().reloadProvider('memory', 'mem0');

      expect(SyncProviderRegistry.getInstance().getMemoryProvider('mem0')).toBe(replacement);
    });

    test('replaces a tool provider instance', async () => {
      const original = makeMockToolProvider();
      const replacement = makeMockToolProvider();

      stubAllPlugins({}, {}, { mcp: original });

      const config = makeConfig({
        toolProfiles: [{ key: 'mcp', provider: 'mcp', config: { __key: 'mcp' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      mockedInstantiateTool.mockReturnValue(replacement);

      await SyncProviderRegistry.getInstance().reloadProvider('tool', 'mcp');

      expect(SyncProviderRegistry.getInstance().getToolProvider('mcp')).toBe(replacement);
    });

    test('throws when reloading a provider that does not exist', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());

      await expect(
        SyncProviderRegistry.getInstance().reloadProvider('llm', 'nonexistent')
      ).rejects.toThrow();
    });

    test('throws when called before initialization', async () => {
      await expect(
        SyncProviderRegistry.getInstance().reloadProvider('llm', 'openai')
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // reset — test cleanup
  // =========================================================================

  describe('reset', () => {
    test('clears all providers and resets initialized state', async () => {
      const llm = makeMockLlmProvider({ name: 'openai' });
      stubAllPlugins({ openai: llm });

      const config = makeConfig({
        llmProfiles: [{ key: 'openai', provider: 'openai', config: { __key: 'openai' } }],
      });
      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().isInitialized()).toBe(true);

      SyncProviderRegistry.getInstance().reset();

      expect(SyncProviderRegistry.getInstance().isInitialized()).toBe(false);
    });

    test('after reset, sync lookups throw again', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      SyncProviderRegistry.getInstance().reset();

      expect(() => SyncProviderRegistry.getInstance().getLlmProviders()).toThrow();
    });

    test('after reset, registry can be re-initialized', async () => {
      await SyncProviderRegistry.getInstance().initialize(makeConfig());
      SyncProviderRegistry.getInstance().reset();

      const result = await SyncProviderRegistry.getInstance().initialize(makeConfig());
      expect(result.loaded).toEqual({ llm: 0, memory: 0, messenger: 0, tool: 0 });
      expect(SyncProviderRegistry.getInstance().isInitialized()).toBe(true);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    test('multiple LLM profiles with same provider but different keys', async () => {
      const llm1 = makeMockLlmProvider({ name: 'openai-gpt4' });
      const llm2 = makeMockLlmProvider({ name: 'openai-gpt3' });

      stubAllPlugins({ openai: llm1 });

      // Override to return different instances per config
      let callCount = 0;
      mockedInstantiateLlm.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? llm1 : llm2;
      });

      const config = makeConfig({
        llmProfiles: [
          { key: 'gpt4', provider: 'openai', config: { model: 'gpt-4' } },
          { key: 'gpt3', provider: 'openai', config: { model: 'gpt-3.5' } },
        ],
      });

      // loadPlugin needs to succeed for both
      mockedLoadPlugin.mockResolvedValue({ create: jest.fn() });

      await SyncProviderRegistry.getInstance().initialize(config);

      expect(SyncProviderRegistry.getInstance().getLlmProvider('gpt4')).toBe(llm1);
      expect(SyncProviderRegistry.getInstance().getLlmProvider('gpt3')).toBe(llm2);
    });

    test('config with undefined optional fields initializes cleanly', async () => {
      const config: RegistryConfig = {};
      const result = await SyncProviderRegistry.getInstance().initialize(config);

      expect(result.loaded).toEqual({ llm: 0, memory: 0, messenger: 0, tool: 0 });
      expect(result.failed).toEqual([]);
    });

    test('all provider failures still results in initialized state', async () => {
      mockedLoadPlugin.mockRejectedValue(new Error('boom'));

      const config = makeConfig({
        llmProfiles: [{ key: 'bad', provider: 'bad', config: {} }],
        memoryProfiles: [{ key: 'bad', provider: 'bad', config: {} }],
        toolProfiles: [{ key: 'bad', provider: 'bad', config: {} }],
        messengerPlatforms: ['bad'],
      });

      const result = await SyncProviderRegistry.getInstance().initialize(config);

      expect(result.loaded).toEqual({ llm: 0, memory: 0, messenger: 0, tool: 0 });
      expect(result.failed.length).toBe(4);
      expect(SyncProviderRegistry.getInstance().isInitialized()).toBe(true);
    });
  });
});
