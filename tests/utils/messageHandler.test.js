jest.mock('../../src/utils/fetchConversationHistory', () => jest.fn());
jest.mock('axios', () => ({ post: jest.fn() }));

const fetchConversationHistory = require('../../src/utils/fetchConversationHistory');
const axios = require('axios');
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
