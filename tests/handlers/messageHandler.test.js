// Mocking necessary modules
jest.mock('../../src/config/configurationManager');
jest.mock('../../src/managers/DiscordManager', () => {
  const sendResponse = jest.fn().mockResolvedValue(true); // Prepare mock function here for direct reference
  return {
    getInstance: jest.fn().mockReturnValue({
      sendResponse, // Use the prepared mock function
      fetchMessages: jest.fn().mockResolvedValue([]), // Add fetchMessages mock if needed for other tests
    }),
  };
});
jest.mock('../../src/managers/oaiApiManager', () => {
  return jest.fn().mockImplementation(() => ({
    sendRequest: jest.fn().mockResolvedValue({
      choices: [{ text: 'Mocked response' }],
    }),
    requiresHistory: jest.fn().mockReturnValue(true), // Mock this method if your implementation uses it
  }));
});

// Requiring the module under test
const { messageHandler } = require('../../src/handlers/messageHandler');
const DiscordManager = require('../../src/managers/DiscordManager');
const configurationManager = require('../../src/config/configurationManager');

describe('messageHandler Tests', () => {
  let mockSendResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    configurationManager.getConfig.mockReturnValue('!'); // Example for command prefix or other configs

    // Resetting mockSendResponse to ensure a clean slate for each test
    mockSendResponse = DiscordManager.getInstance().sendResponse;
  });

  test('ignores bot messages', async () => {
    const mockMessage = {
      author: { bot: true },
      content: 'Hello from a bot',
      channel: { id: 'channel-id' },
    };
    await messageHandler(mockMessage);
    expect(mockSendResponse).not.toHaveBeenCalled();
  });

  test('handles messages from non-bot users', async () => {
    const message = {
      author: { bot: false },
      content: 'Hello from a user',
      channel: { id: 'channel-id' },
    };

    await messageHandler(message);

    // Use the direct reference to mockSendResponse prepared in beforeEach
    expect(mockSendResponse).toHaveBeenCalledWith('channel-id', 'Mocked response');
  });

  // Add more tests as needed for comprehensive coverage
});
