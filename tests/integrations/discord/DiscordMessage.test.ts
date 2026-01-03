import { DiscordMessage } from '@hivemind/adapter-discord';
import { Message, TextChannel, User } from 'discord.js';

describe('DiscordMessage', () => {
  let mockUser: any;
  let mockChannel: any;
  let mockMessage: any;
  let discordMessage: DiscordMessage;

  beforeEach(() => {
    mockUser = {
      id: '111111',
      username: 'TestUser',
      discriminator: '0001',
      bot: false,
      toString: jest.fn().mockReturnValue('<@111111>'),
    };

    mockChannel = {
      id: '1234567890',
      type: 'GUILD_TEXT',
      topic: 'Test Channel',
    };

    mockMessage = {
      content: 'Test message',
      channelId: mockChannel.id,
      id: '0987654321',
      author: mockUser,
      channel: mockChannel,
      editable: true,
      edit: jest.fn().mockResolvedValue({
        content: 'Updated message',
      }),
      createdAt: new Date(),
      mentions: { users: new Map() },
      attachments: new Map(),
    };

    discordMessage = new DiscordMessage(mockMessage as any);
  });

  it('should instantiate correctly', () => {
    expect(discordMessage).toBeInstanceOf(DiscordMessage);
    expect(discordMessage.getMessageId()).toBe('0987654321');
    expect(discordMessage.getText()).toBe('Test message');
  });

  it('should get all basic properties', () => {
    expect(discordMessage.getChannelId()).toBe('1234567890');
    expect(discordMessage.getAuthorId()).toBe('111111');
    expect(discordMessage.getAuthorName()).toBe('TestUser');
    expect(discordMessage.getTimestamp()).toBeInstanceOf(Date);
  });

  it('should set text correctly', async () => {
    await discordMessage.setText('Updated message');
    expect(discordMessage.content).toBe('Updated message');
    expect(mockMessage.edit).toHaveBeenCalledWith('Updated message');
  });

  it('should identify if message is from a bot', () => {
    expect(discordMessage.isFromBot()).toBe(false);

    mockUser.bot = true;
    const botMessage = new DiscordMessage(mockMessage as any);
    expect(botMessage.isFromBot()).toBe(true);
  });

  it('should handle mentions correctly', () => {
    const mentionedUser = { id: '222222', username: 'MentionedUser' };
    mockMessage.mentions.users = { '222222': mentionedUser };

    const messageWithMentions = new DiscordMessage(mockMessage as any);
    expect(messageWithMentions.getUserMentions()).toContain('222222');
  });

  it('should handle attachments', () => {
    const attachment = { id: '333333', url: 'https://example.com/image.png' };
    mockMessage.attachments.set('333333', attachment);

    const messageWithAttachments = new DiscordMessage(mockMessage as any);
    expect(messageWithAttachments.hasAttachments()).toBe(true);
  });

  it('should handle empty content', () => {
    mockMessage.content = '';
    const emptyMessage = new DiscordMessage(mockMessage as any);
    expect(emptyMessage.getText()).toBe('[No content]');
  });

  it('should handle edit failures gracefully', async () => {
    mockMessage.edit.mockRejectedValue(new Error('Edit failed'));
    await expect(discordMessage.setText('Failed update')).rejects.toThrow('Edit failed');
  });
});