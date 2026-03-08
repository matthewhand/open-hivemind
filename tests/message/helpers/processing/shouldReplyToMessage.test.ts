import messageConfig from '../../../../src/config/messageConfig';
import {
  clearBotActivity,
  recordBotActivity,
} from '../../../../src/message/helpers/processing/ChannelActivity';
import { IncomingMessageDensity } from '../../../../src/message/helpers/processing/IncomingMessageDensity';
import { shouldReplyToMessage } from '../../../../src/message/helpers/processing/shouldReplyToMessage';
import {
  looksLikeOpportunity,
  shouldReplyToUnsolicitedMessage,
} from '../../../../src/message/helpers/unsolicitedMessageHandler';

// Mocks
jest.mock('../../../../src/message/helpers/processing/IncomingMessageDensity');
jest.mock('../../../../src/config/messageConfig');
jest.mock('../../../../src/message/helpers/unsolicitedMessageHandler');

describe('shouldReplyToMessage', () => {
  let mockMessage: any;
  const originalDateNow = Date.now;

  beforeEach(() => {
    global.Date.now = originalDateNow;
    jest.restoreAllMocks();
    jest.clearAllMocks();
    process.env.FORCE_REPLY = 'false';
    clearBotActivity();

    // Default Config Mocks
    (messageConfig.get as jest.Mock).mockImplementation((key) => {
      if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
      if (key === 'MESSAGE_INTERROBANG_BONUS') return 0.2;
      if (key === 'MESSAGE_SHORT_LENGTH_PENALTY') return 0.1;
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
      if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 0.01;
      if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS') return 300000;
      if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE') return 2;
      if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR') return 0.25;
      if (key === 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR') return 3;
      return null;
    });

    // Default Helper Mocks
    (shouldReplyToUnsolicitedMessage as jest.Mock).mockReturnValue(true);
    (looksLikeOpportunity as unknown as jest.Mock).mockImplementation((text: string) => {
      const t = String(text || '').toLowerCase();
      if (!t) return false;
      if (t.includes('?')) return true;
      return /\b(help|error|issue)\b/.test(t);
    });
    (IncomingMessageDensity.getInstance as jest.Mock).mockReturnValue({
      recordMessageAndGetModifier: jest.fn().mockReturnValue(1.0),
      getUniqueParticipantCount: jest.fn().mockReturnValue(1),
    });

    // Default Message Mock
    mockMessage = {
      getChannelId: jest.fn().mockReturnValue('channel-1'),
      getText: jest.fn().mockReturnValue('Hello world this is a normal length message'),
      getAuthorId: jest.fn().mockReturnValue('user-1'),
      mentionsUsers: jest.fn().mockReturnValue(false),
      getUserMentions: jest.fn().mockReturnValue([]),
      isFromBot: jest.fn().mockReturnValue(false),
    };
  });

  it('should force reply if FORCE_REPLY env var is true', async () => {
    process.env.FORCE_REPLY = 'true';
    const res = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord');
    expect(res.shouldReply).toBe(true);
  });

  it('should return false if unsolicited handler rejects it', async () => {
    (shouldReplyToUnsolicitedMessage as jest.Mock).mockReturnValue(false);
    const res = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord');
    expect(res.shouldReply).toBe(false);
  });

  it('should apply silence penalty if inactive > 5 minutes', async () => {
    const RealDate = Date;
    // Mock Date.now() for the "past" interaction
    global.Date.now = jest.fn(() => 1000);
    recordBotActivity('channel-1', 'bot-id');

    // Mock Date.now() for the "current" check (> 5 mins later)
    global.Date.now = jest.fn(() => 1000 + 300001); // 1000 + 5m 1s

    // Base chance is 0.01, +UserActive bonus adds 0.20 = 0.21
    // Set random above 0.21 to ensure failure
    jest.spyOn(Math, 'random').mockReturnValue(0.25);

    mockMessage.getText.mockReturnValue('help please');
    const res = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord');
    expect(res.shouldReply).toBe(false);

    // Restore Date
    global.Date.now = RealDate.now;
  });

  it('should scale silence penalty based on participant count', async () => {
    const RealDate = Date;
    global.Date.now = jest.fn(() => 1000);
    recordBotActivity('channel-1', 'bot-id');

    global.Date.now = jest.fn(() => 1000 + 300001);
    mockMessage.getText.mockReturnValue('help please');

    // participants=1 => factor=2 => base chance=0.01, +UserActive=0.20, total=0.21
    // Random 0.15 should pass (0.15 < 0.21)
    (IncomingMessageDensity.getInstance().getUniqueParticipantCount as jest.Mock).mockReturnValue(
      1
    );
    jest.spyOn(Math, 'random').mockReturnValue(0.15);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(true);

    // participants=6 => factor=2/6 => chance≈0.00166 + UserActive 0.20 = ~0.20
    // Random 0.25 should fail (0.25 > 0.20)
    (IncomingMessageDensity.getInstance().getUniqueParticipantCount as jest.Mock).mockReturnValue(
      6
    );
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(false);

    global.Date.now = RealDate.now;
  });

  it('should NOT apply silence penalty if active < 5 minutes', async () => {
    recordBotActivity('channel-1', 'bot-id');

    // Advance ONLY 1 minute
    const RealDate = Date;
    global.Date.now = jest.fn(() => 60000);

    mockMessage.getText.mockReturnValue('help please');
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(true);
    global.Date.now = RealDate.now;
  });

  it('should apply density modifier to chance', async () => {
    // Density returns 0.1 (1/10th chance)
    (IncomingMessageDensity.getInstance().recordMessageAndGetModifier as jest.Mock).mockReturnValue(
      0.1
    );
    mockMessage.getText.mockReturnValue('help please');

    // With density 0.1, base chance is reduced drastically
    // But +UserActive adds 0.20, so total is around 0.20
    // Random 0.25 should fail (0.25 > 0.20)
    jest.spyOn(Math, 'random').mockReturnValue(0.25);

    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(false);
  });

  it('should return 0 (false) if author is the bot itself', async () => {
    mockMessage.getAuthorId.mockReturnValue('bot-id');
    // Even if random is 0
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(false);
  });

  it('should return 1 (true) if bot is mentioned', async () => {
    mockMessage.mentionsUsers.mockReturnValue(true);
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(true);
  });

  it('should treat user mentions as direct mention', async () => {
    mockMessage.mentionsUsers.mockReturnValue(false);
    (mockMessage.getUserMentions as jest.Mock).mockReturnValue(['bot-id']);
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(true);
  });

  it('should return 1 (true) if wakeword is detected', async () => {
    mockMessage.getText.mockReturnValue('hey bot what is up');
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(true);
  });

  it('should evaluate unsolicited chance without forcing on punctuation', async () => {
    mockMessage.getText.mockReturnValue('Is this a question?');
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(true);
  });

  it('should apply short length penalty', async () => {
    mockMessage.getText.mockReturnValue('ok'); // < 10 chars
    jest.spyOn(Math, 'random').mockReturnValue(0.15);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(false);
  });

  it('should skip unsolicited handler when message is a reply-to-bot', async () => {
    mockMessage.isReplyToBot = jest.fn().mockReturnValue(true);
    (shouldReplyToUnsolicitedMessage as jest.Mock).mockImplementation(() => {
      throw new Error('should not be called for direct replies');
    });
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    const res = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord');
    expect(res.shouldReply).toBe(true);
    expect(res.meta?.mods?.Reply).toBe(0.5);
  });

  it('should fail closed if unsolicited handler throws', async () => {
    (shouldReplyToUnsolicitedMessage as jest.Mock).mockImplementation(() => {
      throw new Error('boom');
    });
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(false);
  });

  it('should deterministically honor MESSAGE_ONLY_WHEN_SPOKEN_TO', async () => {
    (messageConfig.get as jest.Mock).mockImplementation((key) => {
      if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
      if (key === 'MESSAGE_SHORT_LENGTH_PENALTY') return 0.1;
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
      if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 0.01;
      return null;
    });

    // Not addressed -> false
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(false);

    // Wakeword -> true
    mockMessage.getText.mockReturnValue('bot please help');
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect((await shouldReplyToMessage(mockMessage, 'bot-id', 'discord')).shouldReply).toBe(true);
  });

  it('should treat bot name in text as spoken-to when MESSAGE_ONLY_WHEN_SPOKEN_TO=true', async () => {
    (messageConfig.get as jest.Mock).mockImplementation((key) => {
      if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
      return null;
    });

    mockMessage.getText.mockReturnValue('MyBot: can you help?');
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect(
      (await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot')).shouldReply
    ).toBe(true);
  });

  it('should treat unicode punctuation around bot name as spoken-to', async () => {
    (messageConfig.get as jest.Mock).mockImplementation((key) => {
      if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
      return null;
    });

    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    mockMessage.getText.mockReturnValue('seneca—can you help?'); // em dash
    expect(
      (await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'seneca')).shouldReply
    ).toBe(true);
    mockMessage.getText.mockReturnValue('seneca’s idea?'); // curly apostrophe
    expect(
      (await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'seneca')).shouldReply
    ).toBe(true);
  });

  it('should accept a list of candidate bot names', async () => {
    (messageConfig.get as jest.Mock).mockImplementation((key) => {
      if (key === 'MESSAGE_WAKEWORDS') return ['hey bot', 'bot'];
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
      return null;
    });

    mockMessage.getText.mockReturnValue('seneca: hi');
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect(
      (await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', ['MyBot', 'Seneca']))
        .shouldReply
    ).toBe(true);
  });

  it('should allow unaddressed replies within the MESSAGE_ONLY_WHEN_SPOKEN_TO grace window', async () => {
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
    mockMessage.getText.mockReturnValue('help please');
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    expect(
      (await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'SomeOtherName')).shouldReply
    ).toBe(true);

    global.Date.now = RealDate.now;
  });

  it('should dampen unaddressed bot messages within the grace window when no users are present', async () => {
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
    mockMessage.getText.mockReturnValue('help please');
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
    const res = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot');
    expect(res.shouldReply).toBe(false);
    expect(res.meta?.mods?.BotRatio).toBe(-0.5);

    global.Date.now = RealDate.now;
  });

  it('should not reply to unaddressed bot messages when not within grace and MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED=false', async () => {
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
    expect(
      (await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot')).shouldReply
    ).toBe(false);
  });

  describe('Unsolicited Probability Modifiers', () => {
    let mockHistory: any[];

    beforeEach(() => {
      mockMessage = {
        getChannelId: jest.fn().mockReturnValue('channel-1'),
        getText: jest.fn().mockReturnValue('some random chatter'),
        isFromBot: jest.fn().mockReturnValue(false),
        isDirectMessage: jest.fn().mockReturnValue(false),
        getAuthorId: jest.fn().mockReturnValue('user-1'),
        getUserMentions: jest.fn().mockReturnValue([]),
      };

      (messageConfig.get as jest.Mock).mockImplementation((key) => {
        if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
        if (key === 'MESSAGE_WAKEWORDS') return ['!test'];
        if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 0.5; // High base chance for testing
        return undefined;
      });

      // Provide history with multiple users and bots to trigger all penalties
      mockHistory = [
        { getAuthorId: () => 'user-1', isFromBot: () => false, getText: () => 'hello', timestamp: Date.now() - 50000 },
        { getAuthorId: () => 'user-2', isFromBot: () => false, getText: () => 'hi', timestamp: Date.now() - 40000 },
        { getAuthorId: () => 'bot-id', isFromBot: () => true, getText: () => 'bot response', timestamp: Date.now() - 30000 },
        { getAuthorId: () => 'bot-id', isFromBot: () => true, getText: () => 'another bot response', timestamp: Date.now() - 20000 },
        { getAuthorId: () => 'user-3', isFromBot: () => false, getText: () => 'yo', timestamp: Date.now() - 10000 },
      ];
    });

    it('should respect default penalty values when not overridden in bot config', async () => {
      const result = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot', mockHistory);

      // With defaults (User: 0.02, BotRatio: 0.5, BotHistory: 0.1, Burst: 0.025)
      // 3 unique users (user-1, user-2, user-3). So (3 - 1) * 0.02 = 0.04 penalty
      // 2 bot history messages. (2 - 1) * 0.1 = 0.1 penalty

      expect(result.meta?.mods.UserCount).toBeCloseTo(-0.04);
      expect(result.meta?.mods.BotHistory).toBeCloseTo(-0.1);
    });

    it('should allow penalties to be disabled by setting them to 0 in config', async () => {
      (messageConfig.get as jest.Mock).mockImplementation((key) => {
        if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
        if (key === 'MESSAGE_WAKEWORDS') return ['!test'];
        if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 0.5;
        if (key === 'MESSAGE_UNSOLICITED_USER_COUNT_PENALTY_PER_USER') return 0;
        if (key === 'MESSAGE_UNSOLICITED_BOT_HISTORY_PENALTY_PER_MESSAGE') return 0;
        return undefined;
      });

      const result = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot', mockHistory);

      // Penalties should not appear or should be exactly 0 (which is neutral/falsy for the string array)
      expect(result.meta?.mods.UserCount).toBeUndefined();
      expect(result.meta?.mods.BotHistory).toBeUndefined();
    });

    it('should support extreme penalty values safely', async () => {
      (messageConfig.get as jest.Mock).mockImplementation((key) => {
        if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
        if (key === 'MESSAGE_WAKEWORDS') return ['!test'];
        if (key === 'MESSAGE_UNSOLICITED_BASE_CHANCE') return 0.5;
        if (key === 'MESSAGE_UNSOLICITED_USER_COUNT_PENALTY_PER_USER') return 1.0;
        if (key === 'MESSAGE_UNSOLICITED_BOT_HISTORY_PENALTY_PER_MESSAGE') return 1.0;
        return undefined;
      });

      const result = await shouldReplyToMessage(mockMessage, 'bot-id', 'discord', 'MyBot', mockHistory);

      // userCountPenalty = (3 - 1) * 1.0 = 2.0 (penalty is negative)
      // botHistoryPenalty maxes out at -0.5
      expect(result.meta?.mods.UserCount).toBeCloseTo(-2.0);
      expect(result.meta?.mods.BotHistory).toBeCloseTo(-0.5);
    });
  });
});
