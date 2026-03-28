/**
 * Contract tests for ILlmProvider implementations.
 *
 * These tests verify that every LLM provider conforms to the ILlmProvider
 * interface defined in src/llm/interfaces/ILlmProvider.ts. External HTTP
 * calls and SDKs are mocked so the tests run offline and fast.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

jest.mock('openai', () => {
  const completionsCreate = jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'mocked chat response' } }],
  });
  const textCompletionsCreate = jest.fn().mockResolvedValue({
    choices: [{ text: 'mocked text response' }],
  });
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: completionsCreate } },
      completions: { create: textCompletionsCreate },
    })),
    __completionsCreate: completionsCreate,
    __textCompletionsCreate: textCompletionsCreate,
  };
});

jest.mock('axios', () => {
  const instance = {
    post: jest.fn().mockResolvedValue({
      data: { choices: [{ message: { content: 'mocked axios response' }, text: 'mocked axios text' }] },
    }),
    get: jest.fn().mockResolvedValue({ data: {} }),
  };
  const axiosMock: any = jest.fn(() => instance);
  axiosMock.create = jest.fn(() => instance);
  axiosMock.post = instance.post;
  axiosMock.get = instance.get;
  axiosMock.isAxiosError = jest.fn(() => false);
  axiosMock.__instance = instance;
  return { __esModule: true, default: axiosMock };
});

jest.mock('@config/openaiConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(() => '') },
}));

jest.mock('@config/flowiseConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(() => '') },
}));

jest.mock('@integrations/flowise/flowiseRestClient', () => ({
  getFlowiseResponse: jest.fn().mockResolvedValue('flowise rest response'),
}));

jest.mock('@integrations/flowise/flowiseSdkClient', () => ({
  getFlowiseSdkResponse: jest.fn().mockResolvedValue('flowise sdk response'),
}));

jest.mock('@letta-ai/letta-client', () => {
  return jest.fn().mockImplementation(() => ({
    agents: {
      messages: {
        create: jest.fn().mockResolvedValue({
          messages: [{ role: 'assistant', content: 'letta response' }],
        }),
      },
    },
  }));
});

jest.mock('@hivemind/shared-types', () => ({
  isSafeUrl: jest.fn().mockResolvedValue(true),
}));

// Suppress debug output during tests
jest.mock('debug', () => {
  const noop: any = () => {};
  noop.extend = () => noop;
  return () => noop;
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { OpenAiProvider } from '../../packages/llm-openai/src/openAiProvider';
import { FlowiseProvider } from '../../packages/llm-flowise/src/flowiseProvider';
import { OpenSwarmProvider } from '../../packages/llm-openswarm/src/OpenSwarmProvider';

// openWebUIProvider is a plain object, not a class — import it directly
import { openWebUIProvider } from '../../packages/llm-openwebui/src/openWebUIProvider';

// LettaProvider uses a singleton; we need special handling
import { LettaProvider } from '../../packages/llm-letta/src/lettaProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal IMessage stub satisfying the interface used by providers. */
function makeMessage(text: string, role = 'user'): any {
  return {
    role,
    getText: () => text,
    getChannelId: () => 'test-channel',
    metadata: {},
  };
}

/**
 * Generic contract test suite that can be run against any ILlmProvider.
 */
function runLlmProviderContractTests(
  providerName: string,
  getProvider: () => ILlmProvider,
) {
  describe(`ILlmProvider contract: ${providerName}`, () => {
    let provider: ILlmProvider;

    beforeEach(() => {
      provider = getProvider();
    });

    // ----- Required properties -------------------------------------------

    it('has a string "name" property', () => {
      expect(typeof provider.name).toBe('string');
      expect(provider.name.length).toBeGreaterThan(0);
    });

    // ----- Required methods ----------------------------------------------

    it('has supportsChatCompletion() returning a boolean', () => {
      expect(typeof provider.supportsChatCompletion).toBe('function');
      const result = provider.supportsChatCompletion();
      expect(typeof result).toBe('boolean');
    });

    it('has supportsCompletion() returning a boolean', () => {
      expect(typeof provider.supportsCompletion).toBe('function');
      const result = provider.supportsCompletion();
      expect(typeof result).toBe('boolean');
    });

    it('has generateChatCompletion() that returns a Promise<string>', async () => {
      expect(typeof provider.generateChatCompletion).toBe('function');
      const result = await provider.generateChatCompletion(
        'Hello',
        [makeMessage('Hi')],
        { channelId: 'test', agentId: 'test-agent' },
      );
      expect(typeof result).toBe('string');
    });

    it('has generateCompletion() that returns a Promise<string> or throws (unsupported)', async () => {
      expect(typeof provider.generateCompletion).toBe('function');

      if (provider.supportsCompletion()) {
        const result = await provider.generateCompletion('Write a haiku');
        expect(typeof result).toBe('string');
      } else {
        // Providers that don't support completion may throw or return a string
        try {
          const result = await provider.generateCompletion('Write a haiku');
          expect(typeof result).toBe('string');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    // ----- Optional methods ----------------------------------------------

    it('if supportsHistory is defined, it returns a boolean', () => {
      if (provider.supportsHistory !== undefined) {
        expect(typeof provider.supportsHistory).toBe('function');
        expect(typeof provider.supportsHistory()).toBe('boolean');
      }
    });

    it('if generateStreamingChatCompletion is defined, it is a function', () => {
      if (provider.generateStreamingChatCompletion !== undefined) {
        expect(typeof provider.generateStreamingChatCompletion).toBe('function');
      }
    });

    // ----- Error handling ------------------------------------------------

    it('generateChatCompletion handles empty user message gracefully', async () => {
      // Should not throw — may return empty string or a fallback
      const result = await provider.generateChatCompletion('', [], {
        channelId: 'test',
        agentId: 'test-agent',
      });
      expect(typeof result).toBe('string');
    });

    it('generateChatCompletion handles empty history gracefully', async () => {
      const result = await provider.generateChatCompletion('Hello', [], {
        channelId: 'test',
        agentId: 'test-agent',
      });
      expect(typeof result).toBe('string');
    });
  });
}

// ---------------------------------------------------------------------------
// Run contract tests for each LLM provider
// ---------------------------------------------------------------------------

runLlmProviderContractTests('OpenAiProvider', () => {
  return new OpenAiProvider({
    apiKey: 'test-key',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
  } as any);
});

runLlmProviderContractTests('FlowiseProvider', () => {
  return new FlowiseProvider({ useRest: true });
});

runLlmProviderContractTests('OpenSwarmProvider', () => {
  return new OpenSwarmProvider();
});

runLlmProviderContractTests('openWebUIProvider (object literal)', () => {
  return openWebUIProvider;
});

runLlmProviderContractTests('LettaProvider', () => {
  // Reset singleton for each test suite run
  (LettaProvider as any).instance = undefined;
  return LettaProvider.getInstance({ agentId: 'test-agent-id' });
});
