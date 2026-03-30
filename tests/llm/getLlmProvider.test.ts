import llmConfig from '@config/llmConfig';
import { getLlmProvider } from '@llm/getLlmProvider';

// Mock dependencies
jest.mock('@config/llmConfig');

// Mock ProviderConfigManager to return empty by default
jest.mock('@src/config/ProviderConfigManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getAllProviders: () => [],
    }),
  },
}));

// Mock the plugin loader used by getLlmProvider
jest.mock('@src/plugins/PluginLoader', () => {
  const providers: Record<string, any> = {
    'llm-openai': {
      create: () => ({
        name: 'openai',
        supportsChatCompletion: () => true,
        supportsCompletion: () => true,
        supportsHistory: undefined,
        generateChatCompletion: jest.fn().mockResolvedValue('test response'),
        generateCompletion: jest.fn().mockResolvedValue('test response'),
      }),
    },
    'llm-flowise': {
      create: () => ({
        name: 'flowise',
        supportsChatCompletion: () => true,
        supportsCompletion: () => true,
        supportsHistory: undefined,
        generateChatCompletion: jest.fn().mockResolvedValue('test response'),
        generateCompletion: jest.fn().mockResolvedValue('test response'),
      }),
    },
    'llm-openwebui': {
      create: () => ({
        name: 'openwebui',
        supportsChatCompletion: () => true,
        supportsCompletion: () => true,
        supportsHistory: undefined,
        generateChatCompletion: jest.fn().mockResolvedValue('test response'),
        generateCompletion: jest.fn().mockResolvedValue('test response'),
      }),
    },
  };
  return {
    __esModule: true,
    loadPlugin: jest.fn((name: string) => {
      if (providers[name]) return providers[name];
      throw new Error(`Plugin '${name}' not found.`);
    }),
    instantiateLlmProvider: jest.fn((mod: any, _config?: any) => {
      if (typeof mod.create === 'function') return mod.create();
      throw new Error('Plugin does not export create().');
    }),
  };
});

// Mock MetricsCollector used by withTokenCounting wrapper
jest.mock('@src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: () => ({
      recordLlmTokenUsage: jest.fn(),
    }),
  },
}));

const mockedLlmConfig = llmConfig as jest.Mocked<typeof llmConfig>;

describe('getLlmProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should default to OpenAI provider if LLM_PROVIDER is not set', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue(undefined);
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('openai');
  });

  it('should return the OpenAI provider when specified', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('openai');
  });

  it('should return the Flowise provider when specified', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('flowise');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('flowise');
  });

  it('should return the OpenWebUI provider when specified', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openwebui');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(typeof providers[0].supportsChatCompletion).toBe('function');
    expect(typeof providers[0].generateChatCompletion).toBe('function');
  });

  it('should return multiple providers for a comma-separated list', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai, flowise');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(2);
    expect(providers.some((p) => p.name === 'openai')).toBe(true);
    expect(providers.some((p) => p.name === 'flowise')).toBe(true);
  });

  it('should skip unknown providers and return valid ones', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai, unknownprovider');
    const providers = getLlmProvider();
    expect(providers.length).toBeGreaterThanOrEqual(1);
    expect(providers.some((p) => p.name === 'openai')).toBe(true);
  });

  it('should default to OpenAI when no valid providers are configured', () => {
    // When all providers are unknown, code defaults to OpenAI (legacy fallback)
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('unknown, invalid');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('openai');
  });
});
