const axios = require('axios');
const { sendLlmRequest } = require('../../src/utils/messageUtils');
jest.mock('axios'); // Mocking Axios to prevent actual HTTP requests

describe('sendLlmRequest', () => {
    const mockMessage = {
        channel: {
            send: jest.fn()
        }
    };

    beforeEach(() => {
        jest.clearAllMocks(); // Clears the mock call history before each test
    });

    it('sends a request with conversation history and handles response', async () => {
        const conversationHistory = [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is the weather like today?' },
            { role: 'assistant', content: 'The weather is sunny.' }
        ];
        const newPrompt = 'Should I take an umbrella?';
        
        const mockResponse = {
            data: {
                choices: [{
                    text: 'No, it should be fine without one.'
                }]
            }
        };
        axios.post.mockResolvedValue(mockResponse); // Mocking Axios' response

        await sendLlmRequest(mockMessage, conversationHistory, newPrompt);

        expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
            model: expect.any(String),
            messages: [
                ...conversationHistory,
                { role: "user", content: newPrompt }
            ],
        }, expect.objectContaining({ headers: expect.any(Object) }));

        // Verify the message.channel.send was called with the expected response
        expect(mockMessage.channel.send).toHaveBeenCalledWith('No, it should be fine without one.');
    });

    // Add more tests as needed to cover different scenarios, error handling, etc.
});
