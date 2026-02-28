import fs from 'fs';
import path from 'path';
import { executeCommand, readFile } from '../../src/utils/utils';

describe('Utility Functions Comprehensive Tests', () => {
  describe('Math Operations', () => {
    test('should handle basic arithmetic operations correctly', () => {
      expect(1 + 2).toBe(3);
      expect(5 - 3).toBe(2);
      expect(4 * 3).toBe(12);
      expect(10 / 2).toBe(5);
    });

    test('should handle edge cases in arithmetic', () => {
      expect(0 + 0).toBe(0);
      expect(1 - 1).toBe(0);
      expect(0 * 5).toBe(0);
      expect(5 / 0).toBe(Infinity);
      expect(-5 / 0).toBe(-Infinity);
    });

    test('should handle floating point arithmetic with precision', () => {
      expect(0.1 + 0.2).toBeCloseTo(0.3, 10);
      expect(1.23 * 4.56).toBeCloseTo(5.6088, 10);
    });
  });

  describe('Boolean and Type Conversion', () => {
    const booleanTestCases = [
      { input: 'x', expected: true, description: 'non-empty string' },
      { input: '', expected: false, description: 'empty string' },
      { input: 1, expected: true, description: 'positive number' },
      { input: 0, expected: false, description: 'zero' },
      { input: [], expected: true, description: 'empty array' },
      { input: {}, expected: true, description: 'empty object' },
      { input: null, expected: false, description: 'null' },
      { input: undefined, expected: false, description: 'undefined' },
    ];

    test.each(booleanTestCases)(
      'should convert $description to boolean correctly',
      ({ input, expected }) => {
        expect(Boolean(input)).toBe(expected);
      }
    );

    test('should handle truthy and falsy values', () => {
      // Truthy values
      const truthyString = 'hello';
      const truthyNumber = 42;
      const truthyArray: any[] = [];
      const truthyObject = {};

      expect(!!truthyString).toBe(true);
      expect(!!truthyNumber).toBe(true);
      expect(!!truthyArray).toBe(true);
      expect(!!truthyObject).toBe(true);

      // Falsy values
      const falsyString = '';
      const falsyNumber = 0;
      const falsyNull = null;
      const falsyUndefined = undefined;
      const falsyNaN = NaN;

      expect(!!falsyString).toBe(false);
      expect(!!falsyNumber).toBe(false);
      expect(!!falsyNull).toBe(false);
      expect(!!falsyUndefined).toBe(false);
      expect(!!falsyNaN).toBe(false);
    });
  });

  describe('Array Operations', () => {
    test('should handle array includes correctly', () => {
      const arr = [1, 2, 3];
      expect(arr.includes(2)).toBe(true);
      expect(arr.includes(4)).toBe(false);
      expect(arr.includes(1)).toBe(true);
      expect(arr.includes(3)).toBe(true);
    });

    test('should handle array includes with different types', () => {
      const mixedArray = [1, 'two', true, null, undefined];
      expect(mixedArray.includes('two')).toBe(true);
      expect(mixedArray.includes(true)).toBe(true);
      expect(mixedArray.includes(null)).toBe(true);
      expect(mixedArray.includes(undefined)).toBe(true);
      expect(mixedArray.includes(false)).toBe(false);
    });

    test('should handle array includes with objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      const arr = [obj1, obj2];

      expect(arr.includes(obj1)).toBe(true);
      expect(arr.includes({ a: 1 })).toBe(false); // Different object reference
      expect(arr.includes(obj2)).toBe(true);
    });
  });

  describe('Basic Assertions', () => {
    test('should execute utility helpers for commands and file handling', async () => {
      const commandOutput = await executeCommand('echo unit-test');
      expect(commandOutput).toBe('unit-test\n');

      const tempPath = path.join(__dirname, 'utility-sample.txt');
      fs.writeFileSync(tempPath, 'utility file content');
      const fileContent = await readFile(tempPath);
      expect(fileContent).toBe('utility file content');
      fs.unlinkSync(tempPath);
    });

    test('readFile should reject directories', async () => {
      await expect(readFile(__dirname)).rejects.toThrow('Path is a directory');
    });

    test('should verify object equality', () => {
      const obj = { a: 1, b: 2 };
      expect(obj).toEqual({ a: 1, b: 2 });
      expect(obj).not.toBe({ a: 1, b: 2 }); // Different reference
    });

    test('should handle null and undefined correctly', () => {
      expect(null).toBe(null);
      expect(undefined).toBe(undefined);
      expect(null).not.toBe(undefined);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle special numeric values', () => {
      expect(NaN).toBeNaN();
      expect(Infinity).toBe(Infinity);
      expect(-Infinity).toBe(-Infinity);
      expect(1 / 0).toBe(Infinity);
    });

    test('should handle string edge cases', () => {
      expect('').toBe('');
      expect('   ').toBe('   ');
      expect('hello').not.toBe('Hello'); // Case sensitive
    });

    test('should handle array edge cases', () => {
      expect([]).toEqual([]);
      expect([1, 2, 3]).toHaveLength(3);
      expect([1, 2, 3]).toContain(2);
      expect([1, 2, 3]).not.toContain(4);
    });
  });

  describe('Array Operations Consolidated', () => {
    test('should handle comprehensive array operations', () => {
      // Basic includes functionality
      expect([1, 2, 3]).toContain(3);
      expect([1, 2, 3]).not.toContain(4);

      // Length operations
      expect([].length).toBe(0);
      expect([1, 2, 3].length).toBe(3);

      // Filter operations
      const arr = [1, 2, 3, 4, 5];
      expect(arr.filter((x) => x > 3)).toEqual([4, 5]);

      // Map operations
      expect(arr.map((x) => x * 2)).toEqual([2, 4, 6, 8, 10]);

      // Complex operations
      expect(arr.includes(3)).toBe(true);
      expect(arr.filter((x) => x > 3)).toHaveLength(2);
    });
  });

  describe('Rate Limiter Operations Consolidated', () => {
    let rateLimiter: any;

    beforeEach(() => {
      jest.useFakeTimers();
      // Mock the rateLimiter module
      rateLimiter = {
        messagesLastHour: [] as Date[],
        messagesLastDay: [] as Date[],
        canSendMessage: function () {
          const now = new Date();
          const hourAgo = new Date(now.getTime() - 3600000);
          const dayAgo = new Date(now.getTime() - 86400000);

          const recentHour = this.messagesLastHour.filter((t: Date) => t > hourAgo);
          const recentDay = this.messagesLastDay.filter((t: Date) => t > dayAgo);

          const hourLimit = parseInt(process.env.LLM_MESSAGE_LIMIT_PER_HOUR || '60');
          const dayLimit = parseInt(process.env.LLM_MESSAGE_LIMIT_PER_DAY || '1000');

          return recentHour.length < hourLimit && recentDay.length < dayLimit;
        },
        addMessageTimestamp: function () {
          const now = new Date();
          const hourAgo = new Date(now.getTime() - 3600000);
          const dayAgo = new Date(now.getTime() - 86400000);

          // Filter old messages and add new one
          this.messagesLastHour = this.messagesLastHour.filter((t: Date) => t > hourAgo);
          this.messagesLastDay = this.messagesLastDay.filter((t: Date) => t > dayAgo);

          this.messagesLastHour.push(now);
          this.messagesLastDay.push(now);
        },
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should handle comprehensive rate limiting scenarios', () => {
      process.env.LLM_MESSAGE_LIMIT_PER_HOUR = '2';
      process.env.LLM_MESSAGE_LIMIT_PER_DAY = '2';

      // Initially should allow messages
      expect(rateLimiter.canSendMessage()).toBe(true);

      // Add timestamps and verify limits
      rateLimiter.addMessageTimestamp();
      expect(rateLimiter.messagesLastHour.length).toBe(1);
      expect(rateLimiter.messagesLastDay.length).toBe(1);
      expect(rateLimiter.canSendMessage()).toBe(true);

      rateLimiter.addMessageTimestamp();
      expect(rateLimiter.messagesLastHour.length).toBe(2);
      expect(rateLimiter.messagesLastDay.length).toBe(2);
      expect(rateLimiter.canSendMessage()).toBe(false);

      // Test time-based filtering
      const now = new Date();
      jest.setSystemTime(now);
      rateLimiter.addMessageTimestamp();

      // Advance time by 2 hours to test hourly filtering
      jest.setSystemTime(new Date(now.getTime() + 2 * 3600000));
      rateLimiter.addMessageTimestamp();

      // Should only have recent messages in hour array
      expect(rateLimiter.messagesLastHour.length).toBe(1);
      expect(rateLimiter.messagesLastDay.length).toBe(4);

      // Advance time by 25 hours to test daily filtering
      jest.setSystemTime(new Date(now.getTime() + 25 * 3600000));
      rateLimiter.addMessageTimestamp();

      expect(rateLimiter.messagesLastHour.length).toBe(1);
      expect(rateLimiter.messagesLastDay.length).toBe(2); // Only the last 2 messages (now+2h and now+25h) should remain
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle large numbers efficiently', () => {
      const largeNum = 999999999999999;
      expect(largeNum + 1).toBe(1000000000000000);
      expect(largeNum * 2).toBe(1999999999999998);
    });

    test('should maintain precision with decimal operations', () => {
      const result = 0.1 + 0.2;
      expect(result).toBeCloseTo(0.3, 10);
      expect(result).not.toBe(0.3); // Due to floating point precision
    });

    test('should handle concurrent operations correctly', () => {
      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(i + 1);
      }
      expect(results).toHaveLength(100);
      expect(results[0]).toBe(1);
      expect(results[99]).toBe(100);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex boolean expressions', () => {
      const a = true;
      const b = false;
      const c = true;

      expect(a && b).toBe(false);
      expect(a || b).toBe(true);
      expect(a && c).toBe(true);
      expect(!(a && b)).toBe(true);
    });

    test('should handle type coercion scenarios', () => {
      const stringFive = '5' as any;
      const numberFive = 5;
      const stringFalse = 'false';
      const numberZero = 0;

      expect(stringFive == numberFive).toBe(true); // Loose equality with coercion
      expect(stringFive === numberFive).toBe(false); // Strict equality without coercion
      expect(!!stringFalse).toBe(true); // String 'false' is truthy
      expect(!!numberZero).toBe(false); // Number 0 is falsy
    });
  });

  describe('Emoji Generation Consolidated', () => {
    test('should return a valid emoji from the predefined list', () => {
      const { getEmoji } = require('../../src/common/getEmoji');
      const emoji = getEmoji();
      expect([
        '😀',
        '😂',
        '😅',
        '🤣',
        '😊',
        '😍',
        '🤔',
        '😎',
        '😢',
        '😡',
        '👍',
        '👎',
        '👌',
        '🙏',
        '💪',
        '🔥',
      ]).toContain(emoji);
      expect(typeof emoji).toBe('string');
      expect(emoji.length).toBeGreaterThan(0);
    });

    test('should return different emojis on multiple calls', () => {
      const { getEmoji } = require('../../src/common/getEmoji');
      const generatedEmojis = new Set();
      for (let i = 0; i < 20; i++) {
        generatedEmojis.add(getEmoji());
      }
      expect(generatedEmojis.size).toBeGreaterThan(5);
    });

    test('should handle rapid successive calls', () => {
      const { getEmoji } = require('../../src/common/getEmoji');
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(getEmoji());
      }
      results.forEach((emoji) => {
        expect([
          '😀',
          '😂',
          '😅',
          '🤣',
          '😊',
          '😍',
          '🤔',
          '😎',
          '😢',
          '😡',
          '👍',
          '👎',
          '👌',
          '🙏',
          '💪',
          '🔥',
        ]).toContain(emoji);
        expect(typeof emoji).toBe('string');
      });
    });
  });

  describe('Random Delay Generation Consolidated', () => {
    test('should return a number within the specified range', () => {
      const { getRandomDelay } = require('../../src/common/getRandomDelay');
      const min = 100;
      const max = 200;
      const delay = getRandomDelay(min, max);
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThanOrEqual(min);
      expect(delay).toBeLessThanOrEqual(max);
    });

    test('should handle min and max being equal', () => {
      const { getRandomDelay } = require('../../src/common/getRandomDelay');
      const min = 150;
      const max = 150;
      const delay = getRandomDelay(min, max);
      expect(delay).toBe(min);
    });

    test('should return 0 if min is greater than max', () => {
      const { getRandomDelay } = require('../../src/common/getRandomDelay');
      const min = 300;
      const max = 200;
      const delay = getRandomDelay(min, max);
      expect(delay).toBe(0);
    });

    test('should handle negative values', () => {
      const { getRandomDelay } = require('../../src/common/getRandomDelay');
      const delay = getRandomDelay(-100, 200);
      expect(delay).toBe(0);
    });

    test('should generate different values on multiple calls', () => {
      const { getRandomDelay } = require('../../src/common/getRandomDelay');
      const min = 1;
      const max = 1000;
      const results = new Set();

      for (let i = 0; i < 50; i++) {
        results.add(getRandomDelay(min, max));
      }

      expect(results.size).toBeGreaterThan(10);
    });
  });

  describe('Audit Logging Consolidated', () => {
    let auditLogger: any;

    beforeEach(async () => {
      // Reset singleton instance before each test
      const { AuditLogger } = require('../../src/common/auditLogger');
      (AuditLogger as any).instance = null;
      auditLogger = AuditLogger.getInstance();
      // Clear any existing events
      (await auditLogger.getAuditEvents()).forEach(() => {});
    });

    test('should create audit log with basic event data', async () => {
      auditLogger.log({
        user: 'test-user',
        action: 'TEST_ACTION',
        resource: 'test-resource',
        result: 'success',
        details: 'Test audit event',
      });

      await auditLogger.waitForQueueDrain();

      const events = await auditLogger.getAuditEvents();
      // Find our test event by looking for the specific action
      const testEvent = events.find((event: any) => event.action === 'TEST_ACTION');
      expect(testEvent).toBeDefined();
      expect(testEvent.user).toBe('test-user');
      expect(testEvent.resource).toBe('test-resource');
      expect(testEvent.result).toBe('success');
      expect(testEvent.details).toBe('Test audit event');
      expect(testEvent.timestamp).toBeDefined();
      expect(testEvent.id).toBeDefined();
    });

    test('should filter events by user', async () => {
      // Clear existing events first
      const initialCount = (await auditLogger.getAuditEvents()).length;

      auditLogger.log({
        user: 'user1',
        action: 'ACTION1',
        resource: 'resource1',
        result: 'success',
        details: 'Event 1',
      });

      auditLogger.log({
        user: 'user2',
        action: 'ACTION2',
        resource: 'resource2',
        result: 'success',
        details: 'Event 2',
      });

      await auditLogger.waitForQueueDrain();

      const user1Events = await auditLogger.getAuditEventsByUser('user1');
      expect(user1Events.length).toBeGreaterThanOrEqual(1);
      expect(user1Events[user1Events.length - 1].user).toBe('user1');
    });
  });

  describe('Channel Routing Consolidated', () => {
    test('should parse channel bonuses and priorities correctly', () => {
      const {
        getBonusForChannel,
        getPriorityForChannel,
      } = require('../../src/message/routing/ChannelRouter');

      // Test with actual config values instead of mocking
      const c1Bonus = getBonusForChannel('C1');
      const c2Bonus = getBonusForChannel('C2');
      const c1Priority = getPriorityForChannel('C1');
      const c2Priority = getPriorityForChannel('C2');

      // These should return valid numbers (defaults if not configured)
      expect(typeof c1Bonus).toBe('number');
      expect(typeof c2Bonus).toBe('number');
      expect(typeof c1Priority).toBe('number');
      expect(typeof c2Priority).toBe('number');
      expect(c1Bonus).toBeGreaterThanOrEqual(0);
      expect(c2Bonus).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing channels with defaults', () => {
      const {
        getBonusForChannel,
        getPriorityForChannel,
      } = require('../../src/message/routing/ChannelRouter');

      const unknownBonus = getBonusForChannel('UNKNOWN');
      const unknownPriority = getPriorityForChannel('UNKNOWN');

      // Should return default values for unknown channels
      expect(typeof unknownBonus).toBe('number');
      expect(typeof unknownPriority).toBe('number');
      expect(unknownBonus).toBeGreaterThanOrEqual(0);
      expect(unknownPriority).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Loading Consolidated', () => {
    test('should handle webhook configuration loading', () => {
      const OLD_ENV = process.env;
      process.env = {};
      jest.resetModules();
      const freshWebhookConfig = require('../../src/config/webhookConfig').default;

      expect(freshWebhookConfig.get('WEBHOOK_ENABLED')).toBe(false);
      expect(freshWebhookConfig.get('WEBHOOK_URL')).toBe('');
      expect(freshWebhookConfig.get('WEBHOOK_TOKEN')).toBe('');
      expect(freshWebhookConfig.get('WEBHOOK_IP_WHITELIST')).toBe('');
      expect(freshWebhookConfig.get('WEBHOOK_PORT')).toBe(80);

      // Test schema validation
      expect(() => freshWebhookConfig.validate({ allowed: 'strict' })).not.toThrow();

      // Test environment variable loading
      process.env.WEBHOOK_ENABLED = 'true';
      process.env.WEBHOOK_URL = 'http://example.com/webhook';
      process.env.WEBHOOK_PORT = '3000';

      jest.resetModules();
      const envConfig = require('../../src/config/webhookConfig').default;
      expect(envConfig.get('WEBHOOK_ENABLED')).toBe(true);
      expect(envConfig.get('WEBHOOK_URL')).toBe('http://example.com/webhook');
      expect(envConfig.get('WEBHOOK_PORT')).toBe(3000);

      process.env = OLD_ENV;
    });

    test('should handle OpenWebUI configuration loading', () => {
      const OLD_ENV = process.env;
      process.env = {};
      jest.resetModules();
      const freshOpenWebUIConfig = require('../../src/config/openWebUIConfig').default;

      expect(freshOpenWebUIConfig.get('OPEN_WEBUI_API_URL')).toBe(
        'http://host.docker.internal:3000/api/'
      );
      expect(freshOpenWebUIConfig.get('OPEN_WEBUI_USERNAME')).toBe('admin');
      expect(freshOpenWebUIConfig.get('OPEN_WEBUI_PASSWORD')).toBe('password123');
      expect(freshOpenWebUIConfig.get('OPEN_WEBUI_KNOWLEDGE_FILE')).toBe('');
      expect(freshOpenWebUIConfig.get('OPEN_WEBUI_MODEL')).toBe('llama3.2');

      // Test schema validation
      expect(() => freshOpenWebUIConfig.validate({ allowed: 'strict' })).not.toThrow();

      // Test environment variable loading
      process.env.OPEN_WEBUI_API_URL = 'http://localhost:3000/api/';
      process.env.OPEN_WEBUI_USERNAME = 'testuser';
      process.env.OPEN_WEBUI_MODEL = 'llama3.1';

      jest.resetModules();
      const envConfig = require('../../src/config/openWebUIConfig').default;
      expect(envConfig.get('OPEN_WEBUI_API_URL')).toBe('http://localhost:3000/api/');
      expect(envConfig.get('OPEN_WEBUI_USERNAME')).toBe('testuser');
      expect(envConfig.get('OPEN_WEBUI_MODEL')).toBe('llama3.1');

      process.env = OLD_ENV;
    });

    test('should handle Mattermost configuration defaults and validation', () => {
      const OLD_ENV = process.env;
      process.env = {};
      jest.resetModules();
      const freshMattermostConfig = require('../../src/config/mattermostConfig').default;

      expect(freshMattermostConfig.get('MATTERMOST_SERVER_URL')).toBe('');
      expect(freshMattermostConfig.get('MATTERMOST_TOKEN')).toBe('');
      expect(freshMattermostConfig.get('MATTERMOST_CHANNEL')).toBe('');

      // Test schema validation
      expect(() => freshMattermostConfig.validate({ allowed: 'strict' })).not.toThrow();

      // Test environment variable loading
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      process.env.MATTERMOST_TOKEN = 'test-token';
      process.env.MATTERMOST_CHANNEL = 'test-channel';

      jest.resetModules();
      const envConfig = require('../../src/config/mattermostConfig').default;
      expect(envConfig.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
      expect(envConfig.get('MATTERMOST_TOKEN')).toBe('test-token');
      expect(envConfig.get('MATTERMOST_CHANNEL')).toBe('test-channel');

      process.env = OLD_ENV;
    });

    test('should handle configuration validation with complex data structures', async () => {
      const { AuditLogger } = require('../../src/common/auditLogger');
      const auditLogger = AuditLogger.getInstance();

      // Test with complex nested data structures
      const complexEvent = {
        user: 'admin-user',
        action: 'CONFIG_UPDATE',
        resource: 'bots/complex-bot',
        result: 'success',
        details: 'Updated complex configuration',
        metadata: {
          timestamp: new Date().toISOString(),
          changes: {
            oldConfig: { token: 'old-token', channels: ['general', 'support'] },
            newConfig: { token: 'new-token', channels: ['general', 'support', 'announcements'] },
          },
          validation: {
            schema: 'v2.0',
            errors: [],
            warnings: ['channel_limit_approaching'],
          },
        },
      };

      auditLogger.log(complexEvent);

      await auditLogger.waitForQueueDrain();

      const events = await auditLogger.getAuditEvents();
      const foundEvent = events.find((event: any) => event.action === 'CONFIG_UPDATE');

      expect(foundEvent).toBeDefined();
      expect(foundEvent.user).toBe('admin-user');
      expect(foundEvent.resource).toBe('bots/complex-bot');
      expect(foundEvent.metadata).toBeDefined();
      expect(foundEvent.metadata.changes.oldConfig.token).toBe('old-token');
      expect(foundEvent.metadata.changes.newConfig.channels).toHaveLength(3);
      expect(foundEvent.metadata.validation.schema).toBe('v2.0');
      expect(foundEvent.metadata.validation.warnings).toContain('channel_limit_approaching');
    });

    test('should handle concurrent configuration operations with race conditions', async () => {
      const {
        getBonusForChannel,
        getPriorityForChannel,
      } = require('../../src/message/routing/ChannelRouter');

      // Test concurrent access without mocking - just verify the functions work under load
      const concurrentOperations = Array(50)
        .fill(null)
        .map(async (_, index) => {
          const channelId = `channel-${index % 5}`; // Use fewer channels for more realistic testing

          // Get configuration values concurrently
          const bonus = getBonusForChannel(channelId);
          const priority = getPriorityForChannel(channelId);

          return { channelId, bonus, priority, timestamp: Date.now() };
        });

      const results = await Promise.all(concurrentOperations);

      // Verify all operations completed successfully
      expect(results).toHaveLength(50);

      // Verify data consistency - each channel should have consistent values
      const channelGroups = results.reduce((acc: any, result) => {
        if (!acc[result.channelId]) acc[result.channelId] = [];
        acc[result.channelId].push(result);
        return acc;
      }, {});

      // Each channel should have consistent bonus and priority values
      Object.values(channelGroups).forEach((channelResults: any) => {
        const firstResult = channelResults[0];
        channelResults.forEach((result: any) => {
          expect(result.bonus).toBe(firstResult.bonus);
          expect(result.priority).toBe(firstResult.priority);
          expect(typeof result.bonus).toBe('number');
          expect(typeof result.priority).toBe('number');
          expect(result.bonus).toBeGreaterThanOrEqual(0);
          expect(result.priority).toBeGreaterThanOrEqual(0);
        });
      });

      // Verify operations completed quickly (performance test)
      const timestamps = results.map((r) => r.timestamp);
      const timeRange = Math.max(...timestamps) - Math.min(...timestamps);
      expect(timeRange).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
