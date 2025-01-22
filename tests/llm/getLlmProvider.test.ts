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

    it('should throw an error for unknown LLM_PROVIDER', () => {
        // Update the mock to return an unknown provider
        const llmConfig = require('@llm/interfaces/llmConfig');
        llmConfig.get.mockReturnValue('unknown');

        expect(() => getLlmProvider()).toThrow('Unknown LLM provider: unknown');
    });
});