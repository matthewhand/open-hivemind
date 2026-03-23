import {
  isSlackEventData,
  isSlackApiResponse,
  isSlackMessageResponse,
  isSlackChannel,
  isSlackUser,
} from '../../../src/types/slack';

describe('Slack Type Guards', () => {
  describe('isSlackEventData', () => {
    it('returns true for a valid Slack event data object', () => {
      const data = {
        type: 'message',
        channel: 'C123',
        text: 'Hello world',
      };
      expect(isSlackEventData(data)).toBe(true);
    });

    it('returns false for null or undefined', () => {
      expect(isSlackEventData(null)).toBe(false);
      expect(isSlackEventData(undefined)).toBe(false);
    });

    it('returns false when "type" property is missing or not a string', () => {
      expect(isSlackEventData({ channel: 'C123' })).toBe(false);
      expect(isSlackEventData({ type: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSlackEventData('string')).toBe(false);
      expect(isSlackEventData(123)).toBe(false);
    });
  });

  describe('isSlackApiResponse', () => {
    it('returns true for a valid successful Slack API response', () => {
      const response = {
        ok: true,
        data: { some: 'data' },
      };
      expect(isSlackApiResponse(response)).toBe(true);
    });

    it('returns true for a valid error Slack API response', () => {
      const response = {
        ok: false,
        error: 'invalid_auth',
      };
      expect(isSlackApiResponse(response)).toBe(true);
    });

    it('returns false for null or undefined', () => {
      expect(isSlackApiResponse(null)).toBe(false);
      expect(isSlackApiResponse(undefined)).toBe(false);
    });

    it('returns false when "ok" property is missing or not a boolean', () => {
      expect(isSlackApiResponse({ data: {} })).toBe(false);
      expect(isSlackApiResponse({ ok: 'true' })).toBe(false);
    });
  });

  describe('isSlackMessageResponse', () => {
    it('returns true for a valid Slack message response', () => {
      const message = {
        ts: '1234567890.123456',
        text: 'Hello',
        user: 'U123',
      };
      expect(isSlackMessageResponse(message)).toBe(true);
    });

    it('returns false for null or undefined', () => {
      expect(isSlackMessageResponse(null)).toBe(false);
      expect(isSlackMessageResponse(undefined)).toBe(false);
    });

    it('returns false when "ts" property is missing or not a string', () => {
      expect(isSlackMessageResponse({ text: 'Hello' })).toBe(false);
      expect(isSlackMessageResponse({ ts: 12345 })).toBe(false);
    });
  });

  describe('isSlackChannel', () => {
    it('returns true for a valid Slack channel object', () => {
      const channel = {
        id: 'C123',
        name: 'general',
        type: 'public_channel',
      };
      expect(isSlackChannel(channel)).toBe(true);
    });

    it('returns false for null or undefined', () => {
      expect(isSlackChannel(null)).toBe(false);
      expect(isSlackChannel(undefined)).toBe(false);
    });

    it('returns false when required properties are missing', () => {
      expect(isSlackChannel({ id: 'C123', name: 'general' })).toBe(false);
      expect(isSlackChannel({ id: 'C123', type: 'public_channel' })).toBe(false);
      expect(isSlackChannel({ name: 'general', type: 'public_channel' })).toBe(false);
    });

    it('returns false when properties have wrong types', () => {
      expect(isSlackChannel({ id: 123, name: 'general', type: 'public_channel' })).toBe(false);
      expect(isSlackChannel({ id: 'C123', name: null, type: 'public_channel' })).toBe(false);
    });
  });

  describe('isSlackUser', () => {
    it('returns true for a valid Slack user object', () => {
      const user = {
        id: 'U123',
        name: 'alice',
      };
      expect(isSlackUser(user)).toBe(true);
    });

    it('returns false for null or undefined', () => {
      expect(isSlackUser(null)).toBe(false);
      expect(isSlackUser(undefined)).toBe(false);
    });

    it('returns false when required properties are missing', () => {
      expect(isSlackUser({ id: 'U123' })).toBe(false);
      expect(isSlackUser({ name: 'alice' })).toBe(false);
    });

    it('returns false when properties have wrong types', () => {
      expect(isSlackUser({ id: 123, name: 'alice' })).toBe(false);
      expect(isSlackUser({ id: 'U123', name: {} })).toBe(false);
    });
  });
});
