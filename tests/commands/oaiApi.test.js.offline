jest.mock('axios');

const oaiApi = require('../../src/services/oaiApi');
const axios = require('axios');
const constants = require('../../src/config/constants');
const oaiCommand = require('../../src/commands/inline/oai');


describe('OAI API Tests', () => {
    beforeEach(() => {
        axios.post.mockClear();
    });

    test('sends request with valid body', async () => {
        const mockResponse = { data: { choices: [{ message: { content: 'Test response' } }] } };
        axios.post.mockResolvedValue(mockResponse);

        const requestBody = { model: 'gpt-3.5-turbo', messages: ['Test message'] };
        const response = await oaiApi.sendRequest(requestBody);

        expect(response).toEqual(mockResponse.data);
        expect(axios.post).toHaveBeenCalledWith(constants.LLM_ENDPOINT_URL, requestBody, expect.any(Object));
    });

    test('handles API errors', async () => {
        axios.post.mockRejectedValue(new Error('API Error'));
        const requestBody = { model: 'gpt-3.5-turbo', messages: ['Test message'] };

        await expect(oaiApi.sendRequest(requestBody)).rejects.toThrow('API Error');
    });
});
