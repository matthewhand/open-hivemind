// tests/handlers/messageHandler.test.js
const { messageHandler } = require('../../src/handlers/messageHandler');
const DiscordMessage = require('../../src/models/DiscordMessage');
const DiscordManager = require('../../src/managers/DiscordManager');
jest.mock('../../src/managers/DiscordManager');

const OpenAiManager = require('../../src/managers/OpenAiManager');
jest.mock('../../src/managers/OpenAiManager');

describe('messageHandler', () => {
    let mockSendResponse;
    let mockFetchMessages;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock the DiscordManager's getInstance method to return specific mocked functions
        DiscordManager.getInstance.mockReturnValue({
            sendResponse: mockSendResponse = jest.fn().mockResolvedValueOnce(true),
            fetchMessages: mockFetchMessages = jest.fn().mockResolvedValueOnce([
                { content: "User message", author: { id: "user-id" } },
                // Add more mock messages as needed
            ]),
            getBotId: jest.fn().mockReturnValue('mocked-bot-id'),
        });

        // Mock OpenAiManager's constructor and methods if necessary
        OpenAiManager.mockImplementation(() => ({
            sendRequest: jest.fn().mockResolvedValue({
                choices: [{ message: { content: 'Mocked response' } }],
            }),
            buildRequestBody: jest.fn().mockReturnValue({}),
            requiresHistory: jest.fn().mockReturnValue(true),
        }));
    });

    it('responds to user messages correctly', async () => {
      // Prepare a mock Discord.js message object
      const mockDiscordJsMessage = {
          content: 'Hello, world!',
          channel: { id: 'test-channel-id' },
          author: { id: 'user-id', bot: false }
      };
  
      // Wrap the mock Discord.js message object in a DiscordMessage instance
      const userMessage = new DiscordMessage(mockDiscordJsMessage);
  
      // Call the messageHandler with the DiscordMessage instance
      await messageHandler(userMessage);
  
      // Assertions to verify that sendResponse was called correctly
      expect(mockSendResponse).toHaveBeenCalledWith('test-channel-id', 'Mocked response');
      expect(mockSendResponse).toHaveBeenCalledTimes(1);
      // Additional assertions as needed...
  });
    // Additional tests can be added to cover different scenarios and edge cases
});
