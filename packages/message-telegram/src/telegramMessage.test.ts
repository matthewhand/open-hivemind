import { TelegramMessage, type TelegramApiMessage } from './TelegramMessage';

const buildApiMessage = (over: Partial<TelegramApiMessage> = {}): TelegramApiMessage => ({
  message_id: 42,
  from: { id: 1001, is_bot: false, first_name: 'Ada', last_name: 'Lovelace', username: 'ada' },
  chat: { id: -500123, type: 'group', title: 'Engine Room' },
  date: 1750000000,
  text: 'hello hivemind',
  ...over,
});

describe('TelegramMessage update→IMessage conversion', () => {
  it('maps the core fields onto the IMessage shape', () => {
    const msg = new TelegramMessage(buildApiMessage());

    expect(msg.getText()).toBe('hello hivemind');
    expect(msg.content).toBe('hello hivemind');
    expect(msg.getMessageId()).toBe('42');
    expect(msg.getChannelId()).toBe('-500123');
    expect(msg.channelId).toBe('-500123');
    expect(msg.platform).toBe('telegram');
    expect(msg.role).toBe('user');
    expect(msg.getAuthorId()).toBe('1001');
    expect(msg.getAuthorName()).toBe('Ada Lovelace');
    expect(msg.getChannelTopic()).toBe('Engine Room');
    expect(msg.getChannelUsers()).toEqual([]);
  });

  it('converts the unix-seconds date into a Date in milliseconds', () => {
    const msg = new TelegramMessage(buildApiMessage({ date: 1750000000 }));
    expect(msg.getTimestamp().getTime()).toBe(1750000000 * 1000);
  });

  it('falls back to caption when text is absent (e.g. photo messages)', () => {
    const msg = new TelegramMessage(
      buildApiMessage({ text: undefined, caption: 'look at this graph' })
    );
    expect(msg.getText()).toBe('look at this graph');
  });

  it('falls back to username then Unknown for the author name', () => {
    const noNames = buildApiMessage({
      from: { id: 7, is_bot: false, first_name: '', username: 'ghost' },
    });
    expect(new TelegramMessage(noNames).getAuthorName()).toBe('ghost');

    const anonymous = buildApiMessage({ from: undefined });
    const msg = new TelegramMessage(anonymous);
    expect(msg.getAuthorName()).toBe('Unknown');
    expect(msg.getAuthorId()).toBe('');
  });

  it('setText updates the content', () => {
    const msg = new TelegramMessage(buildApiMessage());
    msg.setText('rewritten');
    expect(msg.getText()).toBe('rewritten');
  });

  it('flags bot-authored messages', () => {
    const fromBot = buildApiMessage({
      from: { id: 2, is_bot: true, first_name: 'OtherBot' },
    });
    expect(new TelegramMessage(fromBot).isFromBot()).toBe(true);
    expect(new TelegramMessage(buildApiMessage()).isFromBot()).toBe(false);
  });

  it('treats private chats as direct messages', () => {
    const dm = buildApiMessage({ chat: { id: 1001, type: 'private' } });
    expect(new TelegramMessage(dm).isDirectMessage()).toBe(true);
    expect(new TelegramMessage(buildApiMessage()).isDirectMessage()).toBe(false);
  });

  describe('mentions', () => {
    it('extracts @username mentions from entities', () => {
      const msg = new TelegramMessage(
        buildApiMessage({
          text: 'hey @hivebot and @ada, look',
          entities: [
            { type: 'mention', offset: 4, length: 8 },
            { type: 'mention', offset: 17, length: 4 },
          ],
        })
      );
      expect(msg.getUserMentions()).toEqual(['hivebot', 'ada']);
      expect(msg.mentionsUsers('hivebot')).toBe(true);
      expect(msg.mentionsUsers('someone-else')).toBe(false);
    });

    it('extracts numeric ids from text_mention entities (users without a username)', () => {
      const msg = new TelegramMessage(
        buildApiMessage({
          text: 'hey Ada',
          entities: [
            {
              type: 'text_mention',
              offset: 4,
              length: 3,
              user: { id: 555, is_bot: false, first_name: 'Ada' },
            },
          ],
        })
      );
      expect(msg.getUserMentions()).toEqual(['555']);
      expect(msg.mentionsUsers('555')).toBe(true);
    });

    it('maps the bot numeric id to its @username mention', () => {
      const msg = new TelegramMessage(
        buildApiMessage({
          text: '@hivebot ping',
          entities: [{ type: 'mention', offset: 0, length: 8 }],
        }),
        { botUserId: '999', botUsername: 'hivebot' }
      );
      expect(msg.mentionsUsers('999')).toBe(true);
      expect(msg.mentionsUsers('998')).toBe(false);
      expect(msg.mentionsUsers('')).toBe(false);
    });
  });

  it('detects replies to the bot', () => {
    const replyToUs = buildApiMessage({
      reply_to_message: buildApiMessage({
        from: { id: 999, is_bot: true, first_name: 'HiveBot' },
      }),
    });
    expect(new TelegramMessage(replyToUs, { botUserId: '999' }).isReplyToBot()).toBe(true);

    const replyToHuman = buildApiMessage({
      reply_to_message: buildApiMessage({
        from: { id: 123, is_bot: false, first_name: 'Human' },
      }),
    });
    expect(new TelegramMessage(replyToHuman, { botUserId: '999' }).isReplyToBot()).toBe(false);
    expect(new TelegramMessage(buildApiMessage(), { botUserId: '999' }).isReplyToBot()).toBe(false);
  });
});
