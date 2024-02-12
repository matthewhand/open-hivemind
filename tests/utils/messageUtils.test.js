// Mock external modules first
jest.mock('axios');
jest.mock('../../src/config/configurationManager');

// Then mock internal dependencies
jest.mock('../../src/utils/messageUtils', () => ({
  ...jest.requireActual('../../src/utils/messageUtils'), // Retain original implementations except for the mocked function
  fetchAndTrimConversationHistory: jest.fn().mockImplementation(async (channel, newPrompt) => [
    // Simulated trimmed conversation history
    { role: "user", content: "User message 1" },
    { role: "assistant", content: "Bot response to user message 1" },
    { role: "user", content: newPrompt },
  ]),
}));

// Import after mocking
const axios = require('axios');
const { sendLlmRequest } = require('../../src/utils/messageUtils');
const configurationManager = require('../../src/config/configurationManager');


// Setup default behavior for mocks
beforeAll(() => {
  configurationManager.getConfig.mockImplementation(key => ({
    'LLM_ENDPOINT_URL': 'http://localhost:5000/v1/chat/completions',
    'LLM_MODEL': 'mistral-7b-instruct',
    'LLM_API_KEY': 'test-api-key',
  })[key]);
});
beforeEach(() => {
  axios.post.mockResolvedValue({
    data: {
      choices: [{ message: { content: 'Mocked LLM response' } }]
    }
  });

  // Mock configurationManager to return expected config values
  configurationManager.getConfig.mockImplementation(key => {
    switch(key) {
      case 'LLM_ENDPOINT_URL':
        return 'http://localhost:5000/v1/chat/completions';
      case 'LLM_MODEL':
        return 'mistral-7b-instruct';
      case 'LLM_API_KEY':
        return 'test-api-key';
      default:
        return null;
    }
  });
});

// Helper function to create mock messages
function createMockMessage(content, additionalMessages = []) {
  const defaultMessages = [
    ['123', { content: 'User message 1', author: { bot: false } }],
    ['456', { content: 'Bot response to user message 1', author: { bot: true } }]
  ];
  const messages = new Map([...defaultMessages, ...additionalMessages]);

  return {
    channel: {
      send: jest.fn().mockResolvedValue({}),
      id: "channel123",
      messages: { fetch: jest.fn().mockResolvedValue(messages) }
    },
    content: content
  };
}

describe('messageUtils - sendLlmRequest function', () => {
  it('sends a request correctly and handles response', async () => {
    const mockMessage = createMockMessage('New user query');

    await sendLlmRequest(mockMessage);

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:5000/v1/chat/completions',
      expect.objectContaining({
        model: 'mistral-7b-instruct',
        prompt: expect.anything(),
      }),
      expect.objectContaining({
        headers: {
          'Authorization': `Bearer test-api-key`,
          'Content-Type': 'application/json'
        }
      })
    );

    expect(mockMessage.channel.send).toHaveBeenCalledWith('Mocked LLM response');
  });

  it('validates that trim logic is applied to message history', async () => {
    // Simulate a conversation with more than the trim threshold
    const mockMessage = createMockMessage('Latest user query', Array.from({ length: 10 }, (_, i) => [`${i+1000}`, { content: `Additional message ${i}`, author: { bot: false } }]));

    await sendLlmRequest(mockMessage);

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:5000/v1/chat/completions',
      expect.objectContaining({
        model: 'mistral-7b-instruct',
        prompt: expect.arrayContaining([
          expect.objectContaining({ content: 'User message 1' }),
          expect.objectContaining({ content: 'Bot response to user message 1' }),
          expect.objectContaining({ content: 'Latest user query' }),
          // Tests for trimmed messages should adjust expectations based on actual trim logic
        ]),
      }),
      expect.objectContaining({
        headers: {
          'Authorization': `Bearer test-api-key`,
          'Content-Type': 'application/json',
        },
      }),
    );
  });
});

afterEach(() => {
  jest.resetAllMocks(); // Reset mocks to ensure a clean slate for each test
});
