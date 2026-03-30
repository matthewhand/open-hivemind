import {
  isDiscordAPIError,
  isDiscordAPIResponse,
  isDiscordChannel,
  isDiscordGuild,
  isDiscordMessage,
  isDiscordUser,
} from '../../../src/types/discord';

describe('Discord Type Guards', () => {
  describe('isDiscordMessage', () => {
    it('returns true for a valid DiscordMessage', () => {
      const msg = {
        id: '123',
        channel_id: 'ch-456',
        content: 'Hello world',
        author: { id: 'u-789', username: 'testuser', discriminator: '0001', avatar: null },
        timestamp: '2024-01-01T00:00:00Z',
      };
      expect(isDiscordMessage(msg)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscordMessage(null)).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(isDiscordMessage(undefined)).toBeFalsy();
    });

    it('returns false when id is missing', () => {
      expect(
        isDiscordMessage({
          channel_id: 'ch-456',
          content: 'Hello',
          author: { id: 'u-789' },
        })
      ).toBe(false);
    });

    it('returns false when channel_id is missing', () => {
      expect(
        isDiscordMessage({
          id: '123',
          content: 'Hello',
          author: { id: 'u-789' },
        })
      ).toBe(false);
    });

    it('returns false when content is missing', () => {
      expect(
        isDiscordMessage({
          id: '123',
          channel_id: 'ch-456',
          author: { id: 'u-789' },
        })
      ).toBe(false);
    });

    it('returns false when author is missing', () => {
      expect(
        isDiscordMessage({
          id: '123',
          channel_id: 'ch-456',
          content: 'Hello',
        })
      ).toBeFalsy();
    });

    it('returns false when author.id is missing', () => {
      expect(
        isDiscordMessage({
          id: '123',
          channel_id: 'ch-456',
          content: 'Hello',
          author: { username: 'test' },
        })
      ).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(
        isDiscordMessage({
          id: 123,
          channel_id: 'ch-456',
          content: 'Hello',
          author: { id: 'u-789' },
        })
      ).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isDiscordMessage('string')).toBe(false);
      expect(isDiscordMessage(42)).toBe(false);
      expect(isDiscordMessage(true)).toBe(false);
    });
  });

  describe('isDiscordUser', () => {
    it('returns true for a valid DiscordUser', () => {
      expect(
        isDiscordUser({ id: 'u-123', username: 'testuser', discriminator: '0001', avatar: null })
      ).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscordUser(null)).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(isDiscordUser(undefined)).toBeFalsy();
    });

    it('returns false when id is missing', () => {
      expect(isDiscordUser({ username: 'testuser' })).toBe(false);
    });

    it('returns false when username is missing', () => {
      expect(isDiscordUser({ id: 'u-123' })).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(isDiscordUser({ id: 123, username: 'testuser' })).toBe(false);
    });

    it('returns false when username is not a string', () => {
      expect(isDiscordUser({ id: 'u-123', username: 456 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isDiscordUser('string')).toBe(false);
      expect(isDiscordUser(42)).toBe(false);
      expect(isDiscordUser(true)).toBe(false);
    });
  });

  describe('isDiscordChannel', () => {
    it('returns true for a valid DiscordChannel', () => {
      expect(isDiscordChannel({ id: 'ch-123', type: 0 })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscordChannel(null)).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(isDiscordChannel(undefined)).toBeFalsy();
    });

    it('returns false when id is missing', () => {
      expect(isDiscordChannel({ type: 0 })).toBe(false);
    });

    it('returns false when type is missing', () => {
      expect(isDiscordChannel({ id: 'ch-123' })).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(isDiscordChannel({ id: 123, type: 0 })).toBe(false);
    });

    it('returns false when type is not a number', () => {
      expect(isDiscordChannel({ id: 'ch-123', type: 'text' })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isDiscordChannel('string')).toBe(false);
      expect(isDiscordChannel(42)).toBe(false);
      expect(isDiscordChannel(true)).toBe(false);
    });
  });

  describe('isDiscordGuild', () => {
    it('returns true for a valid DiscordGuild', () => {
      expect(isDiscordGuild({ id: 'g-123', name: 'Test Guild' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscordGuild(null)).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(isDiscordGuild(undefined)).toBeFalsy();
    });

    it('returns false when id is missing', () => {
      expect(isDiscordGuild({ name: 'Test Guild' })).toBe(false);
    });

    it('returns false when name is missing', () => {
      expect(isDiscordGuild({ id: 'g-123' })).toBe(false);
    });

    it('returns false when id is not a string', () => {
      expect(isDiscordGuild({ id: 123, name: 'Test Guild' })).toBe(false);
    });

    it('returns false when name is not a string', () => {
      expect(isDiscordGuild({ id: 'g-123', name: 456 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isDiscordGuild('string')).toBe(false);
      expect(isDiscordGuild(42)).toBe(false);
      expect(isDiscordGuild(true)).toBe(false);
    });
  });

  describe('isDiscordAPIResponse', () => {
    it('returns true for a valid DiscordAPIResponse', () => {
      expect(isDiscordAPIResponse({ ok: true })).toBe(true);
    });

    it('returns true when ok is false', () => {
      expect(isDiscordAPIResponse({ ok: false })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscordAPIResponse(null)).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(isDiscordAPIResponse(undefined)).toBeFalsy();
    });

    it('returns false when ok is missing', () => {
      expect(isDiscordAPIResponse({ data: 'something' })).toBe(false);
    });

    it('returns false when ok is not a boolean', () => {
      expect(isDiscordAPIResponse({ ok: 'true' })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isDiscordAPIResponse('string')).toBe(false);
      expect(isDiscordAPIResponse(42)).toBe(false);
      expect(isDiscordAPIResponse(true)).toBe(false);
    });
  });

  describe('isDiscordAPIError', () => {
    it('returns true for a valid DiscordAPIError', () => {
      expect(isDiscordAPIError({ code: 50001, message: 'Missing Access' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscordAPIError(null)).toBeFalsy();
    });

    it('returns false for undefined', () => {
      expect(isDiscordAPIError(undefined)).toBeFalsy();
    });

    it('returns false when code is missing', () => {
      expect(isDiscordAPIError({ message: 'Missing Access' })).toBe(false);
    });

    it('returns false when message is missing', () => {
      expect(isDiscordAPIError({ code: 50001 })).toBe(false);
    });

    it('returns false when code is not a number', () => {
      expect(isDiscordAPIError({ code: '50001', message: 'Missing Access' })).toBe(false);
    });

    it('returns false when message is not a string', () => {
      expect(isDiscordAPIError({ code: 50001, message: 123 })).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isDiscordAPIError('string')).toBe(false);
      expect(isDiscordAPIError(42)).toBe(false);
      expect(isDiscordAPIError(true)).toBe(false);
    });
  });
});
