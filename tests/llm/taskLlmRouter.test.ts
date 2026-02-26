import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';

let mockProviderInstances: any[] = [];

// Mock llmTaskConfig so tests can use alias env vars (LLM_<TASK>_PROVIDER/MODEL)
jest.mock('@config/llmTaskConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => ''),
  },
}));

// Mock ProviderConfigManager
jest.mock('@src/config/ProviderConfigManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getAllProviders: () => mockProviderInstances,
    }),
  },
}));

// Mock MetricsCollector so token counting wrapper stays inert
jest.mock('@src/monitoring/MetricsCollector', () => ({
  __esModule: true,
  MetricsCollector: {
    getInstance: () => ({ recordLlmTokenUsage: jest.fn() }),
  },
}));

// Mock OpenAI provider to surface constructor config + metadata
jest.mock('@hivemind/provider-openai', () => ({
  __esModule: true,
  OpenAiProvider: jest.fn().mockImplementation((cfg: any) => ({
    name: 'openai',
    supportsChatCompletion: () => true,
    supportsCompletion: () => true,
    generateChatCompletion: jest.fn(async (_msg: string, _hist: any[], metadata?: any) => {
      return `openai:${String(cfg?.model || '')}:${String(metadata?.modelOverride || '')}`;
    }),
    generateCompletion: jest.fn(async () => ''),
  })),
}));

// Mock Flowise provider
jest.mock('@integrations/flowise/flowiseProvider', () => ({
  __esModule: true,
  FlowiseProvider: jest.fn().mockImplementation((_cfg: any) => ({
    name: 'flowise',
    supportsChatCompletion: () => true,
    supportsCompletion: () => false,
    generateChatCompletion: jest.fn(async () => 'flowise'),
    generateCompletion: jest.fn(async () => ''),
  })),
}));

// Mock OpenWebUI
jest.mock('@integrations/openwebui/runInference', () => ({
  __esModule: true,
  generateChatCompletion: jest.fn().mockResolvedValue({ text: 'openwebui' }),
}));

describe('taskLlmRouter.getTaskLlm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProviderInstances = [];
    delete process.env.LLM_SEMANTIC_PROVIDER;
    delete process.env.LLM_SEMANTIC_MODEL;
  });

  it('uses provided fallback provider when no overrides', () => {
    const fallback: ILlmProvider = {
      name: 'fallback',
      supportsChatCompletion: () => true,
      supportsCompletion: () => false,
      generateChatCompletion: async () => 'fallback',
      generateCompletion: async () => 'fallback',
    };

    // Import after mocks
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getTaskLlm } = require('@llm/taskLlmRouter');

    const sel = getTaskLlm('semantic', { fallbackProviders: [fallback], baseMetadata: { x: 1 } });
    expect(sel.provider).toBe(fallback);
    expect(sel.metadata).toEqual({ x: 1 });
  });

  it('applies model override via metadata without provider override', () => {
    const fallback: ILlmProvider = {
      name: 'fallback',
      supportsChatCompletion: () => true,
      supportsCompletion: () => false,
      generateChatCompletion: async () => 'fallback',
      generateCompletion: async () => 'fallback',
    };

    process.env.LLM_SEMANTIC_MODEL = 'gpt-5.1-nano';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getTaskLlm } = require('@llm/taskLlmRouter');

    const sel = getTaskLlm('semantic', { fallbackProviders: [fallback] });
    expect(sel.provider).toBe(fallback);
    expect(sel.metadata.modelOverride).toBe('gpt-5.1-nano');
  });

  it('selects provider instance by id and applies model override', async () => {
    mockProviderInstances = [
      {
        id: 'openai-default',
        type: 'openai',
        category: 'llm',
        name: 'Default OpenAI',
        enabled: true,
        config: { model: 'base-model' },
      },
    ];

    process.env.LLM_SEMANTIC_PROVIDER = 'openai-default';
    process.env.LLM_SEMANTIC_MODEL = 'override-model';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getTaskLlm } = require('@llm/taskLlmRouter');

    const sel = getTaskLlm('semantic');
    expect(sel.provider.name).toBe('openai');

    const out = await sel.provider.generateChatCompletion('hi', [], sel.metadata);
    expect(out).toBe('openai:override-model:override-model');
  });

  it('selects provider instance by type when ref is a type string', () => {
    mockProviderInstances = [
      {
        id: 'flowise-1',
        type: 'flowise',
        category: 'llm',
        name: 'Flowise A',
        enabled: true,
        config: {},
      },
      {
        id: 'openai-1',
        type: 'openai',
        category: 'llm',
        name: 'OpenAI A',
        enabled: true,
        config: {},
      },
    ];

    process.env.LLM_SEMANTIC_PROVIDER = 'openai';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getTaskLlm } = require('@llm/taskLlmRouter');

    const sel = getTaskLlm('semantic');
    expect(sel.provider.name).toBe('openai');
  });
});
