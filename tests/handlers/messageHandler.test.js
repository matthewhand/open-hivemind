// Adjust the import paths as necessary for your project structure
jest.mock('../../src/config/configurationManager');
jest.mock('../../src/utils/messageUtils');
jest.mock('../../src/utils/logger');
// Correctly mock the messageResponseManager with a custom implementation for shouldReplyToMessage
jest.mock('../../src/managers/messageResponseManager', () => ({
  messageResponseManager: jest.fn().mockImplementation(() => ({
    shouldReplyToMessage: jest.fn().mockReturnValue(true)
  })),
}));

const { messageHandler } = require('../../src/handlers/messageHandler');
const configurationManager = require('../../src/config/configurationManager');
const { sendLlmRequest } = require('../../src/utils/messageUtils');
const logger = require('../../src/utils/logger');
const { messageResponseManager } = require('../../src/managers/messageResponseManager');

describe('messageHandler Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        configurationManager.getConfig.mockImplementation(key => {
            if (key === 'BOT_TO_BOT_MODE') return 'true'; // Adjust according to test case needs
            return null;
        });
        sendLlmRequest.mockResolvedValue();
    });

    test('processes valid commands when BOT_TO_BOT_MODE is enabled', async () => {
        const mockMessage = {
            author: { bot: false },
            content: '!validCommand',
            reply: jest.fn(),
            client: { user: { id: 'bot-id' } },
            channel: { send: jest.fn() }
        };

        await messageHandler(mockMessage);
        // Assuming commandHandler or sendLlmRequest handles valid commands, adjust expectations as needed
    });

    test('ignores bot messages when BOT_TO_BOT_MODE is disabled', async () => {
        configurationManager.getConfig.mockReturnValueOnce('false');
        const mockMessage = {
            author: { bot: true },
            content: '!commandFromBot',
            reply: jest.fn(),
            client: { user: { id: 'bot-id' } },
            channel: { send: jest.fn() }
        };

        await messageHandler(mockMessage);
        expect(sendLlmRequest).not.toHaveBeenCalled();
    });

    test('generates a response based on dynamic decision making', async () => {
        const mockMessage = {
            author: { bot: false },
            content: 'Some message triggering dynamic response',
            reply: jest.fn(),
            client: { user: { id: 'bot-id' } },
            channel: { send: jest.fn() }
        };

        await messageHandler(mockMessage);
        expect(sendLlmRequest).toHaveBeenCalledWith(mockMessage, "Response based on dynamic decision making.");
    });

    test('handles errors gracefully', async () => {
        sendLlmRequest.mockRejectedValue(new Error('Test error')); // Force sendLlmRequest to reject
        const mockMessage = {
            author: { bot: false },
            content: '!commandCausingError',
            reply: jest.fn(),
            client: { user: { id: 'bot-id' } },
            channel: { send: jest.fn() }
        };
    
        await messageHandler(mockMessage);
        expect(mockMessage.reply).toHaveBeenCalledWith('An error occurred while processing your command.');
    });
        
    // Add more tests as needed to fully cover the expected behavior of messageHandler
});
