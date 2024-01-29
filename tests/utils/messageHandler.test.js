jest.mock('../../src/utils/fetchConversationHistory', () => jest.fn());
jest.mock('axios', () => ({ post: jest.fn() }));

const fetchConversationHistory = require('../../src/utils/fetchConversationHistory');
const axios = require('axios');
jest.mock('../../src/utils/configUtils', () => ({
    config: {
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
        }
    }
}));
const { messageHandler } = require('../../src/utils/messageHandler');

describe('messageHandler Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock setup as before...
    });

    test('ignores bot messages if BOT_TO_BOT_MODE is disabled', async () => {
        // Mock a message from a bot
        const botMessage = {
            author: { bot: true },
            client: { user: { id: 'bot-id' } },
            reply: jest.fn()
        };

        await messageHandler(botMessage);

        // Assertions to verify the behavior
        expect(fetchConversationHistory).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
        expect(botMessage.reply).not.toHaveBeenCalled();
    });

    // Additional tests...
});
