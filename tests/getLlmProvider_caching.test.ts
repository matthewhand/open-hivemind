
import { getLlmProvider } from '@src/llm/getLlmProvider';
import ProviderConfigManager from '@src/config/ProviderConfigManager';

jest.mock('@src/config/ProviderConfigManager');
jest.mock('@src/monitoring/MetricsCollector', () => ({
    MetricsCollector: {
        getInstance: () => ({
            recordLlmTokenUsage: jest.fn()
        })
    }
}));
jest.mock('@config/llmConfig', () => ({
    get: jest.fn()
}));

const MockOpenAI = jest.fn();
jest.mock('@hivemind/provider-openai', () => ({
  OpenAiProvider: class {
      constructor(config: any) {
          MockOpenAI(config);
      }
      generateChatCompletion() {}
      generateCompletion() {}
  }
}), { virtual: true });

const mockGetAllProviders = jest.fn();
(ProviderConfigManager.getInstance as jest.Mock).mockReturnValue({
  getAllProviders: mockGetAllProviders
});

describe('getLlmProvider Caching', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reuse provider instance if config is unchanged', () => {
        const config = {
            id: 'test-cache-1',
            type: 'openai',
            name: 'Test Cache 1',
            enabled: true,
            config: { key: 'val1' }
        };

        mockGetAllProviders.mockReturnValue([config]);

        getLlmProvider();
        expect(MockOpenAI).toHaveBeenCalledTimes(1);
        expect(MockOpenAI).toHaveBeenCalledWith({ key: 'val1' });

        getLlmProvider();
        expect(MockOpenAI).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should create new instance if config changes', () => {
        const config1 = {
            id: 'test-cache-2',
            type: 'openai',
            name: 'Test Cache 2',
            enabled: true,
            config: { key: 'val1' }
        };

        mockGetAllProviders.mockReturnValue([config1]);
        getLlmProvider();

        // MockOpenAI called once for test-cache-2
        const initialCalls = MockOpenAI.mock.calls.length;

        // Change config
        const config2 = {
            ...config1,
            config: { key: 'val2' }
        };
        mockGetAllProviders.mockReturnValue([config2]);

        getLlmProvider();
        expect(MockOpenAI).toHaveBeenCalledTimes(initialCalls + 1);
        expect(MockOpenAI).toHaveBeenLastCalledWith({ key: 'val2' });
    });

    it('should cleanup stale providers', () => {
        const config = {
            id: 'test-cache-3',
            type: 'openai',
            name: 'Test Cache 3',
            enabled: true,
            config: { key: 'val3' }
        };

        // 1. Add
        mockGetAllProviders.mockReturnValue([config]);
        getLlmProvider();
        const callsAfterAdd = MockOpenAI.mock.calls.length;

        // 2. Remove (return empty)
        mockGetAllProviders.mockReturnValue([]);
        getLlmProvider(); // This should trigger prune

        // 3. Add back (same config)
        mockGetAllProviders.mockReturnValue([config]);
        getLlmProvider();

        // It should have been re-instantiated because it was pruned in step 2
        // So calls should increment
        expect(MockOpenAI.mock.calls.length).toBeGreaterThan(callsAfterAdd);
    });
});
