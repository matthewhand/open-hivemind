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

describe('Benchmark getLlmProvider (async path)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockLoadPlugin.mockImplementation((name: string) => ({ pluginName: name }));
    mockInstantiateLlmProvider.mockImplementation((_mod: any, cfg: any) => ({
      name: String(cfg?.providerName || 'provider'),
      supportsChatCompletion: () => true,
      supportsCompletion: () => true,
      supportsHistory: () => true,
      generateChatCompletion: jest.fn().mockResolvedValue('ok'),
      generateCompletion: jest.fn().mockResolvedValue('ok'),
    }));
  });

  it('runs benchmark using configured providers with caching warmup', async () => {
    const configProviders = [
      {
        id: 'openai-1',
        type: 'openai',
        name: 'OpenAI Test',
        enabled: true,
        config: { apiKey: 'sk-test', model: 'gpt-4', providerName: 'openai' },
      },
      {
        id: 'flowise-1',
        type: 'flowise',
        name: 'Flowise Test',
        enabled: true,
        config: { baseUrl: 'http://localhost:3000', providerName: 'flowise' },
      },
    ];

    mockGetAllProviders.mockReturnValue(configProviders);

    // Warm cache
    for (let i = 0; i < 5; i++) {
      await getLlmProvider();
    }

    const start = process.hrtime();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const providers = await getLlmProvider();
      expect(providers).toHaveLength(2);
    }
    const end = process.hrtime(start);
    const timeInMs = end[0] * 1000 + end[1] / 1e6;

    expect(timeInMs).toBeGreaterThanOrEqual(0);
    // ensure provider instantiation happened only during initial warmup/caching windows
    expect(mockInstantiateLlmProvider.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('benchmarks legacy fallback when no configured providers are enabled', async () => {
    const llmCfg = require('@config/llmConfig').default;
    llmCfg.get.mockReturnValue('openai,flowise');

    mockGetAllProviders.mockReturnValue([]);

    const start = process.hrtime();
    for (let i = 0; i < 20; i++) {
      const providers = await getLlmProvider();
      expect(providers.length).toBeGreaterThan(0);
    }
    const end = process.hrtime(start);
    const timeInMs = end[0] * 1000 + end[1] / 1e6;

    expect(timeInMs).toBeGreaterThanOrEqual(0);
    expect(mockLoadPlugin).toHaveBeenCalled();
  });
});
