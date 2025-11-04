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

  it.each([
    {
      name: 'should default to the OpenAI provider if LLM_PROVIDER is not set',
      configValue: undefined,
      expectedLength: 1,
      expectedNames: ['openai'],
      checkMethods: false
    },
    {
      name: 'should return the OpenAI provider when specified',
      configValue: 'openai',
      expectedLength: 1,
      expectedNames: ['openai'],
      checkMethods: false
    },
    {
      name: 'should return the Flowise provider when specified',
      configValue: 'flowise',
      expectedLength: 1,
      expectedNames: ['flowise'],
      checkMethods: false
    },
    {
      name: 'should return the OpenWebUI provider when specified',
      configValue: 'openwebui',
      expectedLength: 1,
      expectedNames: [],
      checkMethods: true
    },
    {
      name: 'should return multiple providers for a comma-separated list',
      configValue: 'openai, flowise',
      expectedLength: 2,
      expectedNames: ['openai', 'flowise'],
      checkMethods: false
    },
    {
      name: 'should skip unknown providers and return only valid ones',
      configValue: 'openai, unknownprovider, flowise',
      expectedLength: 2,
      expectedNames: ['openai', 'flowise'],
      checkMethods: false
    },
    {
      name: 'should throw an error if no valid providers are configured',
      configValue: 'unknown, invalid',
      expectedLength: 0,
      expectedNames: [],
      checkMethods: false,
      shouldThrow: true,
      errorMessage: 'No valid LLM providers initialized'
    }
  ])('$name', ({ configValue, expectedLength, expectedNames, checkMethods, shouldThrow, errorMessage }) => {
    (mockedLlmConfig.get as jest.Mock).mockReturnValue(configValue);

    if (shouldThrow) {
      expect(() => getLlmProvider()).toThrow(errorMessage);
    } else {
      const providers = getLlmProvider();
      expect(providers).toHaveLength(expectedLength);

      if (expectedNames.length > 0) {
        expectedNames.forEach(name => {
          expect(providers.some(p => (p as any).name === name)).toBe(true);
        });
      }

      if (checkMethods) {
        expect(providers[0].supportsChatCompletion).toBeDefined();
        expect(providers[0].generateChatCompletion).toBeDefined();
      }
    }
  });
});
