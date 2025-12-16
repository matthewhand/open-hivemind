
import { shouldReplyToMessage } from '../../../../src/message/helpers/processing/shouldReplyToMessage';
import { recordBotActivity, clearBotActivity } from '../../../../src/message/helpers/processing/ChannelActivity';
import { IncomingMessageDensity } from '../../../../src/message/helpers/processing/IncomingMessageDensity';
import messageConfig from '../../../../src/config/messageConfig';
import { shouldReplyToUnsolicitedMessage } from '../../../../src/message/helpers/unsolicitedMessageHandler';

// Mocks
jest.mock('../../../../src/message/helpers/processing/IncomingMessageDensity');
jest.mock('../../../../src/config/messageConfig');
jest.mock('../../../../src/message/helpers/unsolicitedMessageHandler');

describe('shouldReplyToMessage', () => {
    let mockMessage: any;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FORCE_REPLY = 'false';
        clearBotActivity();

        // Default Config Mocks
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_INTERROBANG_BONUS') return 0.2;
            if (key === 'MESSAGE_SHORT_LENGTH_PENALTY') return 0.1;
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
            if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 0.2;
            if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS') return 300000;
            if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE') return 2;
            if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR') return 0.25;
            if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR') return 3;
            return null;
        });

        // Default Helper Mocks
        (shouldReplyToUnsolicitedMessage as jest.Mock).mockReturnValue(true);
        (IncomingMessageDensity.getInstance as jest.Mock).mockReturnValue({
            recordMessageAndGetModifier: jest.fn().mockReturnValue(1.0),
            getUniqueParticipantCount: jest.fn().mockReturnValue(1)
        });

        // Default Message Mock
        mockMessage = {
            getChannelId: jest.fn().mockReturnValue('channel-1'),
            getText: jest.fn().mockReturnValue('Hello world this is a normal length message'),
            getAuthorId: jest.fn().mockReturnValue('user-1'),
            mentionsUsers: jest.fn().mockReturnValue(false),
            getUserMentions: jest.fn().mockReturnValue([]),
            isFromBot: jest.fn().mockReturnValue(false)
        };
    });

    it('should force reply if FORCE_REPLY env var is true', () => {
        process.env.FORCE_REPLY = 'true';
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
    });

    it('should return false if unsolicited handler rejects it', () => {
        (shouldReplyToUnsolicitedMessage as jest.Mock).mockReturnValue(false);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);
    });

    it('should apply silence penalty if inactive > 5 minutes', () => {
        const RealDate = Date;
        // Mock Date.now() for the "past" interaction
        global.Date.now = jest.fn(() => 1000);
        recordBotActivity('channel-1');

        // Mock Date.now() for the "current" check (> 5 mins later)
        global.Date.now = jest.fn(() => 1000 + 300001); // 1000 + 5m 1s

        // Base chance 0.2 -> Silence penalty (0.005)
        // Set random to 0.1 (would pass base 0.2, but should fail 0.005)
        jest.spyOn(Math, 'random').mockReturnValue(0.1);

        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);

        // Restore Date
        global.Date.now = RealDate.now;
    });

    it('should scale silence penalty based on participant count', () => {
        const RealDate = Date;
        global.Date.now = jest.fn(() => 1000);
        recordBotActivity('channel-1');

        global.Date.now = jest.fn(() => 1000 + 300001);

        // participants=1 => factor=2 => chance=0.01. Random 0.009 should pass.
        (IncomingMessageDensity.getInstance().getUniqueParticipantCount as jest.Mock).mockReturnValue(1);
        jest.spyOn(Math, 'random').mockReturnValue(0.009);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);

        // participants=6 => factor=2/6 => chance≈0.00166. Random 0.009 should fail.
        (IncomingMessageDensity.getInstance().getUniqueParticipantCount as jest.Mock).mockReturnValue(6);
        jest.spyOn(Math, 'random').mockReturnValue(0.009);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);

        global.Date.now = RealDate.now;
    });

    it('should NOT apply silence penalty if active < 5 minutes', () => {
        recordBotActivity('channel-1');

        // Advance ONLY 1 minute
        const RealDate = Date;
        global.Date.now = jest.fn(() => 60000);

        // Base 0.2. Match random 0.1. Should return TRUE.
        jest.spyOn(Math, 'random').mockReturnValue(0.1);

        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
        global.Date.now = RealDate.now;
    });

    it('should apply density modifier to chance', () => {
        // Density returns 0.1 (1/10th chance)
        (IncomingMessageDensity.getInstance().recordMessageAndGetModifier as jest.Mock).mockReturnValue(0.1);

        // Base 0.2 * 0.1 = 0.02.
        // Random 0.03 -> should fail.
        jest.spyOn(Math, 'random').mockReturnValue(0.03);

        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);
    });

    it('should return 0 (false) if author is the bot itself', () => {
        mockMessage.getAuthorId.mockReturnValue('bot-id');
        // Even if random is 0
        jest.spyOn(Math, 'random').mockReturnValue(0.0);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);
    });

    it('should return 1 (true) if bot is mentioned', () => {
        mockMessage.mentionsUsers.mockReturnValue(true);
        jest.spyOn(Math, 'random').mockReturnValue(0.99); // High random
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
    });

    it('should treat user mentions as direct mention', () => {
        mockMessage.mentionsUsers.mockReturnValue(false);
        (mockMessage.getUserMentions as jest.Mock).mockReturnValue(['bot-id']);
        jest.spyOn(Math, 'random').mockReturnValue(0.99);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
    });

    it('should return 1 (true) if wakeword is detected', () => {
        mockMessage.getText.mockReturnValue('hey bot what is up');
        jest.spyOn(Math, 'random').mockReturnValue(0.99);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
    });

    it('should evaluate unsolicited chance without forcing on punctuation', () => {
        mockMessage.getText.mockReturnValue('Is this a question?');
        // Base 0.2 (no extra punctuation bonus for unsolicited). Random 0.1 should pass.
        jest.spyOn(Math, 'random').mockReturnValue(0.1);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
    });

    it('should apply short length penalty', () => {
        mockMessage.getText.mockReturnValue('ok'); // < 10 chars
        // Base 0.2 - Penalty 0.1 = 0.1.
        // Random 0.15 should fail.
        jest.spyOn(Math, 'random').mockReturnValue(0.15);
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);
    });

    it('should always reply when message is a reply-to-bot', () => {
        mockMessage.isReplyToBot = jest.fn().mockReturnValue(true);
        (shouldReplyToUnsolicitedMessage as jest.Mock).mockImplementation(() => {
            throw new Error('should not be called for direct replies');
        });
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
    });

    it('should fail closed if unsolicited handler throws', () => {
        (shouldReplyToUnsolicitedMessage as jest.Mock).mockImplementation(() => {
            throw new Error('boom');
        });
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);
    });

    it('should deterministically honor MESSAGE_ONLY_WHEN_SPOKEN_TO', () => {
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_SHORT_LENGTH_PENALTY') return 0.1;
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
            if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 0.2;
            return null;
        });

        // Not addressed -> false
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(false);

        // Wakeword -> true
        mockMessage.getText.mockReturnValue('bot please help');
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord').shouldReply).toBe(true);
    });

    it('should treat bot name in text as spoken-to when MESSAGE_ONLY_WHEN_SPOKEN_TO=true', () => {
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
            return null;
        });

        mockMessage.getText.mockReturnValue('MyBot: can you help?');
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot').shouldReply).toBe(true);
    });

    it('should treat unicode punctuation around bot name as spoken-to', () => {
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
            return null;
        });

        mockMessage.getText.mockReturnValue('seneca—can you help?'); // em dash
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'seneca').shouldReply).toBe(true);
        mockMessage.getText.mockReturnValue('seneca’s idea?'); // curly apostrophe
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'seneca').shouldReply).toBe(true);
    });

    it('should accept a list of candidate bot names', () => {
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
            return null;
        });

        mockMessage.getText.mockReturnValue('seneca: hi');
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord', ['MyBot', 'Seneca']).shouldReply).toBe(true);
    });

    it('should allow unaddressed replies within the MESSAGE_ONLY_WHEN_SPOKEN_TO grace window', () => {
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS') return 300000;
            return null;
        });

        const RealDate = Date;
        global.Date.now = jest.fn(() => 1000);
        recordBotActivity('channel-1', 'bot-id');

        global.Date.now = jest.fn(() => 1000 + 10000);
        // Not directly addressed, but bot was active recently => should reply.
        mockMessage.getText.mockReturnValue('ok cool');
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'SomeOtherName').shouldReply).toBe(true);

        global.Date.now = RealDate.now;
    });

    it('should allow unaddressed bot messages within the grace window (floodgates stay open)', () => {
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS') return 300000;
            if (key === 'MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED') return false;
            return null;
        });

        mockMessage.isFromBot.mockReturnValue(true);

        const RealDate = Date;
        global.Date.now = jest.fn(() => 1000);
        recordBotActivity('channel-1', 'bot-id');

        global.Date.now = jest.fn(() => 1000 + 10000);
        mockMessage.getText.mockReturnValue('some other bot said something');
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot').shouldReply).toBe(true);

        global.Date.now = RealDate.now;
    });

    it('should not reply to unaddressed bot messages when not within grace and MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED=false', () => {
        (messageConfig.get as jest.Mock).mockImplementation((key) => {
            if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
            if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS') return 0;
            if (key === 'MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED') return false;
            if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 1.0; // would otherwise always reply
            return null;
        });

        mockMessage.isFromBot.mockReturnValue(true);
        mockMessage.getText.mockReturnValue('unaddressed bot message');
        expect(shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot').shouldReply).toBe(false);
    });
});
