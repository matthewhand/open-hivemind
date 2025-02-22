import { DiscordMessageProvider } from '@integrations/discord/providers/DiscordMessageProvider';
import { DiscordService } from '@integrations/discord/DiscordService';
import DiscordMessage from '@integrations/discord/DiscordMessage';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';

// Reset modules to ensure fresh mock application
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

jest.mock('discord.js', () => {
  const mockClient = {
    channels: {
      fetch: jest.fn().mockResolvedValue({
        isTextBased: jest.fn().mockReturnValue(true),
        messages: {
          fetch: jest.fn().mockResolvedValue(new Map([['1', { content: 'Test message from Discord', id: '1' }]])),
        },
      }),
    },
    login: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(), // Mock client.on
    user: { id: 'bot1', tag: 'Bot1#1234' }, // Mock user for ready event
  };
  return {
    Client: jest.fn(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildVoiceStates: 8,
    },
    TextChannel: jest.fn(), // Mock TextChannel
  };
});

describe('DiscordMessageProvider', () => {
  let provider: DiscordMessageProvider;

  beforeEach(async () => {
    process.env.DISCORD_BOT_TOKEN = 'token1'; // Ensure token is set
    (DiscordService as any).instance = undefined;
    provider = new DiscordMessageProvider();
    await DiscordService.getInstance().initialize(); // Initialize with mocked client
  });

  afterEach(() => {
    (DiscordService as any).instance = undefined;
  });

  it('should fetch messages from DiscordService', async () => {
    const messages = await provider.getMessages('test-channel');
    expect(messages).toHaveLength(1);
    expect(messages[0].getText()).toBe('Test message from Discord');
  });
});
