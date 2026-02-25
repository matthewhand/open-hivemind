import { SlackProvider } from '../../../src/providers/SlackProvider';
import { SlackService } from '@hivemind/adapter-slack';
import fs from 'fs';
import path from 'path';

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

// Mock path
jest.mock('path', () => ({
  join: (...args: any[]) => args.join('/'),
  dirname: (p: any) => 'mock-dir',
  resolve: (...args: any[]) => args.join('/'),
}));

// Mock adapter with Singleton behavior
jest.mock('@hivemind/adapter-slack', () => {
  const mockInstance = {
    getBotNames: jest.fn(),
    getBotConfig: jest.fn(),
    addBot: jest.fn(),
  };
  return {
    SlackService: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

// Mock config
jest.mock('../../../src/config/slackConfig', () => ({
  getSchema: jest.fn(() => ({})),
  get: jest.fn(),
  loadFile: jest.fn(),
  validate: jest.fn(),
}));

describe('SlackProvider', () => {
  let provider: SlackProvider;
  let mockSlackService: any;
  let fsMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SlackProvider();
    mockSlackService = SlackService.getInstance();
    fsMock = fs.promises;

    // Default mock implementation
    (mockSlackService.getBotNames as jest.Mock).mockReturnValue([]);
  });

  it('should have correct metadata', () => {
    expect(provider.id).toBe('slack');
    expect(provider.type).toBe('messenger');
    expect(provider.label).toBe('Slack');
  });

  it('should return schema and config', () => {
    expect(provider.getSchema()).toBeDefined();
    expect(provider.getConfig()).toBeDefined();
  });

  it('should return sensitive keys', () => {
    const keys = provider.getSensitiveKeys();
    expect(keys).toContain('SLACK_BOT_TOKEN');
  });

  describe('getStatus', () => {
    it('should return status with bots', async () => {
      (mockSlackService.getBotNames as jest.Mock).mockReturnValue(['bot1']);
      (mockSlackService.getBotConfig as jest.Mock).mockReturnValue({
        slack: { defaultChannelId: 'C123', mode: 'socket' }
      });

      const status = await provider.getStatus();
      expect(status.ok).toBe(true);
      expect(status.count).toBe(1);
      expect(status.bots[0].name).toBe('bot1');
      expect(status.bots[0].defaultChannel).toBe('C123');
    });
  });

  describe('addBot', () => {
    it('should add bot and persist config', async () => {
      const config = {
        name: 'newbot',
        botToken: 'xoxb-token',
        signingSecret: 'secret',
        mode: 'socket',
        llm: 'openai'
      };

      (fsMock.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
      (fsMock.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fsMock.writeFile as jest.Mock).mockResolvedValue(undefined);

      await provider.addBot(config);

      expect(fsMock.writeFile).toHaveBeenCalled();
      const [filePath, content] = fsMock.writeFile.mock.calls[0];
      const writtenConfig = JSON.parse(content);
      expect(writtenConfig.slack.instances).toHaveLength(1);
      expect(writtenConfig.slack.instances[0].name).toBe('newbot');

      expect(mockSlackService.addBot).toHaveBeenCalledWith(expect.objectContaining({
        name: 'newbot',
        slack: expect.objectContaining({ botToken: 'xoxb-token' })
      }));
    });

    it('should throw error if required fields are missing', async () => {
       const config = { name: 'bot' }; // Missing token
       await expect(provider.addBot(config)).rejects.toThrow('name, botToken, and signingSecret are required');
    });
  });
});
