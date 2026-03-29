import fs from 'fs';
import path from 'path';
import { Discord } from '@hivemind/message-discord';
import { DiscordProvider } from '../../src/providers/DiscordProvider';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

// Mock Discord Service
const mockDiscordInstance = {
  getAllBots: jest.fn().mockReturnValue([]),
  addBot: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@hivemind/message-discord', () => ({
  Discord: {
    DiscordService: {
      getInstance: jest.fn(() => mockDiscordInstance),
    },
  },
}));

describe('DiscordProvider', () => {
  let provider: DiscordProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new DiscordProvider();

    (fs.promises.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({ discord: { instances: [] } })
    );
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  it('should have correct id and type', () => {
    expect(provider.id).toBe('discord');
    expect(provider.type).toBe('messenger');
    expect(provider.label).toBe('Discord');
  });

  it('should return schema', () => {
    const schema = provider.getSchema();
    expect(typeof schema).toBe('object');
    // Assuming schema has DISCORD_BOT_TOKEN based on config file
    const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
    expect(props.DISCORD_BOT_TOKEN).not.toBeUndefined();
  });

  it('should return sensitive keys', () => {
    const keys = provider.getSensitiveKeys();
    expect(keys).toContain('DISCORD_BOT_TOKEN');
    expect(keys).toContain('DISCORD_CLIENT_ID');
  });

  it('should get status', async () => {
    mockDiscordInstance.getAllBots.mockReturnValue([
      { botUserName: 'TestBot', config: { name: 'TestBot' } },
    ]);

    const status = await provider.getStatus();

    expect(status.ok).toBe(true);
    expect(status.count).toBe(1);
    expect(status.bots[0].name).toBe('TestBot');
  });

  it('should add bot', async () => {
    await provider.addBot({ name: 'newDiscordBot', token: 'token123' });

    // Verify file write
    expect(fs.promises.writeFile).toHaveBeenCalled();
    const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
    const writtenConfig = JSON.parse(writeCall[1]);
    expect(writtenConfig.discord.instances).toHaveLength(1);
    expect(writtenConfig.discord.instances[0].token).toBe('token123');

    // Verify runtime add
    expect(mockDiscordInstance.addBot).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'newDiscordBot',
        token: 'token123',
      })
    );
  });

  it('should throw error when adding bot without token', async () => {
    await expect(provider.addBot({ name: 'failbot' })).rejects.toThrow('token is required');
  });

  it('should reload configuration', async () => {
    // Mock fs to return existing bots
    const mockFileContent = JSON.stringify({
      discord: {
        instances: [{ name: 'bot1', token: 'token1', llm: 'openai' }],
      },
    });
    (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);

    // Assume no bots are running initially
    mockDiscordInstance.getAllBots.mockReturnValue([]);

    const result = await provider.reload();

    expect(result.added).toBe(1); // bot1 should be added
    expect(mockDiscordInstance.addBot).toHaveBeenCalledTimes(1);
    expect(mockDiscordInstance.addBot).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'bot1',
        token: 'token1',
      })
    );
  });

  describe('Message Provider Methods', () => {
    it('should send message via DiscordService', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue('msg_123');
      (mockDiscordInstance as any).sendMessage = mockSendMessage;

      const result = await provider.sendMessage('123456', 'Hello', 'bot1');

      expect(mockSendMessage).toHaveBeenCalledWith('123456', 'Hello', 'bot1');
      expect(result).toBe('msg_123');
    });

    it('should throw error when DiscordService lacks sendMessage', async () => {
      delete (mockDiscordInstance as any).sendMessage;

      await expect(provider.sendMessage('123456', 'Hello')).rejects.toThrow(
        'DiscordProvider.sendMessage: DiscordService does not expose sendMessage method'
      );
    });

    it('should get messages via DiscordService', async () => {
      const mockMessages = [{ text: 'msg1' }, { text: 'msg2' }];
      (mockDiscordInstance as any).fetchMessages = jest.fn().mockResolvedValue(mockMessages);

      const result = await provider.getMessages('123456', 10);

      expect((mockDiscordInstance as any).fetchMessages).toHaveBeenCalledWith('123456', 10);
      expect(result).toEqual(mockMessages);
    });

    it('should get client ID via DiscordService', () => {
      (mockDiscordInstance as any).getClientId = jest.fn().mockReturnValue('987654321');

      const result = provider.getClientId();

      expect(result).toBe('987654321');
    });

    it('should return fallback client ID when method not available', () => {
      delete (mockDiscordInstance as any).getClientId;

      const result = provider.getClientId();

      expect(result).toBe('discord');
    });

    it('should get forum owner via DiscordService', async () => {
      (mockDiscordInstance as any).getChannelOwnerId = jest.fn().mockResolvedValue('999888777');

      const result = await provider.getForumOwner('123456');

      expect((mockDiscordInstance as any).getChannelOwnerId).toHaveBeenCalledWith('123456');
      expect(result).toBe('999888777');
    });

    it('should return empty string when forum owner not found', async () => {
      (mockDiscordInstance as any).getChannelOwnerId = jest.fn().mockResolvedValue(null);

      const result = await provider.getForumOwner('123456');

      expect(result).toBe('');
    });

    it('should handle sendMessageToChannel via DiscordService', async () => {
      const mockSendMessageToChannel = jest.fn().mockResolvedValue('msg_456');
      (mockDiscordInstance as any).sendMessageToChannel = mockSendMessageToChannel;

      const result = await provider.sendMessageToChannel('123456', 'Test', 'agent1');

      expect(mockSendMessageToChannel).toHaveBeenCalledWith('123456', 'Test', 'agent1');
      expect(result).toBe('msg_456');
    });

    it('should fallback to sendMessage when sendMessageToChannel not available', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue('msg_789');
      (mockDiscordInstance as any).sendMessage = mockSendMessage;
      delete (mockDiscordInstance as any).sendMessageToChannel;

      const result = await provider.sendMessageToChannel('123456', 'Test', 'agent1');

      expect(mockSendMessage).toHaveBeenCalledWith('123456', 'Test', 'agent1');
      expect(result).toBe('msg_789');
    });
  });
});
