// Import necessary modules and mock them as needed
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
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock the implementation of getInstance to return specific mocked functions for DiscordManager
        DiscordManager.getInstance.mockReturnValue({
            sendResponse: mockSendResponse = jest.fn(),
            fetchMessages: mockFetchMessages = jest.fn().mockResolvedValue([
                new DiscordMessage({ content: "User message", authorId: "user-id", channelId: "test-channel-id" }),
                // Add more mock messages as needed, ensuring they are instances of DiscordMessage
            ]),
            // Assuming getBotId is no longer needed if using constants.CLIENT_ID directly
        });

        // Adjust the OpenAiManager mock to return a mocked response structure
        OpenAiManager.mockImplementation(() => ({
            sendRequest: jest.fn().mockResolvedValue({
                choices: [{ text: 'Mocked response' }], // Adjust based on the expected API response format
            }),
            buildRequestBody: jest.fn().mockReturnValue({}),
            requiresHistory: jest.fn().mockReturnValue(true),
        }));
    });

    it('responds to user messages correctly', async () => {
        // Prepare a mock Discord.js message object correctly
        const mockDiscordJsMessage = {
            content: 'Hello, world!',
            author: { id: 'user-id' }, // Correct structure
            channel: { id: 'test-channel-id' },
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

    // Additional tests to cover different scenarios and edge cases
});
