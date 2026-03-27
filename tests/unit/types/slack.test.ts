import {
  isSlackEventData,
  isSlackApiResponse,
  isSlackMessageResponse,
  isSlackChannel,
  isSlackUser,
} from '../../../src/types/slack';

describe('Slack Type Guards', () => {
  describe('isSlackEventData', () => {
    it('returns true for a valid SlackEventData', () => {
      expect(isSlackEventData({ type: 'message', channel: 'C123' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSlackEventData(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSlackEventData(undefined)).toBe(false);
    });

    it('returns false when type is missing', () => {
      expect(isSlackEventData({ channel: 'C123' })).toBe(false);
    });

    it('returns false when type is not a string', () => {
      expect(isSlackEventData({ type: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSlackEventData('string')).toBe(false);
      expect(isSlackEventData(42)).toBe(false);
      expect(isSlackEventData(true)).toBe(false);
    });
  });

  describe('isSlackApiResponse', () => {
    it('returns true for a valid SlackApiResponse', () => {
      expect(isSlackApiResponse({ ok: true })).toBe(true);
    });

    it('returns true when ok is false', () => {
      expect(isSlackApiResponse({ ok: false, error: 'not_authed' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSlackApiResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSlackApiResponse(undefined)).toBe(false);
    });

    it('returns false when ok is missing', () => {
      expect(isSlackApiResponse({ error: 'something' })).toBe(false);
    });

    it('returns false when ok is not a boolean', () => {
      expect(isSlackApiResponse({ ok: 'true' })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSlackApiResponse('string')).toBe(false);
      expect(isSlackApiResponse(42)).toBe(false);
      expect(isSlackApiResponse(true)).toBe(false);
    });
  });

  describe('isSlackMessageResponse', () => {
    it('returns true for a valid SlackMessageResponse', () => {
      expect(isSlackMessageResponse({ ts: '1234567890.123456' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSlackMessageResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSlackMessageResponse(undefined)).toBe(false);
    });

    it('returns false when ts is missing', () => {
      expect(isSlackMessageResponse({ channel: 'C123' })).toBe(false);
    });

    it('returns false when ts is not a string', () => {
      expect(isSlackMessageResponse({ ts: 12345 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSlackMessageResponse('string')).toBe(false);
      expect(isSlackMessageResponse(42)).toBe(false);
      expect(isSlackMessageResponse(true)).toBe(false);
    });
  });

  describe('isSlackChannel', () => {
    it('returns true for a valid SlackChannel', () => {
      expect(isSlackChannel({ id: 'C123', name: 'general', type: 'channel' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSlackChannel(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSlackChannel(undefined)).toBe(false);
    });

    it('returns false when id is missing', () => {
      expect(isSlackChannel({ name: 'general', type: 'channel' })).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(isSlackChannel({ id: 'C123', type: 'channel' })).toBe(false);
    });

    it('returns false when type is missing', () => {
      expect(isSlackChannel({ id: 'C123', name: 'general' })).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(isSlackChannel({ id: 123, name: 'general', type: 'channel' })).toBe(false);
    });

    it('returns false when name is not a string', () => {
      expect(isSlackChannel({ id: 'C123', name: 123, type: 'channel' })).toBe(false);
    });

    it('returns false when type is not a string', () => {
      expect(isSlackChannel({ id: 'C123', name: 'general', type: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSlackChannel('string')).toBe(false);
      expect(isSlackChannel(42)).toBe(false);
      expect(isSlackChannel(true)).toBe(false);
    });
  });

  describe('isSlackUser', () => {
    it('returns true for a valid SlackUser', () => {
      expect(isSlackUser({ id: 'U123', name: 'testuser' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSlackUser(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSlackUser(undefined)).toBe(false);
    });

    it('returns false when id is missing', () => {
      expect(isSlackUser({ name: 'testuser' })).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(isSlackUser({ id: 'U123' })).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(isSlackUser({ id: 123, name: 'testuser' })).toBe(false);
    });

    it('returns false when name is not a string', () => {
      expect(isSlackUser({ id: 'U123', name: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isSlackUser('string')).toBe(false);
      expect(isSlackUser(42)).toBe(false);
      expect(isSlackUser(true)).toBe(false);
    });
  });
});
