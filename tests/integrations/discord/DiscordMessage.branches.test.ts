import Debug from 'debug';
import { DiscordMessage } from '@hivemind/adapter-discord';

// Silence debug and console noise
jest.mock('debug', () => () => jest.fn());

describe('DiscordMessage - branches and edge cases', () => {
  const baseAuthor = (over: Partial<any> = {}) => ({
    id: 'user-1',
    username: 'TestUser',
    discriminator: '0001',
    bot: false,
    ...over,
  });

  const baseChannel = (over: Partial<any> = {}) => ({
    id: 'channel-1',
    // for topic tests (explicit or absent)
    topic: undefined,
    members: undefined,
    // messages must be nested under channel as per DiscordMessage.getReferencedMessage
    messages: {
      fetch: jest.fn(),
    },
    ...over,
  });

  const baseMessage = (over: Partial<any> = {}) => ({
    id: 'msg-1',
    content: 'Hello world',
    channelId: 'channel-1',
    createdAt: new Date('2020-01-01T00:00:00Z'),
    editable: false,
    edit: jest.fn(),
    author: baseAuthor(),
    channel: baseChannel(),
    // mentions: mimic discord.js Mentions object shape expected by DiscordMessage
    mentions: {
      users: [{ id: 'user-2' }, { id: 'user-3' }],
    },
    reference: undefined,
    ...over,
  });

  it('getMessageId returns fallback "unknown" when message.id missing', () => {
    const msg = baseMessage({ id: undefined as any });
    const dm = new DiscordMessage(msg as any);
    expect(dm.getMessageId()).toBe('unknown');
  });

  it('getText returns content and constructor applies fallback for empty content', () => {
    const dm1 = new DiscordMessage(baseMessage({ content: 'Hi' }) as any);
    expect(dm1.getText()).toBe('Hi');

    const dm2 = new DiscordMessage(baseMessage({ content: '' }) as any);
    expect(dm2.getText()).toBe('[No content]');
  });

  it('setText updates content; logs non-editable warning; and handles editable edit()', async () => {
    // Non-editable path: should not call edit, only warn internally
    const nonEditable = baseMessage({ editable: false });
    const dmNon = new DiscordMessage(nonEditable as any);
    dmNon.setText('new text A');
    expect(dmNon.getText()).toBe('new text A');
    expect(nonEditable.edit).not.toHaveBeenCalled();

    // Editable path: calls edit and catches potential reject
    const editMock = jest.fn().mockResolvedValue(undefined);
    const editable = baseMessage({ editable: true, edit: editMock });
    const dmYes = new DiscordMessage(editable as any);
    dmYes.setText('new text B');
    expect(editMock).toHaveBeenCalledWith('new text B');

    // Editable with rejection to exercise catch()
    const editReject = jest.fn().mockRejectedValue(new Error('edit failed'));
    const editable2 = baseMessage({ editable: true, edit: editReject });
    const dmErr = new DiscordMessage(editable2 as any);
    await expect(dmErr.setText('new text C')).rejects.toThrow('edit failed');
    expect(editReject).toHaveBeenCalledWith('new text C');
  });

  it('getChannelTopic returns explicit topic, null when missing, and handles errors', () => {
    // channel with explicit topic
    const withTopic = baseMessage({ channel: baseChannel({ topic: 'my-topic' }) });
    const dm1 = new DiscordMessage(withTopic as any);
    expect(dm1.getChannelTopic()).toBe('my-topic');

    // channel with topic empty -> null
    const emptyTopic = baseMessage({ channel: baseChannel({ topic: '' }) });
    const dm2 = new DiscordMessage(emptyTopic as any);
    expect(dm2.getChannelTopic()).toBeNull();

    // channel without topic property -> null
    const noTopicProp = baseMessage({ channel: { id: 'c', members: undefined, messages: { fetch: jest.fn() } } });
    const dm3 = new DiscordMessage(noTopicProp as any);
    expect(dm3.getChannelTopic()).toBeNull();

    // force error path
    const errChannel = {
      get topic() {
        throw new Error('boom');
      },
    };
    const errMsg = baseMessage({ channel: errChannel as any });
    const dm4 = new DiscordMessage(errMsg as any);
    expect(dm4.getChannelTopic()).toBeNull();
  });

  it('getAuthorId and getAuthorName cover fallbacks', () => {
    const dm = new DiscordMessage(baseMessage() as any);
    expect(dm.getAuthorId()).toBe('user-1');
    expect(dm.getAuthorName()).toBe('TestUser');

    const dmUnknown = new DiscordMessage(baseMessage({ author: baseAuthor({ username: '' }) }) as any);
    expect(dmUnknown.getAuthorName()).toBe('Unknown Author');
  });

  it('isFromBot true when author.bot is true; false otherwise', () => {
    const dmFalse = new DiscordMessage(baseMessage({ author: baseAuthor({ bot: false }) }) as any);
    expect(dmFalse.isFromBot()).toBe(false);

    const dmTrue = new DiscordMessage(baseMessage({ author: baseAuthor({ bot: true }) }) as any);
    expect(dmTrue.isFromBot()).toBe(true);

    // Provide minimal author shape to satisfy constructor while simulating missing author.bot downstream
    const dmNoAuthor = new DiscordMessage(
      baseMessage({
        author: { id: 'x', username: 'u', discriminator: '0000', bot: undefined } as any,
      }) as any
    );
    expect(dmNoAuthor.isFromBot()).toBe(false);
  });

  it('isReplyToBot returns true when repliedMessage.author.bot is true; false when absent', () => {
    const replied = baseMessage({ author: baseAuthor({ bot: true }) });
    const msg = baseMessage();
    const dmTrue = new DiscordMessage(msg as any, replied as any);
    expect(dmTrue.isReplyToBot()).toBe(true);

    const dmNone = new DiscordMessage(msg as any, null as any);
    expect(dmNone.isReplyToBot()).toBe(false);

    const repliedNoAuthor = baseMessage({ author: undefined as any });
    const dmFalse = new DiscordMessage(msg as any, repliedNoAuthor as any);
    expect(dmFalse.isReplyToBot()).toBe(false);
  });

  describe('getUserMentions branch coverage', () => {
    it('returns mapped ids when mentions.users.map exists (array of users)', () => {
      const msg = baseMessage({
        mentions: {
          users: [{ id: 'user-2' }, { id: 'user-3' }],
        },
      });
      const dm = new DiscordMessage(msg as any);
      expect(dm.getUserMentions()).toEqual(['user-2', 'user-3']);
    });

    it('handles mentions.users as plain array', () => {
      const msg = baseMessage({
        mentions: {
          users: [{ id: 'a' }, { id: 'b' }],
        },
      });
      const dm = new DiscordMessage(msg as any);
      expect(dm.getUserMentions()).toEqual(['a', 'b']);
    });

    it('handles mentions.users as plain object without map', () => {
      // Force object branch by providing a non-array object and no .map
      const msg = baseMessage({
        mentions: {
          users: { x: { id: 'x' }, y: { id: 'y' } } as any,
        },
      });
      const dm = new DiscordMessage(msg as any);
      expect(dm.getUserMentions()).toEqual(['x', 'y']);
    });

    it('returns [] when mentions missing or throws', () => {
      const msgNo = baseMessage({ mentions: undefined as any });
      const dmNo = new DiscordMessage(msgNo as any);
      expect(dmNo.getUserMentions()).toEqual([]);

      // Force exception
      const msgErr = baseMessage({
        mentions: {
          get users() {
            throw new Error('boom');
          },
        } as any,
      });
      const dmErr = new DiscordMessage(msgErr as any);
      expect(dmErr.getUserMentions()).toEqual([]);
    });
  });

  describe('getChannelUsers branch coverage', () => {
    it('returns ids when members is Collection-like with map()', () => {
      const members = {
        map: (fn: any) => [{ user: { id: 'u1' } }, { user: { id: 'u2' } }].map(fn),
      } as any;
      const msg = baseMessage({ channel: baseChannel({ members }) });
      const dm = new DiscordMessage(msg as any);
      expect(dm.getChannelUsers()).toEqual(['u1', 'u2']);
    });

    it('returns ids when members is an array', () => {
      const membersArr = [{ user: { id: 'u3' } }, { user: { id: 'u4' } }];
      const msg = baseMessage({ channel: baseChannel({ members: membersArr }) });
      const dm = new DiscordMessage(msg as any);
      expect(dm.getChannelUsers()).toEqual(['u3', 'u4']);
    });

    it('returns ids when members is a plain object map', () => {
      const membersObj = { a: { user: { id: 'u5' } }, b: { user: { id: 'u6' } } };
      const msg = baseMessage({ channel: baseChannel({ members: membersObj }) });
      const dm = new DiscordMessage(msg as any);
      expect(dm.getChannelUsers()).toEqual(['u5', 'u6']);
    });

    it('returns [] when channel or members missing, or when error thrown', () => {
      const msgNoChan = baseMessage({ channel: undefined as any });
      const dmNoChan = new DiscordMessage(msgNoChan as any);
      expect(dmNoChan.getChannelUsers()).toEqual([]);

      const msgNoMembers = baseMessage({ channel: baseChannel({ members: undefined }) });
      const dmNoMem = new DiscordMessage(msgNoMembers as any);
      expect(dmNoMem.getChannelUsers()).toEqual([]);

      const errMembers = {
        get members() {
          throw new Error('boom');
        },
      };
      const msgErr = baseMessage({ channel: errMembers as any });
      const dmErr = new DiscordMessage(msgErr as any);
      expect(dmErr.getChannelUsers()).toEqual([]);
    });
  });

  it('mentionsUsers delegates to mentions.users.has and guards missing mentions', () => {
    // Provide a has() on mentions.users to match implementation contract
    const msg = baseMessage({
      mentions: {
        users: {
          has: (id: string) => id === 'user-2',
        } as any,
      },
    });
    const dm = new DiscordMessage(msg as any);
    expect(dm.mentionsUsers('user-2')).toBe(true);
    expect(dm.mentionsUsers('nope')).toBe(false);

    const msgNo = baseMessage({ mentions: undefined as any });
    const dmNo = new DiscordMessage(msgNo as any);
    expect(dmNo.mentionsUsers('user-2')).toBe(false);
  });

  describe('getReferencedMessage', () => {
    it('returns referenced message wrapped as DiscordMessage when fetch resolves', async () => {
      const referenced = baseMessage({ id: 'msg-2' });
      const fetch = jest.fn().mockResolvedValue(referenced);
      const channel = baseChannel({ messages: { fetch } });
      const msg = baseMessage({
        channel,
        reference: { messageId: 'msg-2' },
      });
      const dm = new DiscordMessage(msg as any);
      const res = await dm.getReferencedMessage();
      expect(fetch).toHaveBeenCalledWith('msg-2');
      expect(res).toBeInstanceOf(DiscordMessage);
      expect((res as any).getMessageId()).toBe('msg-2');
    });

    it('returns null when fetch rejects', async () => {
      const fetch = jest.fn().mockRejectedValue(new Error('nope'));
      const channel = baseChannel({ messages: { fetch } });
      const msg = baseMessage({
        channel,
        reference: { messageId: 'msg-err' },
      });
      const dm = new DiscordMessage(msg as any);
      const res = await dm.getReferencedMessage();
      expect(fetch).toHaveBeenCalledWith('msg-err');
      expect(res).toBeNull();
    });

    it('returns null when no reference present', async () => {
      const msg = baseMessage({ reference: undefined });
      const dm = new DiscordMessage(msg as any);
      const res = await dm.getReferencedMessage();
      expect(res).toBeNull();
    });
  });

  it('getChannelId and getTimestamp return expected values', () => {
    const when = new Date('2022-02-02T02:02:02Z');
    const dm = new DiscordMessage(baseMessage({ channelId: 'C-1', createdAt: when }) as any);
    expect(dm.getChannelId()).toBe('C-1');
    expect(dm.getTimestamp()).toEqual(when);
  });

  it('getOriginalMessage returns underlying object', () => {
    const msg = baseMessage();
    const dm = new DiscordMessage(msg as any);
    expect(dm.getOriginalMessage()).toBe(msg);
  });
});