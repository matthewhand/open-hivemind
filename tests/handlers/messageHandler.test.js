// Define a mock configuration to be used in your tests
const mockConfig = {
    BOT_TO_BOT_MODE: 'false', // Adjust according to the needs of your tests
    deciderConfig: {
        interrobangBonus: 0.2,
        mentionBonus: 0.4,
        familiarBonus: 0.6,
        botResponsePenalty: 0.8,
        timeVsResponseChance: [[12345, 0.4], [420000, 0.6], [4140000, 0.2]],
        llmWakewords: ["!help"]
    },
    discordSettings: {
        unsolicitedChannelCap: 2
    },
    enabledModules: {
        flowise: true,
        quivr: true,
        http: true,
        python: true,
        help: true
    },
    // Add other configurations as needed
};

jest.mock('../../src/utils/fetchConversationHistory', () => jest.fn());
jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../../src/handlers/commandHandler', () => ({
    commandHandler: jest.fn().mockResolvedValue(undefined),
}));

const { messageHandler } = require('../../src/handlers/messageHandler');
const fetchConversationHistory = require('../../src/utils/fetchConversationHistory');
const axios = require('axios');
const { commandHandler } = require('../../src/handlers/commandHandler');

describe('messageHandler Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup mock environment
        process.env.BOT_TO_BOT_MODE = 'true'; // Assuming BOT_TO_BOT_MODE influences the behavior you're testing
        global.config = mockConfig; // Now mockConfig is defined
    });

    // Your tests...

    test('ignores bot messages if BOT_TO_BOT_MODE is disabled', async () => {
        // Previous test content...
    });

    test('processes valid command from a user', async () => {
        // Simulate a user message with a valid command
        const userMessage = {
            author: { bot: false },
            content: '!help test command', // Example command
            client: { user: { id: 'bot-id' } },
            reply: jest.fn()
        };

        await messageHandler(userMessage);

        // Verify that the commandHandler was called
        expect(commandHandler).toHaveBeenCalledWith(userMessage);
        expect(fetchConversationHistory).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
        expect(userMessage.reply).not.toHaveBeenCalled(); // Assuming the commandHandler handles replies
    });

    afterEach(() => {
        delete process.env.BOT_TO_BOT_MODE; // Clean up any environment variable changes
    });
});
