// Import necessary utilities and modules for testing
const axios = require('axios');
const { sendLlmRequest } = require('../../src/utils/messageUtils');
const configurationManager = require('../../src/config/configurationManager');

jest.mock('axios');
jest.mock('../../src/config/configurationManager');

describe('messageUtils', () => {
  beforeAll(() => {
    configurationManager.getConfig.mockImplementation((key) => ({
      'LLM_ENDPOINT_URL': 'http://localhost:5000/v1/chat/completions',
      'LLM_MODEL': 'mistral-7b-instruct',
      'LLM_API_KEY': 'test-api-key',
    })[key]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockReset();
  });

  it('sends a request correctly and handles response', async () => {
    const mockMessage = {
      channel: {
        send: jest.fn().mockResolvedValue({}),
        id: "channel123",
        messages: {
          fetch: jest.fn().mockResolvedValue(new Map([
            ['123', { content: 'Previous message 1', author: { bot: false } }],
            ['456', { content: 'Previous message 2', author: { bot: true } }],
          ]))
        }
      },
      content: 'Should I take an umbrella?'
    };

    const mockResponse = { data: { choices: [{ message: { content: 'Yes, it might rain later today.' } }] } };
    axios.post.mockResolvedValue(mockResponse);

    // Call the function under test with a mock message object
    await sendLlmRequest(mockMessage);

    // Verify axios.post was called correctly based on the setup
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        model: expect.any(String),
        prompt: expect.anything(),
      }),
      expect.objectContaining({
        headers: {
          'Authorization': `Bearer ${configurationManager.getConfig('LLM_API_KEY')}`,
          'Content-Type': 'application/json'
        }
      })
    );

    // Ensure the mock message's channel receives the correct response
    expect(mockMessage.channel.send).toHaveBeenCalledWith('Yes, it might rain later today.');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
});
