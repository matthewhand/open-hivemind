import messageConfig from '@config/messageConfig';
import {
  getMinIntervalMs,
  shouldProcessMessage,
} from '@message/helpers/processing/shouldProcessMessage';
import { IMessage } from '@message/interfaces/IMessage';

jest.mock('@config/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockMessageConfig = messageConfig as jest.Mocked<typeof messageConfig>;

const createMockMessage = (
  text: string,
  fromBot = false,
  channelId = 'test-channel',
  authorId = 'test-user',
  messageId = 'test-message-id',
  timestamp = new Date()
): IMessage =>
  ({
    getText: () => text,
    isFromBot: () => fromBot,
    getChannelId: () => channelId,
    getAuthorId: () => authorId,
    getMessageId: () => messageId,
    getTimestamp: () => timestamp,
    getAuthorName: () => 'Test User',
    setText: jest.fn(),
    getUserMentions: () => [],
    hasAttachments: () => false,
  }) as any;

describe('shouldProcessMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageConfig.get.mockReturnValue(true); // Default MESSAGE_IGNORE_BOTS = true
  });

  describe('Bot message filtering', () => {
    it('should process normal user messages', () => {
      const message = createMockMessage('Hello world', false);
      expect(shouldProcessMessage(message)).toBe(true);
    });

    it('should ignore bot messages when MESSAGE_IGNORE_BOTS is true', () => {
      mockMessageConfig.get.mockReturnValue(true);
      const message = createMockMessage('Bot message', true);
      expect(shouldProcessMessage(message)).toBe(false);
    });

    it('should process bot messages when MESSAGE_IGNORE_BOTS is false', () => {
      mockMessageConfig.get.mockReturnValue(false);
      const message = createMockMessage('Bot message', true);
      expect(shouldProcessMessage(message)).toBe(true);
    });

    it('should handle undefined MESSAGE_IGNORE_BOTS config', () => {
      mockMessageConfig.get.mockReturnValue(undefined);
      const userMessage = createMockMessage('User message', false);
      const botMessage = createMockMessage('Bot message', true);

      expect(shouldProcessMessage(userMessage)).toBe(true);
      // Should default to ignoring bots when config is undefined
      expect(shouldProcessMessage(botMessage)).toBe(false);
    });

    it('should handle truthy string values for MESSAGE_IGNORE_BOTS', () => {
      mockMessageConfig.get.mockReturnValue('true');
      const message = createMockMessage('Bot message', true);
      expect(shouldProcessMessage(message)).toBe(false);
    });
  });

  describe('Message content validation', () => {
    beforeEach(() => {
      mockMessageConfig.get.mockReturnValue(false); // Allow bot messages for content testing
    });

    it('should ignore empty messages', () => {
      const message = createMockMessage('', false);
      expect(shouldProcessMessage(message)).toBe(false);
    });

    it.each([
      ['spaces', '   '],
      ['newlines', '\n\n\n'],
      ['tabs', '\t\t\t'],
      ['mixed whitespace', '   \n\t  '],
      ['carriage return', ' \r\n '],
      ['non-breaking spaces', '\u00A0\u00A0'],
    ])('should ignore messages with only %s', (type, text) => {
      const message = createMockMessage(text, false);
      expect(shouldProcessMessage(message)).toBe(false);
    });

    it.each([
      ['simple text', 'Hello'],
      ['single character', 'a'],
      ['numbers', '123'],
      ['special characters', '!@#$%'],
      ['multiline', 'Hello\nWorld'],
      ['whitespace with content', '  Hello  '],
      ['emoji', 'emoji 🤖'],
    ])('should process messages with %s', (type, text) => {
      const message = createMockMessage(text, false);
      expect(shouldProcessMessage(message)).toBe(true);
    });

    it('should handle null/undefined message text gracefully', () => {
      const messageWithNullText = {
        ...createMockMessage('', false),
        getText: () => null as any,
      };
      const messageWithUndefinedText = {
        ...createMockMessage('', false),
        getText: () => undefined as any,
      };

      expect(shouldProcessMessage(messageWithNullText)).toBe(false);
      expect(shouldProcessMessage(messageWithUndefinedText)).toBe(false);
    });
  });

  describe('Message object validation', () => {
    it('should handle null/undefined message objects', () => {
      expect(shouldProcessMessage(null as any)).toBe(false);
      expect(shouldProcessMessage(undefined as any)).toBe(false);
    });

    it('should handle malformed message objects', () => {
      const malformedMessages = [
        {},
        { getText: null },
        { getText: () => 'text' }, // Missing isFromBot
        { isFromBot: () => false }, // Missing getText
      ];

      malformedMessages.forEach((message) => {
        expect(() => shouldProcessMessage(message as any)).not.toThrow();
        expect(shouldProcessMessage(message as any)).toBe(false);
      });
    });

    it('should handle messages with throwing methods', () => {
      const throwingMessage = {
        getText: () => {
          throw new Error('getText failed');
        },
        isFromBot: () => false,
      };

      expect(() => shouldProcessMessage(throwingMessage as any)).not.toThrow();
      expect(shouldProcessMessage(throwingMessage as any)).toBe(false);
    });
  });

  describe('Configuration edge cases', () => {
    it('should handle config access errors gracefully', () => {
      mockMessageConfig.get.mockImplementation(() => {
        throw new Error('Config access failed');
      });

      const message = createMockMessage('Hello', false);
      expect(() => shouldProcessMessage(message)).not.toThrow();
      expect(shouldProcessMessage(message)).toBe(true); // Should default to processing
    });

    it('should handle different config key cases', () => {
      const message = createMockMessage('Bot message', true);

      // Test that it calls config with the correct key
      shouldProcessMessage(message);
      expect(mockMessageConfig.get).toHaveBeenCalledWith('MESSAGE_IGNORE_BOTS');
    });
  });

  describe('Performance', () => {
    it('should process many messages quickly', () => {
      const messages = Array.from({ length: 1000 }, (_, i) =>
        createMockMessage(`Message ${i}`, i % 2 === 0)
      );

      const startTime = Date.now();
      messages.forEach((message) => shouldProcessMessage(message));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});

describe('getMinIntervalMs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration retrieval', () => {
    it('should return MESSAGE_MIN_INTERVAL_MS when set', () => {
      mockMessageConfig.get.mockReturnValue(2000);
      expect(getMinIntervalMs()).toBe(2000);
      expect(mockMessageConfig.get).toHaveBeenCalledWith('MESSAGE_MIN_INTERVAL_MS');
    });

    it('should return 1000 as default when MESSAGE_MIN_INTERVAL_MS is not set', () => {
      mockMessageConfig.get.mockReturnValue(undefined);
      expect(getMinIntervalMs()).toBe(1000);
    });

    it('should return 1000 as default when MESSAGE_MIN_INTERVAL_MS is null', () => {
      mockMessageConfig.get.mockReturnValue(null);
      expect(getMinIntervalMs()).toBe(1000);
    });

    it('should handle zero value', () => {
      mockMessageConfig.get.mockReturnValue(0);
      expect(getMinIntervalMs()).toBe(0);
    });

    it('should handle string numbers', () => {
      mockMessageConfig.get.mockReturnValue('3000');
      expect(getMinIntervalMs()).toBe(3000);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle negative values', () => {
      mockMessageConfig.get.mockReturnValue(-500);
      const result = getMinIntervalMs();
      // Should either return the negative value or handle it gracefully
      expect(typeof result).toBe('number');
    });

    it('should handle very large values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      mockMessageConfig.get.mockReturnValue(largeValue);
      expect(getMinIntervalMs()).toBe(largeValue);
    });

    it('should handle non-numeric values gracefully', () => {
      const nonNumericValues = ['invalid', true, {}, [], NaN];

      nonNumericValues.forEach((value) => {
        mockMessageConfig.get.mockReturnValue(value);
        const result = getMinIntervalMs();
        expect(typeof result).toBe('number');
        expect(isNaN(result)).toBe(false);
      });
    });

    it('should handle config access errors', () => {
      mockMessageConfig.get.mockImplementation(() => {
        throw new Error('Config access failed');
      });

      expect(() => getMinIntervalMs()).not.toThrow();
      expect(getMinIntervalMs()).toBe(1000); // Should return default
    });
  });

  describe('Performance and consistency', () => {
    it('should be consistent across multiple calls', () => {
      mockMessageConfig.get.mockReturnValue(5000);

      const result1 = getMinIntervalMs();
      const result2 = getMinIntervalMs();
      const result3 = getMinIntervalMs();

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(5000);
    });

    it('should execute quickly', () => {
      mockMessageConfig.get.mockReturnValue(1500);

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        getMinIntervalMs();
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
    });

    it('should handle rapid successive calls', () => {
      mockMessageConfig.get.mockReturnValue(2500);

      const results = Array.from({ length: 100 }, () => getMinIntervalMs());

      // All results should be the same
      expect(results.every((result) => result === 2500)).toBe(true);
    });
  });
});
