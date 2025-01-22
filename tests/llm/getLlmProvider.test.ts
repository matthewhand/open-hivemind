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
    it('should return the OpenAI provider when LLM_PROVIDER is openai', () => {
        const provider = getLlmProvider();
        expect(provider).toBe(openAiProvider);
    });

    it('should return the Flowise provider when LLM_PROVIDER is flowise', () => {
        const llmConfig = require('@llm/interfaces/llmConfig');
        llmConfig.get.mockReturnValue('flowise');
        const provider = getLlmProvider();
        expect(provider).toBe(flowiseProvider);
    });

    // it('should return the OpenWebUI provider when LLM_PROVIDER is openwebui', () => {
    //     const llmConfig = require('@llm/interfaces/llmConfig');
    //     llmConfig.get.mockReturnValue('openwebui');
    //     const provider = getLlmProvider();
    //     expect(provider).toBe(openWebUI);
    // });

    it('should throw an error for unknown LLM_PROVIDER', () => {
        const llmConfig = require('@llm/interfaces/llmConfig');
        llmConfig.get.mockReturnValue('unknown');
        expect(() => getLlmProvider()).toThrow('Unknown LLM provider: unknown');
    });
});