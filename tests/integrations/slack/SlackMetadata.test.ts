import { extractSlackMetadata } from '@src/integrations/slack/slackMetadata';

describe('Slack Metadata Extraction', () => {
  it('should extract metadata from a complete Slack event', () => {
    const event = {
      user: 'U12345',
      channel: 'C67890',
      ts: '1610000000.000200',
      thread_ts: '1610000000.000100',
      team: 'T11111',
    };
    const metadata = extractSlackMetadata(event);
    expect(metadata).toEqual({
      slackUser: 'U12345',
      slackChannel: 'C67890',
      slackTimestamp: '1610000000.000200',
      slackThread: '1610000000.000100',
      slackTeam: 'T11111',
    });
  });

  it('should handle missing optional fields', () => {
    const event = {
      user: 'U12345',
      channel: 'C67890',
      ts: '1610000000.000200',
    };
    const metadata = extractSlackMetadata(event);
    expect(metadata).toEqual({
      slackUser: 'U12345',
      slackChannel: 'C67890',
      slackTimestamp: '1610000000.000200',
      slackThread: undefined,
      slackTeam: undefined,
    });
  });

  it('should handle empty event object', () => {
    const event = {};
    const metadata = extractSlackMetadata(event);
    expect(metadata).toEqual({
      slackUser: undefined,
      slackChannel: undefined,
      slackTimestamp: undefined,
      slackThread: undefined,
      slackTeam: undefined,
    });
  });

  it('should handle null/undefined event', () => {
    expect(() => extractSlackMetadata(null as any)).not.toThrow();
    expect(() => extractSlackMetadata(undefined as any)).not.toThrow();
  });

  it('should extract from nested message structure', () => {
    const event = {
      message: {
        user: 'U99999',
        ts: '1610000000.000300',
      },
      channel: 'C11111',
      team: 'T22222',
    };
    const metadata = extractSlackMetadata(event);
    expect(metadata.slackChannel).toBe('C11111');
    expect(metadata.slackTeam).toBe('T22222');
  });

  it('should handle bot messages', () => {
    const event = {
      bot_id: 'B12345',
      channel: 'C67890',
      ts: '1610000000.000400',
      subtype: 'bot_message',
    };
    const metadata = extractSlackMetadata(event);
    expect(metadata.slackChannel).toBe('C67890');
    expect(metadata.slackTimestamp).toBe('1610000000.000400');
  });

  it('should handle different timestamp formats', () => {
    const event1 = { ts: '1610000000.000500' };
    const event2 = { event_ts: '1610000000.000600' };
    const event3 = { message_ts: '1610000000.000700' };

    expect(extractSlackMetadata(event1).slackTimestamp).toBe('1610000000.000500');
    expect(extractSlackMetadata(event2).slackTimestamp).toBe('1610000000.000600');
    expect(extractSlackMetadata(event3).slackTimestamp).toBe('1610000000.000700');
  });
});
