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

// Mock OpenAiProvider class
jest.mock('@hivemind/provider-openai', () => ({
  __esModule: true,
  OpenAiProvider: jest.fn().mockImplementation(() => ({
    name: 'openai',
    supportsChatCompletion: () => true,
    supportsCompletion: () => true,
    generateChatCompletion: jest.fn().mockResolvedValue('test response'),
    generateCompletion: jest.fn().mockResolvedValue('test response'),
    validateCredentials: jest.fn().mockResolvedValue(true),
    generateResponse: jest.fn().mockResolvedValue('test response'),
  })),
}));

// Mock FlowiseProvider class
jest.mock('@integrations/flowise/flowiseProvider', () => ({
  __esModule: true,
  FlowiseProvider: jest.fn().mockImplementation(() => ({
    name: 'flowise',
    supportsChatCompletion: () => true,
    supportsCompletion: () => true,
    generateChatCompletion: jest.fn().mockResolvedValue('test response'),
    generateCompletion: jest.fn().mockResolvedValue('test response'),
    validateCredentials: jest.fn().mockResolvedValue(true),
    generateResponse: jest.fn().mockResolvedValue('test response'),
  })),
}));

// Mock openWebUI
jest.mock('@integrations/openwebui/runInference', () => ({
  __esModule: true,
  generateChatCompletion: jest.fn().mockResolvedValue({ text: 'test response' }),
}));

const mockedLlmConfig = llmConfig as jest.Mocked<typeof llmConfig>;

describe('getLlmProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should default to OpenAI provider if LLM_PROVIDER is not set', async () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue(undefined);
    const providers = await getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('openai');
  });

  it('should return the OpenAI provider when specified', async () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai');
    const providers = await getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('openai');
  });

  it('should return the Flowise provider when specified', async () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('flowise');
    const providers = await getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('flowise');
  });

  it('should return the OpenWebUI provider when specified', async () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openwebui');
    const providers = await getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].supportsChatCompletion).toBeDefined();
    expect(providers[0].generateChatCompletion).toBeDefined();
  });

  it('should return multiple providers for a comma-separated list', async () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai, flowise');
    const providers = await getLlmProvider();
    expect(providers).toHaveLength(2);
    expect(providers.some((p) => p.name === 'openai')).toBe(true);
    expect(providers.some((p) => p.name === 'flowise')).toBe(true);
  });

  it('should skip unknown providers and return valid ones', async () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai, unknownprovider');
    const providers = await getLlmProvider();
    expect(providers.length).toBeGreaterThanOrEqual(1);
    expect(providers.some((p) => p.name === 'openai')).toBe(true);
  });

  it('should default to OpenAI when no valid providers are configured', async () => {
    // When all providers are unknown, code defaults to OpenAI (legacy fallback)
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('unknown, invalid');
    const providers = await getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('openai');
  });
});
