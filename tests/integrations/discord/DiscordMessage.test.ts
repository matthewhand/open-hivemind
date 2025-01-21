import DiscordMessage from '@integrations/discord/DiscordMessage';
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
    };

    discordMessage = new DiscordMessage(mockMessage as any);
  });

  it('should instantiate correctly', () => {
    expect(discordMessage).toBeInstanceOf(DiscordMessage);
    expect(discordMessage.getMessageId()).toBe('0987654321');
    expect(discordMessage.getText()).toBe('Test message');
  });

  it('should set text correctly', async () => {
    await discordMessage.setText('Updated message');
    expect(discordMessage.content).toBe('Updated message');
    expect(mockMessage.edit).toHaveBeenCalledWith('Updated message');
  });

  it('should identify if message is from a bot', () => {
    expect(discordMessage.isFromBot()).toBe(false);
  });
});