import { shouldReplyToUnsolicitedMessage, looksLikeOpportunity } from '@message/helpers/unsolicitedMessageHandler';
import messageConfig from '@config/messageConfig';

// Mock messageConfig
jest.mock('@config/messageConfig', () => ({
  get: jest.fn(),
}));

const mockMessageConfig = messageConfig as jest.Mocked<typeof messageConfig>;

class MockMessage {
  constructor(
    public text: string,
    public mentions: string[] = [],
    public isReplyToBotFlag = false,
    public metadata: any = {}
  ) {}

  getText(): string {
    return this.text;
  }

  mentionsUsers(userId: string): boolean {
    return this.mentions.includes(userId);
  }

  isMentioning(userId: string): boolean {
    return this.mentions.includes(userId);
  }

  getUserMentions(): string[] {
    return this.mentions;
  }

  isReplyToBot(): boolean {
    return this.isReplyToBotFlag;
  }
}

describe('unsolicitedMessageHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageConfig.get.mockImplementation((key: string) => {
      const config: Record<string, any> = {
        MESSAGE_WAKEWORDS: [],
      };
      return config[key];
    });
  });

  describe('shouldReplyToUnsolicitedMessage', () => {
    it('should return true for direct mentions', () => {
      const message = new MockMessage('Hello!', ['bot-123']);
      const result = shouldReplyToUnsolicitedMessage(message, 'bot-123', 'discord');
      expect(result).toBe(true);
    });

    it('should return true for replies to the bot', () => {
      const message = new MockMessage('Hello!', [], true);
      const result = shouldReplyToUnsolicitedMessage(message, 'bot-123', 'discord');
      expect(result).toBe(true);
    });

    it('should return true for wakeword mentions', () => {
      mockMessageConfig.get.mockReturnValue(['hey bot']);
      const message = new MockMessage('hey bot how are you?');
      const result = shouldReplyToUnsolicitedMessage(message, 'bot-123', 'discord');
      expect(result).toBe(true);
    });

    it('should return true for text mentions (e.g., <@bot-123>)', () => {
      const message = new MockMessage('<@bot-123> Hello!');
      const result = shouldReplyToUnsolicitedMessage(message, 'bot-123', 'discord');
      expect(result).toBe(true);
    });

    it('should return true even for non-direct messages (logic refactor)', () => {
      const message = new MockMessage('Hello!');
      const result = shouldReplyToUnsolicitedMessage(message, 'bot-123', 'discord');
      expect(result).toBe(true);
    });
  });

  describe('looksLikeOpportunity', () => {
    it('should return true for questions', () => {
      expect(looksLikeOpportunity('How do I do this?')).toBe(true);
      expect(looksLikeOpportunity('What is this?')).toBe(true);
      expect(looksLikeOpportunity('Why is this happening')).toBe(true); // Now matches without ?
    });

    it('should return true for help/request patterns', () => {
      expect(looksLikeOpportunity('How do I fix this')).toBe(true);
      expect(looksLikeOpportunity('Can someone help me?')).toBe(true);
      expect(looksLikeOpportunity('Anyone know how to do this?')).toBe(true);
      expect(looksLikeOpportunity('Help!')).toBe(true);
      expect(looksLikeOpportunity('There is an issue')).toBe(true);
      expect(looksLikeOpportunity('I got an error')).toBe(true);
    });

    it('should return false for non-opportunities', () => {
      expect(looksLikeOpportunity('Hello')).toBe(false);
      expect(looksLikeOpportunity('')).toBe(false);
      expect(looksLikeOpportunity('This is a statement.')).toBe(false);
    });
  });
});