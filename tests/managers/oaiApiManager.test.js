const OpenAiManager = require('../../src/managers/oaiApiManager');
const constants = require('../../src/config/constants');

describe('OpenAiManager buildRequestBody', () => {
    const openAiManager = new OpenAiManager();
    const model = constants.LLM_MODEL;
    const systemPrompt = constants.LLM_SYSTEM_PROMPT; // Ensure this is correctly sourced

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('correctly structures payload with mixed message history and system prompt', () => {
        const historyMessages = [
            { role: 'user', content: 'Hello, how are you?' },
            { role: 'user', content: 'I am fine, thank you!' } // Assuming all history messages are from 'user'
        ];
        const userMessage = 'Can you tell me a joke?';

        const expectedPayload = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...historyMessages,
                { role: 'user', content: userMessage }
            ],
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };

        const payload = openAiManager.buildRequestBody(historyMessages, userMessage);
        expect(payload).toEqual(expectedPayload);
    });

    test('handles empty message history', () => {
        const historyMessages = [];
        const userMessage = 'Hello!';

        const expectedPayload = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };

        const payload = openAiManager.buildRequestBody(historyMessages, userMessage);
        expect(payload).toEqual(expectedPayload);
    });

    // Additional tests as needed...
});
