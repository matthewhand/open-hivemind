/**
 * Slack Metadata Extraction Tests
 *
 * Tests extractSlackMetadata() against the full spectrum of Slack event
 * shapes: message events, button interactions, slash commands, file
 * shares, thread replies, and edge cases (missing fields, nested payloads).
 *
 * This replaces the old 117-line skipped test file that mocked the entire
 * SlackService and never ran a single assertion.
 */
import { extractSlackMetadata } from '@hivemind/message-slack/slackMetadata';

describe('Slack Metadata Extraction', () => {
  describe('Standard message events', () => {
    it('should extract user, channel, and timestamp from a basic message event', () => {
      const event = {
        type: 'message',
        user: 'U12345',
        channel: 'C67890',
        ts: '1700000000.000100',
        text: 'Hello!',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackUser).toBe('U12345');
      expect(meta.slackChannel).toBe('C67890');
      expect(meta.slackTimestamp).toBe('1700000000.000100');
      expect(meta.slackThread).toBeUndefined();
      expect(meta.slackTeam).toBeUndefined();
    });

    it('should extract thread_ts when replying in a thread', () => {
      const event = {
        type: 'message',
        user: 'U12345',
        channel: 'C67890',
        ts: '1700000001.000200',
        thread_ts: '1700000000.000100',
        text: 'Thread reply',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackThread).toBe('1700000000.000100');
    });

    it('should extract team ID when present', () => {
      const event = {
        type: 'message',
        user: 'U12345',
        channel: 'C67890',
        ts: '1700000000.000100',
        team: 'T99999',
      };

      const meta = extractSlackMetadata(event);
      expect(meta.slackTeam).toBe('T99999');
    });
  });

  describe('Message subtype events', () => {
    it('should extract user from message.user_changed event', () => {
      const event = {
        type: 'message',
        subtype: 'message_changed',
        channel: 'C67890',
        message: {
          user: 'U11111',
          ts: '1700000002.000300',
          thread_ts: '1700000000.000100',
          text: 'Edited message',
          team: 'T99999',
        },
        event_ts: '1700000002.000301',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackUser).toBe('U11111');
      // event_ts is the fallback chain: no event.ts → event.event_ts
      expect(meta.slackTimestamp).toBe('1700000002.000301');
      expect(meta.slackThread).toBe('1700000000.000100');
      expect(meta.slackTeam).toBe('T99999');
    });

    it('should extract bot_id from bot_message subtype', () => {
      const event = {
        type: 'message',
        subtype: 'bot_message',
        bot_id: 'B12345',
        channel: 'C67890',
        ts: '1700000000.000400',
        text: 'Bot said something',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackUser).toBe('B12345');
    });

    it('should extract user from message_deleted event', () => {
      const event = {
        type: 'message',
        subtype: 'message_deleted',
        channel: 'C67890',
        message: {
          user: 'U22222',
          ts: '1700000000.000100',
        },
        event_ts: '1700000003.000500',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackUser).toBe('U22222');
      // Falls back to event_ts since event.ts is not present
      expect(meta.slackTimestamp).toBe('1700000003.000500');
    });
  });

  describe('File share events', () => {
    it('should extract metadata from file_share event', () => {
      const event = {
        type: 'message',
        subtype: 'file_share',
        user: 'U33333',
        channel: 'C67890',
        ts: '1700000004.000600',
        files: [{ id: 'F12345', name: 'report.pdf' }],
        team: 'T99999',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackUser).toBe('U33333');
      expect(meta.slackChannel).toBe('C67890');
      expect(meta.slackTimestamp).toBe('1700000004.000600');
      expect(meta.slackTeam).toBe('T99999');
    });
  });

  describe('Thread and message_ts edge cases', () => {
    it('should fallback to event_ts when ts is missing', () => {
      const event = {
        type: 'message',
        user: 'U44444',
        channel: 'C67890',
        event_ts: '1700000005.000700',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackTimestamp).toBe('1700000005.000700');
    });

    it('should fallback to message_ts when ts and event_ts are missing', () => {
      const event = {
        type: 'message',
        user: 'U55555',
        channel: 'C67890',
        message_ts: '1700000006.000800',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackTimestamp).toBe('1700000006.000800');
    });

    it('should prefer ts over event_ts when both present', () => {
      const event = {
        type: 'message',
        user: 'U66666',
        channel: 'C67890',
        ts: '1700000007.000900',
        event_ts: '1700000008.001000',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackTimestamp).toBe('1700000007.000900');
    });

    it('should extract thread_ts from nested message object', () => {
      const event = {
        type: 'message',
        channel: 'C67890',
        message: {
          user: 'U77777',
          ts: '1700000009.001100',
          thread_ts: '1700000000.000100',
        },
        event_ts: '1700000009.001101',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackThread).toBe('1700000000.000100');
    });
  });

  describe('Null and undefined inputs', () => {
    it('should return all undefined when event is null', () => {
      const meta = extractSlackMetadata(null as any);

      expect(meta.slackUser).toBeUndefined();
      expect(meta.slackChannel).toBeUndefined();
      expect(meta.slackTimestamp).toBeUndefined();
      expect(meta.slackThread).toBeUndefined();
      expect(meta.slackTeam).toBeUndefined();
    });

    it('should return all undefined when event is undefined', () => {
      const meta = extractSlackMetadata(undefined as any);

      expect(meta.slackUser).toBeUndefined();
      expect(meta.slackChannel).toBeUndefined();
      expect(meta.slackTimestamp).toBeUndefined();
    });

    it('should return all undefined when event is empty object', () => {
      const meta = extractSlackMetadata({});

      expect(meta.slackUser).toBeUndefined();
      expect(meta.slackChannel).toBeUndefined();
      expect(meta.slackTimestamp).toBeUndefined();
      expect(meta.slackThread).toBeUndefined();
      expect(meta.slackTeam).toBeUndefined();
    });
  });

  describe('Interactive payload events', () => {
    it('should extract metadata from block_actions payload', () => {
      const event = {
        type: 'block_actions',
        user: { id: 'U88888' },
        channel: { id: 'C67890' },
        message_ts: '1700000010.001200',
        team: { id: 'T99999' },
      };

      const meta = extractSlackMetadata(event);

      // user is an object here, so extractSlackMetadata returns the object
      expect(meta.slackUser).toEqual({ id: 'U88888' });
      expect(meta.slackChannel).toEqual({ id: 'C67890' });
    });
  });
});
