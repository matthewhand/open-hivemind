// Import necessary utilities and modules
const axios = require('axios');
const { sendLlmRequest, fetchConversationHistory, scheduleFollowUpRequest } = require('../../src/utils/messageUtils');
const configurationManager = require('../../src/config/configurationManager');
jest.mock('axios');
jest.mock('../../src/config/configurationManager');

describe('messageUtils', () => {
    // Mocking configurationManager to return specific configuration values
    beforeAll(() => {
        configurationManager.getConfig.mockImplementation((key) => {
            switch (key) {
                case 'LLM_ENDPOINT_URL':
                    return 'http://localhost:5000/v1/chat/completions';
                case 'LLM_MODEL':
                    return 'mistral-7b-instruct';
                case 'LLM_API_KEY':
                    return 'test-api-key'; // Providing a mock API key for testing
                default:
                    return null;
            }
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('sends a request with conversation history and handles response correctly', async () => {
        const mockMessage = {
            channel: {
                send: jest.fn().mockResolvedValue({})
            }
        };
        const conversationHistory = [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is the weather like today?' },
            { role: 'assistant', content: 'The weather is sunny.' }
        ];
        const newPrompt = 'Should I take an umbrella?';

        const mockResponse = {
            data: {
                response: 'No, it should be fine without one.'
            }
        };

        axios.post.mockResolvedValue(mockResponse);

        await sendLlmRequest(mockMessage, conversationHistory, newPrompt);

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:5000/v1/chat/completions',
            expect.objectContaining({
                model: 'mistral-7b-instruct',
                messages: expect.any(Array),
            }),
            expect.objectContaining({
                headers: { 'Authorization': 'Bearer test-api-key' }
            })
        );

        expect(mockMessage.channel.send).toHaveBeenCalledWith('No, it should be fine without one.');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });
});
