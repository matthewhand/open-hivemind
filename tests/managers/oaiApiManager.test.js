const OpenAiManager = require('../../src/managers/oaiApiManager');
const constants = require('../../src/config/constants');

describe('OpenAiManager buildRequestBody', () => {
    const openAiManager = new OpenAiManager();
    const model = constants.LLM_MODEL;
    const systemPrompt = constants.SYSTEM_PROMPT;

    beforeEach(() => {
        // Reset constants or mocks if necessary
    });

    test('correctly structures payload with a single user message', () => {
        const historyMessages = []; // No history
        const userMessage = 'What is AI?';

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

        const payload = openAiManager.buildRequestBody(historyMessages, userMessage, model);

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
    
        const payload = openAiManager.buildRequestBody(historyMessages, userMessage, model);
    
        expect(payload).toEqual(expectedPayload);
    });
        // Additional tests as needed...
});
