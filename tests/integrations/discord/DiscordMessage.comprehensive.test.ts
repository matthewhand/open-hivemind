import { DiscordMessage } from '@src/integrations/discord/DiscordMessage';
import { Message, User, TextChannel } from 'discord.js';

describe.skip('DiscordMessage Comprehensive', () => {
  let mockMessage: jest.Mocked<Message>;
  let mockUser: jest.Mocked<User>;
  let mockChannel: jest.Mocked<TextChannel>;

  beforeEach(() => {
    mockUser = {
      id: 'U123456789',
      username: 'testuser',
      discriminator: '1234',
      tag: 'testuser#1234',
      bot: false
    } as any;

    mockChannel = {
      id: 'C123456789',
      name: 'general',
      type: 0
    } as any;

    mockMessage = {
      id: 'M123456789',
      content: 'Hello world',
      author: mockUser,
      channel: mockChannel,
      createdAt: new Date('2024-01-01T12:00:00Z'),
      editedAt: null,
      mentions: { users: new Map(), channels: new Map(), roles: new Map() },
      attachments: new Map(),
      embeds: [],
      reactions: new Map()
    } as any;
  });

  it('should convert Discord message to IMessage', () => {
    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.id).toBe('M123456789');
    expect(iMessage.content).toBe('Hello world');
    expect(iMessage.userId).toBe('U123456789');
    expect(iMessage.userName).toBe('testuser#1234');
    expect(iMessage.channelId).toBe('C123456789');
    expect(iMessage.platform).toBe('discord');
  });

  it('should handle edited messages', () => {
    mockMessage.editedAt = new Date('2024-01-01T12:30:00Z');
    
    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.metadata?.edited).toBe(true);
    expect(iMessage.metadata?.editedAt).toEqual(mockMessage.editedAt);
  });

  it('should handle messages with mentions', () => {
    const mentionedUser = { id: 'U987654321', username: 'mentioned' } as User;
    mockMessage.mentions.users.set('U987654321', mentionedUser);

    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.metadata?.mentions).toContain('U987654321');
  });

  it('should handle messages with attachments', () => {
    const attachment = {
      id: 'A123',
      name: 'image.png',
      url: 'https://cdn.discord.com/attachments/123/456/image.png',
      size: 1024
    };
    mockMessage.attachments.set('A123', attachment as any);

    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.metadata?.attachments).toHaveLength(1);
    expect(iMessage.metadata?.attachments?.[0].url).toBe(attachment.url);
  });

  it('should handle bot messages', () => {
    mockUser.bot = true;

    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.metadata?.isBot).toBe(true);
  });

  it('should handle empty content', () => {
    mockMessage.content = '';

    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.content).toBe('');
  });

  it('should handle thread messages', () => {
    mockMessage.thread = { id: 'T123456789' } as any;

    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.metadata?.threadId).toBe('T123456789');
  });

  it('should handle message reactions', () => {
    const reaction = {
      emoji: { name: '👍' },
      count: 5,
      users: { cache: new Map([['U1', {}], ['U2', {}]]) }
    };
    mockMessage.reactions.set('👍', reaction as any);

    const discordMsg = new DiscordMessage(mockMessage);
    const iMessage = discordMsg.toIMessage();

    expect(iMessage.metadata?.reactions).toHaveLength(1);
    expect(iMessage.metadata?.reactions?.[0].emoji).toBe('👍');
    expect(iMessage.metadata?.reactions?.[0].count).toBe(5);
  });
});