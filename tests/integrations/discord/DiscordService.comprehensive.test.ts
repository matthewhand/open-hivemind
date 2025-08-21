import { Discord } from '@src/integrations/discord/DiscordService';

jest.mock('discord.js');
jest.mock('@src/config/BotConfigurationManager');

describe('DiscordService Comprehensive', () => {
  let service: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      login: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      once: jest.fn(),
      destroy: jest.fn(),
      user: { id: 'bot123', tag: 'TestBot#1234' },
      channels: {
        fetch: jest.fn()
      },
      guilds: {
        cache: new Map()
      }
    };

    const { Client } = require('discord.js');
    Client.mockImplementation(() => mockClient);

    service = Discord.DiscordService.getInstance();
  });

  afterEach(() => {
    Discord.DiscordService['instance'] = undefined as any;
    jest.clearAllMocks();
  });

  it('should handle voice channel operations', async () => {
    const mockChannel = {
      id: '123456789',
      isVoiceBased: () => true,
      guild: { id: 'guild123' }
    };
    
    mockClient.channels.fetch.mockResolvedValue(mockChannel);
    
    await service.joinVoiceChannel('123456789');
    
    expect(service.getVoiceChannels()).toContain('123456789');
  });

  it('should handle message rate limiting', async () => {
    const mockChannel = {
      isTextBased: () => true,
      send: jest.fn()
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce({ id: 'msg123' })
    };
    
    mockClient.channels.fetch.mockResolvedValue(mockChannel);
    
    const result = await service.sendMessageToChannel('C123', 'Test message');
    
    expect(result).toBe('');
  });

  it('should handle channel routing with priorities', async () => {
    const mockChannel = {
      isTextBased: () => true,
      send: jest.fn().mockResolvedValue({ id: 'msg123' })
    };
    
    mockClient.channels.fetch.mockResolvedValue(mockChannel);
    
    const result = await service.sendMessageToChannel('C123', 'Test message');
    
    expect(mockClient.channels.fetch).toHaveBeenCalledWith('C123');
  });

  it('should handle bot configuration errors', () => {
    process.env.DISCORD_BOT_TOKEN = '';
    
    expect(() => new Discord.DiscordService()).toThrow();
  });

  it('should handle message history limits', async () => {
    const mockMessages = new Map();
    for (let i = 0; i < 20; i++) {
      mockMessages.set(`msg${i}`, { id: `msg${i}`, content: `Message ${i}` });
    }
    
    const mockChannel = {
      isTextBased: () => true,
      messages: {
        fetch: jest.fn().mockResolvedValue(mockMessages)
      }
    };
    
    mockClient.channels.fetch.mockResolvedValue(mockChannel);
    
    const messages = await service.getMessagesFromChannel('C123');
    
    expect(messages.length).toBeLessThanOrEqual(10);
  });

  it('should handle multi-bot operations', async () => {
    // Simulate multiple bots
    service.bots = [
      { client: mockClient, botUserId: 'bot1', botUserName: 'Bot1', config: {} },
      { client: mockClient, botUserId: 'bot2', botUserName: 'Bot2', config: {} }
    ];
    
    const bot = service.getBotByName('Bot2');
    
    expect(bot?.botUserName).toBe('Bot2');
  });

  it('should handle shutdown gracefully', async () => {
    service.bots = [
      { client: mockClient, botUserId: 'bot1', botUserName: 'Bot1', config: {} }
    ];
    
    await service.shutdown();
    
    expect(mockClient.destroy).toHaveBeenCalled();
  });

  it('should handle channel scoring for routing', () => {
    const score = service.scoreChannel('C123', { priority: 'high' });
    
    expect(typeof score).toBe('number');
  });
});