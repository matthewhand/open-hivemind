import { shouldReplyToMessage, setDecayConfig } from '@message/helpers/processing/shouldReplyToMessage';
import messageConfig from '@config/messageConfig';
import discordConfig from '@config/discordConfig';
import { IMessage } from '@message/interfaces/IMessage';

// Mocking dependencies
jest.mock('@config/messageConfig');
jest.mock('@config/discordConfig');

const mockedMessageConfig = messageConfig as jest.Mocked<typeof messageConfig>;
const mockedDiscordConfig = discordConfig as jest.Mocked<typeof discordConfig>;

const createMockMessage = (text: string, authorId: string = 'user-id', isBot: boolean = false): IMessage => ({
    getText: () => text,
    getAuthorId: () => authorId,
    getChannelId: () => 'test-channel',
    isFromBot: () => isBot,
    mentionsUsers: (userId: string) => text.includes(userId),
} as any);

describe('shouldReplyToMessage', () => {
    const botId = 'bot-id';

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset process.env
        delete process.env.FORCE_REPLY;
        
        // Default config mocks
        (mockedMessageConfig.get as jest.Mock).mockImplementation((key: string) => {
            switch (key) {
                case 'MESSAGE_RECENT_ACTIVITY_DECAY_RATE': return 0; // No decay for simplicity
                case 'MESSAGE_ACTIVITY_TIME_WINDOW': return 300000;
                case 'MESSAGE_WAKEWORDS': return 'hey bot,yo';
                case 'MESSAGE_INTERROBANG_BONUS': return 0.3;
                case 'MESSAGE_BOT_RESPONSE_MODIFIER': return -1.0;
                default: return undefined;
            }
        });

        (mockedDiscordConfig.get as jest.Mock).mockImplementation((key: string) => {
            switch (key) {
                case 'DISCORD_CLIENT_ID': return botId;
                case 'DISCORD_PRIORITY_CHANNEL': return 'priority-channel';
                case 'DISCORD_PRIORITY_CHANNEL_BONUS': return 0.5;
                case 'DISCORD_CHANNEL_BONUSES': return { 'test-channel': 2.0 }; // Multiplier
                default: return undefined;
            }
        });

        // Reset the internal state of the module
        setDecayConfig(0, 300000);
        jest.spyOn(Math, 'random').mockReturnValue(0.1); // Base chance is 0.2, so this should pass unless modified
    });

    afterEach(() => {
        jest.spyOn(Math, 'random').mockRestore();
    });

    it('should always reply when FORCE_REPLY is true', () => {
        process.env.FORCE_REPLY = 'true';
        const message = createMockMessage('any message');
        expect(shouldReplyToMessage(message, botId, 'generic')).toBe(true);
    });

    it('should not reply if the message is from the bot itself', () => {
        const message = createMockMessage('a message from me', botId);
        expect(shouldReplyToMessage(message, botId, 'discord')).toBe(false);
    });

    it('should always reply if the bot is mentioned', () => {
        const message = createMockMessage(`hello ${botId}`);
        expect(shouldReplyToMessage(message, botId, 'generic')).toBe(true);
    });

    it('should always reply if a wakeword is used', () => {
        const message = createMockMessage('hey bot, how are you?');
        expect(shouldReplyToMessage(message, botId, 'generic')).toBe(true);
    });

    it('should apply interrobang bonus for questions or exclamations', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.4); // base 0.2 + bonus 0.3 = 0.5. 0.4 < 0.5 -> true
        const message = createMockMessage('What is this?');
        expect(shouldReplyToMessage(message, botId, 'generic')).toBe(true);

        const message2 = createMockMessage('Wow!');
        expect(shouldReplyToMessage(message2, botId, 'generic')).toBe(true);
    });

    it('should apply negative modifier for messages from other bots', () => {
        const message = createMockMessage('I am another bot', 'other-bot-id', true);
        expect(shouldReplyToMessage(message, botId, 'generic')).toBe(false);
    });

    it('should apply discord priority channel bonus', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.6); // base 0.2 + bonus 0.5 = 0.7. 0.6 < 0.7 -> true
        const message = createMockMessage('a message');
        message.getChannelId = () => 'priority-channel';
        expect(shouldReplyToMessage(message, botId, 'discord')).toBe(true);
    });

    it('should apply discord channel bonus multiplier', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.3); // base 0.2 * bonus 2.0 = 0.4. 0.3 < 0.4 -> true
        const message = createMockMessage('another message');
        expect(shouldReplyToMessage(message, botId, 'discord')).toBe(true);
    });

    it('should return false if final chance is below random value', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.3); // base 0.2. 0.3 > 0.2 -> false
        const message = createMockMessage('a normal message');
        expect(shouldReplyToMessage(message, botId, 'generic')).toBe(false);
    });
});
