
// Import necessary modules and functions
const { messageHandler } = require('../../src/handlers/messageHandler');
const DiscordManager = require('../../src/managers/DiscordManager');

// Enhanced mocking of the DiscordManager module
jest.mock('../../src/managers/DiscordManager', () => ({
  getInstance: jest.fn().mockReturnValue({
    sendResponse: jest.fn().mockResolvedValueOnce(true),
    fetchMessages: jest.fn().mockResolvedValueOnce([
      { content: "User message", author: { id: "user-id" } },
      // Add more mock messages as needed
    ]),
    fetchLastNonBotMessage: jest.fn().mockResolvedValue({
      content: "Last non-bot message content",
      author: { id: "another-user-id" },
    }),
    getBotId: jest.fn().mockReturnValue('mocked-bot-id'),
  }),
}));

// Mock other dependencies as necessary
jest.mock('../../src/config/constants', () => ({
  LLM_PROVIDER: 'OpenAI',
  BOT_TO_BOT_MODE: true, // Example of how you might mock this constant if used
}));

jest.mock('../../src/managers/OpenAiManager', () => {
  // Mock the constructor function
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

  // Add more tests as needed to cover new functionality and edge cases
});
