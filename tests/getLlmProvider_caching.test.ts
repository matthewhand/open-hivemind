import { getLlmProvider } from '@src/llm/getLlmProvider';

const mockGetAllProviders = jest.fn();
const mockLoadPlugin = jest.fn();
const mockInstantiateLlmProvider = jest.fn();

jest.mock('@src/config/ProviderConfigManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getAllProviders: mockGetAllProviders,
    }),
  },
}));

jest.mock('@src/plugins/PluginLoader', () => ({
  __esModule: true,
  loadPlugin: (...args: any[]) => mockLoadPlugin(...args),
  instantiateLlmProvider: (...args: any[]) => mockInstantiateLlmProvider(...args),
}));

jest.mock('@src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: () => ({
      getGeneralSettings: () => ({}),
    }),
  },
}));

jest.mock('@src/config/llmProfiles', () => ({
  getLlmProfileByKey: jest.fn(() => null),
}));

jest.mock('@src/registries/SyncProviderRegistry', () => ({
  SyncProviderRegistry: {
    getInstance: () => ({
      isInitialized: () => false,
      getLlmProviders: () => [],
    }),
  },
}));

jest.mock('@config/llmConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => ''),
  },
}));

jest.mock('@src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: () => ({
      recordLlmTokenUsage: jest.fn(),
    }),
  },
}));

describe('getLlmProvider Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockLoadPlugin.mockImplementation((name: string) => ({
      pluginName: name,
    }));

    mockInstantiateLlmProvider.mockImplementation((_mod: any, cfg: any) => ({
      name: 'openai',
      supportsChatCompletion: () => true,
      supportsCompletion: () => true,
      supportsHistory: () => true,
      generateChatCompletion: jest.fn().mockResolvedValue('chat'),
      generateCompletion: jest.fn().mockResolvedValue('completion'),
      __cfg: cfg,
    }));
  });

  it('reuses provider instance if config is unchanged', async () => {
    const config = {
      id: 'test-cache-1',
      type: 'openai',
      name: 'Test Cache 1',
      enabled: true,
      config: { key: 'val1' },
    };

    mockGetAllProviders.mockReturnValue([config]);

    await getLlmProvider();
    expect(mockLoadPlugin).toHaveBeenCalledTimes(1);
    expect(mockInstantiateLlmProvider).toHaveBeenCalledTimes(1);
    expect(mockInstantiateLlmProvider).toHaveBeenCalledWith(expect.any(Object), { key: 'val1' });

    await getLlmProvider();
    expect(mockLoadPlugin).toHaveBeenCalledTimes(1);
    expect(mockInstantiateLlmProvider).toHaveBeenCalledTimes(1);
  });

  it('creates new instance if config changes', async () => {
    const config1 = {
      id: 'test-cache-2',
      type: 'openai',
      name: 'Test Cache 2',
      enabled: true,
      config: { key: 'val1' },
    };

    mockGetAllProviders.mockReturnValue([config1]);
    await getLlmProvider();

    const config2 = {
      ...config1,
      config: { key: 'val2' },
    };
    mockGetAllProviders.mockReturnValue([config2]);

    await getLlmProvider();
    expect(mockInstantiateLlmProvider).toHaveBeenCalledTimes(2);
    expect(mockInstantiateLlmProvider).toHaveBeenLastCalledWith(expect.any(Object), { key: 'val2' });
  });

  it('cleans up stale providers and re-instantiates when added back', async () => {
    const config = {
      id: 'test-cache-3',
      type: 'openai',
      name: 'Test Cache 3',
      enabled: true,
      config: { key: 'val3' },
    };

    mockGetAllProviders.mockReturnValue([config]);
    await getLlmProvider();
    expect(mockInstantiateLlmProvider).toHaveBeenCalledTimes(1);

    mockGetAllProviders.mockReturnValue([]);
    await getLlmProvider();

    mockGetAllProviders.mockReturnValue([config]);
    await getLlmProvider();

    // Calls breakdown:
    // 1) configured provider first load
    // 2) default fallback provider when list is empty
    // 3) configured provider again after stale prune/add-back
    expect(mockInstantiateLlmProvider).toHaveBeenCalledTimes(3);
  });
});
