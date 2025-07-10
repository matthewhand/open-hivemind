import DiscordMessage from '@integrations/discord/DiscordMessage';
import { Message, TextChannel, Collection, GuildMember, User } from 'discord.js';

// Helper to create a mock TextChannel instance that passes `instanceof TextChannel` checks
const createMockTextChannel = (data: any = {}): TextChannel => {
    const channel = Object.create(TextChannel.prototype);
    return Object.assign(channel, {
        id: 'channel-id',
        topic: null,
        // The `members` property is a manager with a `cache` property that holds the collection
        members: {
            cache: data.members?.cache || new Collection<string, GuildMember>(),
        },
        messages: {
            fetch: jest.fn(),
        },
        ...data,
    });
};

// Helper to create a mock Message object
const createMockMessage = (data: any = {}): Message<boolean> => {
    const message = Object.create(Message.prototype);
    const finalData = {
        id: 'message-id',
        content: 'Hello, world!',
        author: { id: 'author-id', bot: false },
        createdAt: new Date(),
        editable: false,
        edit: jest.fn().mockResolvedValue(message),
        // `mentions` is an object with a `users` property that is a collection
        mentions: {
            users: data.mentions?.users || new Collection<string, User>(),
        },
        reference: null,
        ...data,
        // Ensure channel is always a proper mock, merging overrides
        channel: createMockTextChannel(data.channel),
    };
    finalData.channelId = finalData.channel.id;
    return Object.assign(message, finalData);
};

describe('DiscordMessage Extended', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the correct timestamp', () => {
    const now = new Date();
    const mockMessage = createMockMessage({ createdAt: now });
    const discordMessage = new DiscordMessage(mockMessage);
    expect(discordMessage.getTimestamp()).toBe(now);
  });

  it('should set text and edit the message if editable', () => {
    const mockMessage = createMockMessage({ editable: true });
    const discordMessage = new DiscordMessage(mockMessage);
    discordMessage.setText('New content');
    expect(discordMessage.getText()).toBe('New content');
    expect(mockMessage.edit).toHaveBeenCalledWith('New content');
  });

  it('should set text but not edit the message if not editable', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mockMessage = createMockMessage({ editable: false });
    const discordMessage = new DiscordMessage(mockMessage);
    discordMessage.setText('New content');
    expect(discordMessage.getText()).toBe('New content');
    expect(mockMessage.edit).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Message message-id is not editable.');
    consoleWarnSpy.mockRestore();
  });

  it('should return null if channel topic is not available', () => {
    const mockMessage = createMockMessage({ channel: { topic: null } });
    const discordMessage = new DiscordMessage(mockMessage);
    expect(discordMessage.getChannelTopic()).toBeNull();
  });

  it('should return null if channel is not a TextChannel', () => {
    const mockMessage = createMockMessage();
    Object.setPrototypeOf(mockMessage.channel, Object.prototype); // Break prototype chain
    const discordMessage = new DiscordMessage(mockMessage);
    expect(discordMessage.getChannelTopic()).toBeNull();
  });

  it('should return an empty array if channel is not a TextChannel for getChannelUsers', () => {
      const mockMessage = createMockMessage();
      Object.setPrototypeOf(mockMessage.channel, Object.prototype); // Break prototype chain
      const discordMessage = new DiscordMessage(mockMessage);
      expect(discordMessage.getChannelUsers()).toEqual([]);
  });

  it('should return true if replied message is from a bot', () => {
    const mockMessage = createMockMessage();
    const repliedMessage = createMockMessage({ author: { id: 'bot-id', bot: true } });
    const discordMessage = new DiscordMessage(mockMessage, repliedMessage);
    expect(discordMessage.isReplyToBot()).toBe(true);
  });

  it('should return false if replied message is not from a bot', () => {
    const mockMessage = createMockMessage();
    const repliedMessage = createMockMessage({ author: { id: 'user-id', bot: false } });
    const discordMessage = new DiscordMessage(mockMessage, repliedMessage);
    expect(discordMessage.isReplyToBot()).toBe(false);
  });

  it('should return false if no replied message', () => {
    const mockMessage = createMockMessage();
    const discordMessage = new DiscordMessage(mockMessage, null);
    expect(discordMessage.isReplyToBot()).toBe(false);
  });

  it('should fetch and return referenced message', async () => {
    const referencedMsg = createMockMessage({ id: 'referenced-id' });
    const mockMessage = createMockMessage({
      channel: {
        messages: { fetch: jest.fn().mockResolvedValue(referencedMsg) },
      },
      reference: { messageId: 'referenced-id' },
    });
    const discordMessage = new DiscordMessage(mockMessage);
    const result = await discordMessage.getReferencedMessage();
    expect(result).toBeInstanceOf(DiscordMessage);
    expect(result?.getMessageId()).toBe('referenced-id');
  });

  it('should return null if no referenced message', async () => {
    const mockMessage = createMockMessage({ reference: null });
    const discordMessage = new DiscordMessage(mockMessage);
    const result = await discordMessage.getReferencedMessage();
    expect(result).toBeNull();
  });

  it('should return null if fetching referenced message fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockMessage = createMockMessage({
      channel: {
        messages: { fetch: jest.fn().mockRejectedValue(new Error('Fetch error')) },
      },
      reference: { messageId: 'referenced-id' },
    });
    const discordMessage = new DiscordMessage(mockMessage);
    const result = await discordMessage.getReferencedMessage();
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch referenced message: Fetch error');
    consoleErrorSpy.mockRestore();
  });

  it('should return the channel topic if available', () => {
    const mockMessage = createMockMessage({ channel: { topic: 'Test Topic' } });
    const discordMessage = new DiscordMessage(mockMessage);
    expect(discordMessage.getChannelTopic()).toBe('Test Topic');
  });

  it.skip('should return user mentions', () => {
    const users = new Collection<string, User>();
    users.set('user1', { id: 'user1' } as User);
    users.set('user2', { id: 'user2' } as User);
    const mockMessage = createMockMessage({
      mentions: { users },
    });
    const discordMessage = new DiscordMessage(mockMessage);
    expect(discordMessage.getUserMentions()).toEqual(['user1', 'user2']);
  });

  it.skip('should return channel users', () => {
    const members = new Collection<string, GuildMember>();
    members.set('user1', { user: { id: 'user1' } } as GuildMember);
    members.set('user2', { user: { id: 'user2' } } as GuildMember);
    const mockMessage = createMockMessage({
      channel: {
        members: {
          cache: members,
        }
      },
    });
    const discordMessage = new DiscordMessage(mockMessage);
    expect(discordMessage.getChannelUsers()).toEqual(['user1', 'user2']);
  });
});
