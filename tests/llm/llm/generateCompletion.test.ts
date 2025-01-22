// Mock the llmConfig module
jest.mock('@llm/interfaces/llmConfig', () => ({
    get: jest.fn(),
}));

// Mock getLlmProvider to return a mock provider with all required methods
jest.mock('@src/message/management/getLlmProvider', () => ({
    __esModule: true,
    getLlmProvider: jest.fn(),
}));

import { sendCompletions } from '../../../src/llm/llm/generateCompletion';
import { IMessage } from '@src/message/interfaces/IMessage';
import * as getLlmProviderModule from '@src/message/management/getLlmProvider';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';

describe('sendCompletions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should send completions for given messages', async () => {
        const mockGenerateCompletion = jest.fn().mockResolvedValue('Mock Completion');

        // Create a mock ILlmProvider with all required methods
        const mockLlmProvider: ILlmProvider = {
            generateCompletion: mockGenerateCompletion,
            supportsChatCompletion: jest.fn().mockReturnValue(true),
            supportsCompletion: jest.fn().mockReturnValue(true),
            generateChatCompletion: jest.fn().mockResolvedValue('Mock Chat Completion'),
        };

        jest.spyOn(getLlmProviderModule, 'getLlmProvider').mockReturnValue(mockLlmProvider);

        const messages: IMessage[] = [
            { getText: () => 'Hello' } as IMessage,
            { getText: () => 'world' } as IMessage
        ];

        const result = await sendCompletions(messages);

        expect(getLlmProviderModule.getLlmProvider).toHaveBeenCalled();
        expect(mockGenerateCompletion).toHaveBeenCalledWith('Hello world');
        expect(result).toBe('Mock Completion');
    });
});