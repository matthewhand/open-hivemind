// Import necessary modules and functions
const { messageHandler } = require('../../src/handlers/messageHandler');
const DiscordManager = require('../../src/managers/DiscordManager');

// Mock the DiscordManager module
jest.mock('../../src/managers/DiscordManager', () => {
  return {
    getInstance: jest.fn().mockReturnValue({
      sendResponse: jest.fn().mockResolvedValueOnce(true),
      fetchMessages: jest.fn().mockResolvedValueOnce([]),
      getBotId: jest.fn().mockReturnValue('mocked-bot-id'),
    }),
  };
});

// Mock other dependencies as necessary
jest.mock('../../src/config/constants', () => ({
  LLM_PROVIDER: 'OpenAI',
}));
jest.mock('../../src/managers/OpenAiManager', () => {
  return jest.fn().mockImplementation(() => ({
    sendRequest: jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Mocked response' } }],
    }),
    buildRequestBody: jest.fn().mockReturnValue({}),
    requiresHistory: jest.fn().mockReturnValue(true),
  }));
});

describe('messageHandler', () => {
  let mockSendResponse;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup and retrieve the mocked sendResponse function for easier access
    mockSendResponse = DiscordManager.getInstance().sendResponse;
  });

  test('responds to user messages', async () => {
    const userMessage = {
      author: { bot: false },
      content: 'Hello, world!',
      channel: { id: 'test-channel' },
    };

    // Call the messageHandler with the mock message
    await messageHandler(userMessage);

    // Assert that sendResponse was called correctly
    expect(mockSendResponse).toHaveBeenCalledTimes(1);
    expect(mockSendResponse).toHaveBeenCalledWith('test-channel', 'Mocked response');
  });
});
