// Assuming configuration and utility functions are now correctly centralized
// and that 'configUtils.js' is the module where configurations are managed.
const { messageHandler } = require('../../src/handlers/messageHandler');
jest.mock('../../src/utils/fetchConversationHistory', () => jest.fn());
jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../../src/config/configUtils', () => ({
  config: {
    BOT_TO_BOT_MODE: 'true', // Example configuration
    // Other configurations as needed...
  }
}));

// Mock any additional dependencies as needed
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const fetchConversationHistory = require('../../src/utils/fetchConversationHistory');
const axios = require('axios');
const { config } = require('../../src/config/configUtils');

describe('messageHandler Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ignores bot messages if BOT_TO_BOT_MODE is disabled', async () => {
        // Adjust this test according to the actual logic in messageHandler
        const botMessage = {
            author: { bot: true },
            client: { user: { id: 'bot-id' } },
            reply: jest.fn(),
            content: '!test command'
        };

        // Temporarily set BOT_TO_BOT_MODE to simulate the environment
        config.BOT_TO_BOT_MODE = 'false';
        await messageHandler(botMessage);

        expect(fetchConversationHistory).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
        expect(botMessage.reply).not.toHaveBeenCalled();
    });

    test('processes message from non-bot when BOT_TO_BOT_MODE is enabled', async () => {
        // Simulate a user message scenario
        const userMessage = {
            author: { bot: false },
            client: { user: { id: 'user-id' } },
            reply: jest.fn(),
            content: '!test command'
        };

        // Ensure BOT_TO_BOT_MODE is enabled for this test
        config.BOT_TO_BOT_MODE = 'true';
        await messageHandler(userMessage);

        // Add assertions based on expected behavior, such as command parsing and handling
        // This depends on the implementation details of your messageHandler
    });

    afterEach(() => {
        // Reset any mocked configurations or cleanup as necessary
    });
});
