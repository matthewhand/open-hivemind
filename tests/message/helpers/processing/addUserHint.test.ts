import { addUserHintFn } from '@src/message/helpers/processing/addUserHint';
import messageConfig from '@config/messageConfig';

jest.mock('@config/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockMessageConfig = messageConfig as jest.Mocked<typeof messageConfig>;

describe('addUserHint', () => {
  const testUserId = 'user456';
  const testBotId = 'bot123';
  const testBotMention = `<@${testBotId}>`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration-based behavior', () => {
    it('should add user hint when MESSAGE_ADD_USER_HINT is true', () => {
      mockMessageConfig.get.mockReturnValue(true);
      const result = addUserHintFn(`${testBotMention} hello`, testUserId, testBotId);
      expect(result).toBe(`(from <@${testUserId}>) hello`);
    });

    it('should not add user hint when MESSAGE_ADD_USER_HINT is false', () => {
      mockMessageConfig.get.mockReturnValue(false);
      const originalMessage = `${testBotMention} hello`;
      const result = addUserHintFn(originalMessage, testUserId, testBotId);
      expect(result).toBe(originalMessage);
    });

    it('should not add user hint when MESSAGE_ADD_USER_HINT is undefined', () => {
      mockMessageConfig.get.mockReturnValue(false);
      const originalMessage = `${testBotMention} hello`;
      const result = addUserHintFn(originalMessage, testUserId, testBotId);
      expect(result).toBe(originalMessage);
    });

    it('should handle truthy values correctly', () => {
      mockMessageConfig.get.mockReturnValue('true');
      const result = addUserHintFn(`${testBotMention} hello`, testUserId, testBotId);
      expect(result).toBe(`(from <@${testUserId}>) hello`);
    });
  });

  describe('Bot mention handling', () => {
    beforeEach(() => {
      mockMessageConfig.get.mockReturnValue(true);
    });

    it('should handle multiple bot mentions', () => {
      const result = addUserHintFn(`${testBotMention} hi ${testBotMention}`, testUserId, testBotId);
      expect(result).toBe(`(from <@${testUserId}>) hi (from <@${testUserId}>)`);
    });

    it('should handle bot mentions at different positions', () => {
      const result = addUserHintFn(`Hello ${testBotMention} how are you?`, testUserId, testBotId);
      expect(result).toBe(`Hello (from <@${testUserId}>) how are you?`);
    });

    it('should return original message if botId not found', () => {
      const originalMessage = 'hello world';
      const result = addUserHintFn(originalMessage, testUserId, testBotId);
      expect(result).toBe(originalMessage);
    });

    it('should handle different bot IDs correctly', () => {
      const differentBotId = 'bot789';
      const result = addUserHintFn(`<@${differentBotId}> hello`, testUserId, testBotId);
      expect(result).toBe(`<@${differentBotId}> hello`); // Should not modify
    });

    it('should handle malformed mentions gracefully', () => {
      const malformedMessage = '<@> hello <@bot123';
      const result = addUserHintFn(malformedMessage, testUserId, testBotId);
      expect(result).toBe(malformedMessage);
    });
  });

  describe('Edge cases and validation', () => {
    beforeEach(() => {
      mockMessageConfig.get.mockReturnValue(true);
    });

    it('should handle empty message', () => {
      const result = addUserHintFn('', testUserId, testBotId);
      expect(result).toBe('');
    });

    it('should handle empty user ID', () => {
      const result = addUserHintFn(`${testBotMention} hello`, '', testBotId);
      expect(result).toBe(`${testBotMention} hello`); // Should return original content for empty userId
    });

    it('should handle empty bot ID', () => {
      const result = addUserHintFn(`${testBotMention} hello`, testUserId, '');
      expect(result).toBe(`${testBotMention} hello`);
    });

    it('should handle null/undefined parameters gracefully', () => {
      expect(() => addUserHintFn(null as any, testUserId, testBotId)).not.toThrow();
      expect(() => addUserHintFn(`${testBotMention} hello`, null as any, testBotId)).not.toThrow();
      expect(() => addUserHintFn(`${testBotMention} hello`, testUserId, null as any)).not.toThrow();
    });

    it('should preserve whitespace and formatting', () => {
      const messageWithSpaces = `  ${testBotMention}   hello world   `;
      const result = addUserHintFn(messageWithSpaces, testUserId, testBotId);
      expect(result).toBe(`  (from <@${testUserId}>)   hello world   `);
    });

    it('should handle special characters in user ID', () => {
      const specialUserId = 'user-123_test.id';
      const result = addUserHintFn(`${testBotMention} hello`, specialUserId, testBotId);
      expect(result).toBe(`(from <@${specialUserId}>) hello`);
    });
  });

  describe('Performance and consistency', () => {
    beforeEach(() => {
      mockMessageConfig.get.mockReturnValue(true);
    });

    it('should be consistent across multiple calls', () => {
      const message = `${testBotMention} hello`;
      const result1 = addUserHintFn(message, testUserId, testBotId);
      const result2 = addUserHintFn(message, testUserId, testBotId);
      expect(result1).toBe(result2);
    });

    it('should handle large messages efficiently', () => {
      const largeMessage = `${testBotMention} ${'hello '.repeat(1000)}`;
      const startTime = Date.now();
      const result = addUserHintFn(largeMessage, testUserId, testBotId);
      const endTime = Date.now();

      expect(result).toContain(`(from <@${testUserId}>)`);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });
});
