import { getLlmProvider } from '@llm/getLlmProvider';
import { openAiProvider } from '@src/integrations/openai/openAiProvider';
import flowiseProvider from '@src/integrations/flowise/flowiseProvider';
import * as openWebUI from '@src/integrations/openwebui/runInference';

// Mock the llmConfig module
jest.mock('@llm/interfaces/llmConfig', () => ({
    get: jest.fn((key: string) => {
        const config: { [key: string]: string } = {
            'LLM_PROVIDER': 'openai', // You can change this value to 'flowise' or 'openwebui' to test different providers
        };
        return config[key];
    }),
}));

describe('getLlmProvider', () => {
    it('should return openAiProvider when LLM_PROVIDER is openai', () => {
        const provider = getLlmProvider();
        expect(provider).toBeDefined();
        expect(provider).toBe(openAiProvider);
    });

    it('should return flowiseProvider when LLM_PROVIDER is flowise', () => {
        // Update the mock to return 'flowise'
        const llmConfig = require('@llm/interfaces/llmConfig');
        llmConfig.get.mockReturnValue('flowise');

        const provider = getLlmProvider();
        expect(provider).toBeDefined();
        expect(provider).toBe(flowiseProvider);
    });

    it('should return openWebUI when LLM_PROVIDER is openwebui', () => {
        // Update the mock to return 'openwebui'
        const llmConfig = require('@llm/interfaces/llmConfig');
        llmConfig.get.mockReturnValue('openwebui');

        const provider = getLlmProvider();
        expect(provider).toBeDefined();
        expect(provider).toBe(openWebUI);
    });

    it('should throw an error for unknown LLM_PROVIDER', () => {
        // Update the mock to return an unknown provider
        const llmConfig = require('@llm/interfaces/llmConfig');
        llmConfig.get.mockReturnValue('unknown');

        expect(() => getLlmProvider()).toThrow('Unknown LLM provider: unknown');
    });
});