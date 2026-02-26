import { DiscordProvider } from '../../src/providers/DiscordProvider';
import { Discord } from '@hivemind/adapter-discord';
import fs from 'fs';
import path from 'path';

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

jest.mock('@hivemind/adapter-discord', () => ({
  Discord: {
    DiscordService: {
        getInstance: jest.fn(() => mockDiscordInstance),
    }
  }
}));

describe('DiscordProvider', () => {
  let provider: DiscordProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new DiscordProvider();

    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ discord: { instances: [] } }));
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
    expect(schema).toBeDefined();
    // Assuming schema has DISCORD_BOT_TOKEN based on config file
    const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
    expect(props.DISCORD_BOT_TOKEN).toBeDefined();
  });

  it('should return sensitive keys', () => {
    const keys = provider.getSensitiveKeys();
    expect(keys).toContain('DISCORD_BOT_TOKEN');
    expect(keys).toContain('DISCORD_CLIENT_ID');
  });

  it('should get status', async () => {
    mockDiscordInstance.getAllBots.mockReturnValue([
        { botUserName: 'TestBot', config: { name: 'TestBot' } }
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
    expect(mockDiscordInstance.addBot).toHaveBeenCalledWith(expect.objectContaining({
        name: 'newDiscordBot',
        token: 'token123'
    }));
  });

  it('should throw error when adding bot without token', async () => {
    await expect(provider.addBot({ name: 'failbot' })).rejects.toThrow('token is required');
  });

  it('should reload configuration', async () => {
    // Mock fs to return existing bots
    const mockFileContent = JSON.stringify({
        discord: {
            instances: [
                { name: 'bot1', token: 'token1', llm: 'openai' }
            ]
        }
    });
    (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);

    // Assume no bots are running initially
    mockDiscordInstance.getAllBots.mockReturnValue([]);

    const result = await provider.reload();

    expect(result.added).toBe(1); // bot1 should be added
    expect(mockDiscordInstance.addBot).toHaveBeenCalledTimes(1);
    expect(mockDiscordInstance.addBot).toHaveBeenCalledWith(expect.objectContaining({
        name: 'bot1',
        token: 'token1'
    }));
  });
});
