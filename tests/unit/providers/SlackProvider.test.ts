import { SlackProvider } from '../../../src/providers/SlackProvider';
import { SlackService } from '@hivemind/adapter-slack';
import slackConfig from '../../../src/config/slackConfig';
import fs from 'fs';
import path from 'path';

// Mocks
jest.mock('@hivemind/adapter-slack', () => ({
  SlackService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../src/config/slackConfig', () => ({
  __esModule: true,
  default: {
    getSchema: jest.fn(),
    get: jest.fn(),
  },
  getSchema: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
  dirname: (p: string) => p.substring(0, p.lastIndexOf('/')),
}));

describe('SlackProvider', () => {
  let provider: SlackProvider;
  let mockSlackInstance: any;

  beforeEach(() => {
    mockSlackInstance = {
      getBotNames: jest.fn().mockReturnValue([]),
      getBotConfig: jest.fn(),
      addBot: jest.fn().mockResolvedValue(undefined),
    };
    (SlackService.getInstance as jest.Mock).mockReturnValue(mockSlackInstance);

    // Clear mocks
    jest.clearAllMocks();

    // Instantiate provider
    provider = new SlackProvider();
  });

  describe('Metadata', () => {
    it('should have correct id and type', () => {
      expect(provider.id).toBe('slack');
      expect(provider.type).toBe('messenger');
      expect(provider.label).toBe('Slack');
    });

    it('should provide sensitive keys', () => {
      const keys = provider.getSensitiveKeys();
      expect(keys).toContain('SLACK_BOT_TOKEN');
      expect(keys).toContain('SLACK_APP_TOKEN');
    });

    it('should return schema from config', () => {
      const mockSchema = { type: 'object' };
      (slackConfig.getSchema as jest.Mock).mockReturnValue(mockSchema);
      expect(provider.getSchema()).toBe(mockSchema);
    });
  });

  describe('Status and Bots', () => {
    it('should return empty status when no bots', async () => {
      mockSlackInstance.getBotNames.mockReturnValue([]);
      const status = await provider.getStatus();
      expect(status.ok).toBe(true);
      expect(status.count).toBe(0);
      expect(status.bots).toEqual([]);
    });

    it('should return bot status', async () => {
      mockSlackInstance.getBotNames.mockReturnValue(['bot1']);
      mockSlackInstance.getBotConfig.mockReturnValue({ slack: { defaultChannelId: 'C123', mode: 'socket' } });

      const status = await provider.getStatus();
      expect(status.count).toBe(1);
      expect(status.bots[0]).toEqual({
        provider: 'slack',
        name: 'bot1',
        defaultChannel: 'C123',
        mode: 'socket',
        connected: true,
      });
    });
  });

  describe('Add Bot', () => {
    it('should throw if required fields missing', async () => {
      await expect(provider.addBot({})).rejects.toThrow();
    });

    it('should add bot and persist config', async () => {
      const botConfig = {
        name: 'newbot',
        botToken: 'xoxb-token',
        signingSecret: 'secret',
        appToken: 'xapp-token',
      };

      (fs.promises.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      await provider.addBot(botConfig);

      // Verify file write
      expect(fs.promises.writeFile).toHaveBeenCalled();
      const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
      const writtenConfig = JSON.parse(writeCall[1]);
      expect(writtenConfig.slack.instances).toHaveLength(1);
      expect(writtenConfig.slack.instances[0].name).toBe('newbot');

      // Verify service call
      expect(mockSlackInstance.addBot).toHaveBeenCalledWith(expect.objectContaining({
        name: 'newbot',
        slack: expect.objectContaining({
          botToken: 'xoxb-token'
        })
      }));
    });
  });
});
