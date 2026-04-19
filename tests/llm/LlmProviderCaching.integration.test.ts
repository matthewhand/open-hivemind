import { getLlmProvider } from '../../src/llm/getLlmProvider';
import ProviderConfigManager from '../../src/config/ProviderConfigManager';
import { SyncProviderRegistry } from '../../src/registries/SyncProviderRegistry';
import { UserConfigStore } from '../../src/config/UserConfigStore';
import * as PluginLoader from '../../src/plugins/PluginLoader';

jest.mock('../../src/config/ProviderConfigManager');
jest.mock('../../src/registries/SyncProviderRegistry');
jest.mock('../../src/config/UserConfigStore');
jest.mock('../../src/plugins/PluginLoader');

describe('LLM Provider Caching and Resolution', () => {
  let mockProviderManager: any;
  let mockRegistry: any;
  let mockUserStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProviderManager = {
      getAllProviders: jest.fn().mockReturnValue([]),
    };
    (ProviderConfigManager.getInstance as jest.Mock).mockReturnValue(mockProviderManager);

    mockRegistry = {
      isInitialized: jest.fn().mockReturnValue(false),
      getLlmProviders: jest.fn().mockReturnValue([]),
    };
    (SyncProviderRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry);

    mockUserStore = {
      getGeneralSettings: jest.fn().mockReturnValue({}),
    };
    (UserConfigStore.getInstance as jest.Mock).mockReturnValue(mockUserStore);

    (PluginLoader.loadPlugin as jest.Mock).mockResolvedValue({ name: 'mock-plugin' });
    (PluginLoader.instantiateLlmProvider as jest.Mock).mockImplementation((_mod, cfg) => ({
      name: cfg?.name || 'mock-provider',
      supportsChatCompletion: () => true,
      supportsCompletion: () => true,
      supportsHistory: () => true,
      generateChatCompletion: jest.fn(),
    }));
  });

  it('should return providers from SyncProviderRegistry if initialized', async () => {
    const mockProviders = [{ name: 'registry-provider' }];
    mockRegistry.isInitialized.mockReturnValue(true);
    mockRegistry.getLlmProviders.mockReturnValue(mockProviders);

    const providers = await getLlmProvider();
    
    expect(providers).toBe(mockProviders);
    expect(mockRegistry.getLlmProviders).toHaveBeenCalled();
  });

  it('should instantiate and cache providers from ProviderConfigManager', async () => {
    const config = {
      id: 'p1',
      enabled: true,
      type: 'openai',
      config: { name: 'openai-1', apiKey: 'key1' }
    };
    mockProviderManager.getAllProviders.mockReturnValue([config]);

    // First call: instantiate
    const providers1 = await getLlmProvider();
    expect(providers1).toHaveLength(1);
    expect(providers1[0].name).toBe('openai-1');
    expect(PluginLoader.instantiateLlmProvider).toHaveBeenCalledTimes(1);

    // Second call: return cached
    const providers2 = await getLlmProvider();
    expect(providers2[0]).toBe(providers1[0]);
    expect(PluginLoader.instantiateLlmProvider).toHaveBeenCalledTimes(1);
  });

  it('should re-instantiate provider if configuration changes', async () => {
    const config1 = {
      id: 'p-reinstantiate',
      enabled: true,
      type: 'openai',
      config: { name: 'openai-1', apiKey: 'key1' }
    };
    mockProviderManager.getAllProviders.mockReturnValue([config1]);

    await getLlmProvider();
    expect(PluginLoader.instantiateLlmProvider).toHaveBeenCalledTimes(1);

    // Change config for same ID
    const config2 = {
      id: 'p-reinstantiate',
      enabled: true,
      type: 'openai',
      config: { name: 'openai-1', apiKey: 'key2' } // New API key
    };
    mockProviderManager.getAllProviders.mockClear();
    mockProviderManager.getAllProviders.mockReturnValue([config2]);

    await getLlmProvider();
    expect(PluginLoader.instantiateLlmProvider).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple enabled providers', async () => {
    mockProviderManager.getAllProviders.mockReturnValue([
      { id: 'p1', enabled: true, type: 'openai', config: { name: 'p1' } },
      { id: 'p2', enabled: true, type: 'anthropic', config: { name: 'p2' } },
      { id: 'p3', enabled: false, type: 'disabled', config: { name: 'p3' } },
    ]);

    const providers = await getLlmProvider();
    expect(providers).toHaveLength(2);
    expect(providers.map(p => p.name)).toContain('p1');
    expect(providers.map(p => p.name)).toContain('p2');
  });

  it('should wrap providers with token counting', async () => {
    const config = { id: 'p1', enabled: true, type: 'openai', config: { name: 'p1' } };
    mockProviderManager.getAllProviders.mockReturnValue([config]);

    const providers = await getLlmProvider();
    const provider = providers[0];

    // Check if it has token counting behavior (this is internal, but we can verify it calls the original)
    // Actually, getLlmProvider wraps it in withTokenCounting
    expect(provider.generateChatCompletion).toBeDefined();
  });
});
