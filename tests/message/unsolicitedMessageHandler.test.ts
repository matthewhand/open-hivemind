import messageConfig from '../../src/config/messageConfig';
import {
  looksLikeOpportunity,
  shouldReplyToUnsolicitedMessage,
} from '../../src/message/helpers/unsolicitedMessageHandler';

jest.mock('../../src/config/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedGet = messageConfig.get as jest.Mock;

/** Build a minimal message-like object returning the given text. */
function makeMessage(text: string, overrides: Record<string, unknown> = {}) {
  return {
    getText: () => text,
    ...overrides,
  };
}

/**
 * Configure messageConfig.get for the gate flag and wakewords.
 * Other keys return undefined.
 */
function configureGate(
  requireOpportunity: boolean,
  wakewords: string[] = ['!help', '!ping']
): void {
  mockedGet.mockImplementation((key: string) => {
    if (key === 'MESSAGE_UNSOLICITED_REQUIRE_OPPORTUNITY') {
      return requireOpportunity;
    }
    if (key === 'MESSAGE_WAKEWORDS') {
      return wakewords;
    }
    return undefined;
  });
}

describe('looksLikeOpportunity', () => {
  it('returns false for empty / whitespace input', () => {
    expect(looksLikeOpportunity('')).toBe(false);
    expect(looksLikeOpportunity('   ')).toBe(false);
  });

  it('treats questions as opportunities', () => {
    expect(looksLikeOpportunity('Is this thing on?')).toBe(true);
    expect(looksLikeOpportunity('how do i reset the token')).toBe(true);
  });

  it('matches narrow help/request patterns', () => {
    expect(looksLikeOpportunity('can someone take a look')).toBe(true);
    expect(looksLikeOpportunity('I am hitting an error on startup')).toBe(true);
    expect(looksLikeOpportunity('anyone know the default port')).toBe(true);
  });

  it('returns false for plain statements', () => {
    expect(looksLikeOpportunity('the weather is nice today')).toBe(false);
    expect(looksLikeOpportunity('lunch was great')).toBe(false);
  });
});

describe('shouldReplyToUnsolicitedMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when MESSAGE_UNSOLICITED_REQUIRE_OPPORTUNITY is disabled (default)', () => {
    beforeEach(() => configureGate(false));

    it('always allows the reply to proceed regardless of content', () => {
      expect(shouldReplyToUnsolicitedMessage(makeMessage('hello there'), 'bot-1', 'discord')).toBe(
        true
      );
      expect(
        shouldReplyToUnsolicitedMessage(makeMessage('what is the time?'), 'bot-1', 'discord')
      ).toBe(true);
    });
  });

  describe('when MESSAGE_UNSOLICITED_REQUIRE_OPPORTUNITY is enabled', () => {
    beforeEach(() => configureGate(true));

    it('allows messages that look like an opportunity', () => {
      expect(
        shouldReplyToUnsolicitedMessage(makeMessage('how do i fix this?'), 'bot-1', 'discord')
      ).toBe(true);
    });

    it('gates (rejects) plain statements that are not opportunities', () => {
      expect(
        shouldReplyToUnsolicitedMessage(
          makeMessage('the weather is nice today'),
          'bot-1',
          'discord'
        )
      ).toBe(false);
    });

    it('still allows direct mentions even when the text is not an opportunity', () => {
      const msg = makeMessage('the weather is nice today <@bot-1>', {
        mentionsUsers: (id: string) => id === 'bot-1',
      });
      expect(shouldReplyToUnsolicitedMessage(msg, 'bot-1', 'discord')).toBe(true);
    });

    it('still allows replies to the bot even when the text is not an opportunity', () => {
      const msg = makeMessage('sounds good', {
        isReplyToBot: () => true,
      });
      expect(shouldReplyToUnsolicitedMessage(msg, 'bot-1', 'discord')).toBe(true);
    });

    it('still allows wakeword-prefixed messages even when not a question', () => {
      const msg = makeMessage('!ping are you alive');
      expect(shouldReplyToUnsolicitedMessage(msg, 'bot-1', 'discord')).toBe(true);
    });
  });
});
