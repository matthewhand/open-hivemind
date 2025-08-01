import { getLlmProvider } from '@llm/getLlmProvider';
import llmConfig from '@config/llmConfig';

// Mock the dependencies
jest.mock('@config/llmConfig');

// For modules with named exports like `openAiProvider`
jest.mock('@integrations/openai/openAiProvider', () => ({
  __esModule: true,
  openAiProvider: { name: 'openai' }
}));

// For modules with a default export like `flowiseProvider`
jest.mock('@integrations/flowise/flowiseProvider', () => ({
  __esModule: true,
  default: { name: 'flowise' }
}));

jest.mock('@integrations/openwebui/runInference', () => ({
  __esModule: true,
  generateChatCompletion: jest.fn(),
}));

const mockedLlmConfig = llmConfig as jest.Mocked<typeof llmConfig>;

describe('getLlmProvider', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should default to the OpenAI provider if LLM_PROVIDER is not set', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue(undefined);
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect((providers[0] as any).name).toBe('openai');
  });

  it('should return the OpenAI provider when specified', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect((providers[0] as any).name).toBe('openai');
  });

  it('should return the Flowise provider when specified', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('flowise');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect((providers[0] as any).name).toBe('flowise');
  });

  it('should return the OpenWebUI provider when specified', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openwebui');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(1);
    expect(providers[0].supportsChatCompletion).toBeDefined();
    expect(providers[0].generateChatCompletion).toBeDefined();
  });

  it('should return multiple providers for a comma-separated list', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai, flowise');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(2);
    expect(providers.some(p => (p as any).name === 'openai')).toBe(true);
    expect(providers.some(p => (p as any).name === 'flowise')).toBe(true);
  });
  
  it('should skip unknown providers and return only valid ones', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('openai, unknownprovider, flowise');
    const providers = getLlmProvider();
    expect(providers).toHaveLength(2);
    expect(providers.some(p => (p as any).name === 'openai')).toBe(true);
    expect(providers.some(p => (p as any).name === 'flowise')).toBe(true);
  });

  it('should throw an error if no valid providers are configured', () => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue('unknown, invalid');
    expect(() => getLlmProvider()).toThrow('No valid LLM providers initialized');
  });
});
