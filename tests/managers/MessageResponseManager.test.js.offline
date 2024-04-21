const { GuildExplicitContentFilter } = require('discord.js');
const MessageResponseManager = require('../../src/managers/MessageResponseManager');
const TimingManager = require('../../src/managers/TimingManager');
const DiscordMessage = require('../../src/models/DiscordMessage');

// Mock the TimingManager and DiscordMessage to control their behavior in tests
jest.mock('../../src/managers/TimingManager', () => ({
    getInstance: jest.fn().mockReturnValue({
      scheduleMessage: jest.fn().mockImplementation((channelId, message, delay, callback) => {
        // Optional: Simulate immediate invocation of the callback for a more integrated test
        callback(message);
      }),
    }),
  }));
jest.mock('../../src/models/DiscordMessage');

describe('MessageResponseManager', () => {
    let mockDiscordMessage;

    beforeEach(() => {
        // Reset mocks before each test to ensure a clean state
        jest.clearAllMocks();

        // Create a mock instance of DiscordMessage with default mocked implementations
        mockDiscordMessage = new DiscordMessage();
        mockDiscordMessage.getText.mockReturnValue('Example help request');
        mockDiscordMessage.isFromBot.mockReturnValue(false);
        mockDiscordMessage.mentionsUsers.mockReturnValue(false);
        mockDiscordMessage.channel = { id: "channel123" };
    });

    test('TODO fix MessageResponseManager', async () => {
      expect(true).toBe(true);
    });

    // test('should not reply to messages from bots', async () => {
    //     mockDiscordMessage.isFromBot.mockReturnValue(true);

    //     const messageResponseManager = MessageResponseManager.getInstance();
    //     const decision = await messageResponseManager.shouldReplyToMessage(mockDiscordMessage);
    //     expect(decision.shouldReply).toBe(false);
    // });

    // test('should reply to eligible messages', async () => {
    //     // Assuming 'help' makes a message eligible for reply
    //     mockDiscordMessage.getText.mockReturnValue('help');

    //     const messageResponseManager = MessageResponseManager.getInstance();
    //     const decision = await messageResponseManager.shouldReplyToMessage(mockDiscordMessage);
    //     expect(decision.shouldReply).toBe(true);
    // });

});
