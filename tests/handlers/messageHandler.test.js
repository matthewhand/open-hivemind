// Import dependencies and mock as needed
const { messageHandler } = require('../../src/handlers/messageHandler');
jest.mock('../../src/models/DiscordMessage');
const DiscordManager = require('../../src/managers/DiscordManager');
jest.mock('../../src/managers/DiscordManager');
const OpenAiManager = require('../../src/managers/OpenAiManager');
jest.mock('../../src/managers/OpenAiManager');

describe('messageHandler', () => {
    let mockSendResponse;
    let mockFetchMessages;

    beforeEach(() => {
        jest.clearAllMocks(); // Reset mocks before each test

        // Mocking DiscordManager's getInstance to return specific functions
        mockSendResponse = jest.fn();
        mockFetchMessages = jest.fn().mockResolvedValue([
            { getText: () => "User message", getAuthorId: () => "user-id", getChannelId: () => "test-channel-id" }
        ]);

        DiscordManager.getInstance = jest.fn().mockReturnValue({
            sendResponse: mockSendResponse,
            fetchMessages: mockFetchMessages,
        });

        // Mocking OpenAiManager's response to simulate the OpenAI API response
        OpenAiManager.prototype.sendRequest = jest.fn().mockResolvedValue({
            choices: [{
                message: {
                    role: "assistant",
                    content: "Mocked response"
                }
            }]
        });
    });

    it('responds to user messages correctly', async () => {
        // Mocked message input to messageHandler
        const mockDiscordMessage = {
            getText: () => 'Hello, world!',
            getChannelId: () => 'test-channel-id',
            getAuthorId: () => 'user-id',
        };

        // Call the messageHandler with the mocked DiscordMessage
        await messageHandler(mockDiscordMessage);

        // Assertions to verify correct behavior
        expect(mockSendResponse).toHaveBeenCalledWith('test-channel-id', 'Mocked response');
        expect(mockSendResponse).toHaveBeenCalledTimes(1);
    });

    // Additional tests to cover various scenarios and edge cases...
});
