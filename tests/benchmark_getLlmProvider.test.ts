import ProviderConfigManager from '@src/config/ProviderConfigManager';
import { getLlmProvider } from '@src/llm/getLlmProvider';

// Mock dependencies
jest.mock('@src/config/ProviderConfigManager');
jest.mock('@src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: () => ({
      recordLlmTokenUsage: jest.fn(),
    }),
  },
}));
jest.mock('@config/llmConfig', () => ({
  get: jest.fn(),
}));

// Mock providers with some simulated overhead
jest.mock(
  '@hivemind/provider-openai',
  () => ({
    OpenAiProvider: class {
      config: any;
      constructor(config: any) {
        this.config = config;
        // Simulate initialization work
        for (let i = 0; i < 10000; i++) {}
      }
      generateChatCompletion() {}
      generateCompletion() {}
    },
  }),
  { virtual: true }
);

jest.mock(
  '@integrations/flowise/flowiseProvider',
  () => ({
    FlowiseProvider: class {
      config: any;
      constructor(config: any) {
        this.config = config;
        // Simulate initialization work
        for (let i = 0; i < 10000; i++) {}
      }
      generateChatCompletion() {}
      generateCompletion() {}
    },
  }),
  { virtual: true }
);

// Setup mock return value
const mockGetAllProviders = jest.fn();
(ProviderConfigManager.getInstance as jest.Mock).mockReturnValue({
  getAllProviders: mockGetAllProviders,
});

describe('Benchmark getLlmProvider', () => {
  it('runs benchmark', async () => {
    const configProviders = [
      {
        id: 'openai-1',
        type: 'openai',
        name: 'OpenAI Test',
        enabled: true,
        config: { apiKey: 'sk-test', model: 'gpt-4' },
      },
      {
        id: 'flowise-1',
        type: 'flowise',
        name: 'Flowise Test',
        enabled: true,
        config: { baseUrl: 'http://localhost:3000' },
      },
    ];

    mockGetAllProviders.mockReturnValue(configProviders);

    console.log('Warming up...');
    for (let i = 0; i < 100; i++) {
      getLlmProvider();
    }

    console.log('Starting benchmark...');
    const start = process.hrtime();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      getLlmProvider();
    }

    const end = process.hrtime(start);
    const timeInMs = end[0] * 1000 + end[1] / 1e6;

    console.log(`Total time for ${iterations} iterations: ${timeInMs.toFixed(2)}ms`);
    console.log(`Average time per iteration: ${(timeInMs / iterations).toFixed(4)}ms`);
  });
});
