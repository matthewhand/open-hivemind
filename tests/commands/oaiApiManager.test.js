// oaiApiManager.test.js

// Import dependencies
const axios = require('axios');
jest.mock('axios'); // Mock axios for all HTTP requests

// Mock the configuration constants
jest.mock('../../src/config/constants', () => ({
  ...jest.requireActual('../../src/config/constants'), // Preserve other constants
  LLM_API_KEY: 'DUMMY-KEY-OOBABOOGAFTW', // Mock the API Key
  LLM_ENDPOINT_URL: 'http://localhost:5000/v1/chat/completions', // Ensure endpoint matches expected test value
}));

// Import the module under test after mocks are defined
const oaiApiManager = require('../../src/managers/oaiApiManager');
const constants = require('../../src/config/constants');

describe('OAI API Manager Tests', () => {
    beforeEach(() => {
        // Clear all mock instances and calls before each test
        axios.post.mockClear();
    });

    it('sends a request and receives a successful response', async () => {
        // Setup mock response for axios
        const mockResponse = { data: { choices: [{ message: { content: 'Test response' } }] } };
        axios.post.mockResolvedValue(mockResponse);

        const requestBody = {
            model: 'text-davinci-003',
            messages: ['Hello, world!']
        };

        // Execute the function to be tested
        const response = await oaiApiManager.sendRequest(requestBody);

        // Assert that the response matches the mock and axios was called correctly
        expect(response).toEqual(mockResponse.data);
        expect(axios.post).toHaveBeenCalledWith(
            constants.LLM_ENDPOINT_URL,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${constants.LLM_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
    });

    it('handles API errors gracefully', async () => {
        // Setup axios to mock a rejected promise with an error
        const errorMessage = 'API Error';
        axios.post.mockRejectedValue(new Error(errorMessage));

        const requestBody = {
            model: 'text-davinci-003',
            messages: ['Error test']
        };

        // Assert that the function throws the expected error
        await expect(oaiApiManager.sendRequest(requestBody)).rejects.toThrow(errorMessage);
    });

    describe('buildRequestBody functionality', () => {
        it('correctly formats the request body with chat history', () => {
            // Setup test data
            const historyMessages = [{ userId: "user1", content: "How are you?" }];
            const userMessage = "I'm fine, thanks!";
            const botUserId = "bot-user-id";
            const model = 'text-davinci-003';

            // Execute the function to be tested
            const requestBody = oaiApiManager.buildRequestBody(historyMessages, userMessage, botUserId, model);

            // Assert that the request body is correctly formatted
            expect(requestBody).toHaveProperty('model', model);
            expect(requestBody.messages).toEqual(expect.arrayContaining([
                { role: 'system', content: constants.SYSTEM_PROMPT },
                { role: 'user', content: expect.stringContaining("How are you?") },
            ]));
        });
    });

    // Additional tests for more complex scenarios or specific edge cases can be added here
});
