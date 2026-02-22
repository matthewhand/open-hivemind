import SlackMessage from '@hivemind/adapter-slack/SlackMessage';

describe('SlackMessage normalization', () => {
  it('extracts authorId from data.user string', () => {
    const data = { user: 'U123ABC' };
    const msg = new SlackMessage('hello', 'C123', data);
    expect(msg.getAuthorId()).toBe('U123ABC');
  });

  it('extracts authorId from data.user.id object form', () => {
    const data = { user: { id: 'U999XYZ', name: 'alice' } };
    const msg = new SlackMessage('hello', 'C123', data);
    expect(msg.getAuthorId()).toBe('U999XYZ');
    expect(msg.getAuthorName()).toBe('alice');
  });

  it('falls back to user_id and message.user', () => {
    const d1 = { user_id: 'UAAA111' };
    const m1 = new SlackMessage('hi', 'C1', d1);
    expect(m1.getAuthorId()).toBe('UAAA111');

    const d2 = { message: { user: 'UBBB222' } };
    const m2 = new SlackMessage('hi', 'C1', d2);
    expect(m2.getAuthorId()).toBe('UBBB222');
  });

  it('detects bot messages via subtype and bot_id', () => {
    const d1 = { subtype: 'bot_message' };
    const m1 = new SlackMessage('bot says', 'C1', d1);
    expect(m1.isFromBot()).toBe(true);

    const d2 = { bot_id: 'B123' };
    const m2 = new SlackMessage('bot says', 'C1', d2);
    expect(m2.isFromBot()).toBe(true);

    const d3 = { message: { subtype: 'bot_message' } };
    const m3 = new SlackMessage('nested bot', 'C1', d3);
    expect(m3.isFromBot()).toBe(true);

    const d4 = { subtype: 'file_share' };
    const m4 = new SlackMessage('user says', 'C1', d4);
    expect(m4.isFromBot()).toBe(false);
  });

  it('parses mentions from <@UID> tokens and updates on setText()', () => {
    const text = 'hello <@U123ABC> and <@U456DEF> and <@U123ABC>';
    const decoded = text.replace(/</g, '<').replace(/>/g, '>');
    const m = new SlackMessage(decoded, 'C1', {});
    expect(m.getUserMentions().sort()).toEqual(['U123ABC', 'U456DEF'].sort());
    expect(m.mentionsUsers('U123ABC')).toBe(true);
    expect(m.mentionsUsers('UNOT')).toBe(false);

    m.setText('<@U999> updated');
    expect(m.getUserMentions()).toEqual(['U999']);
  });

  it('extracts messageId from ts/message_ts/event_ts', () => {
    const m1 = new SlackMessage('x', 'C', { ts: '1712345678.000200' });
    expect(m1.getMessageId()).toBe('1712345678.000200');

    const m2 = new SlackMessage('x', 'C', { message_ts: '1712345678.000300' });
    expect(m2.getMessageId()).toBe('1712345678.000300');

    const m3 = new SlackMessage('x', 'C', { event_ts: '1712345678.000400' });
    expect(m3.getMessageId()).toBe('1712345678.000400');
  });

  it('converts ts to Date with milliseconds precision', () => {
    const m = new SlackMessage('x', 'C', { ts: '1712345678.042' });
    const t = m.getTimestamp().getTime();
    // 1712345678 seconds = 1712345678000 ms + 42 ms = 1712345678042
    expect(t).toBe(1712345678042);
  });

  it('defaults when fields are missing', () => {
    const m = new SlackMessage('', '', {});
    expect(m.getText()).toBe('');
    expect(m.getChannelId()).toBe('');
    expect(m.getAuthorId()).toBe('unknown');
    expect(m.getMessageId()).toBe('unknown');
    expect(m.getUserMentions()).toEqual([]);
    expect(m.getChannelUsers()).toEqual([]);
    expect(m.getAuthorName()).toBe('Unknown User');
    expect(m.isFromBot()).toBe(false);
    expect(m.isReplyToBot()).toBe(false);
    expect(m.getChannelTopic()).toBeNull();
  });
});
