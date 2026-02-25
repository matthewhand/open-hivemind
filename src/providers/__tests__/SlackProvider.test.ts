import { SlackProvider } from '../SlackProvider';
import { SlackService } from '@hivemind/adapter-slack';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('@hivemind/adapter-slack', () => ({
  SlackService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

// Mock config module - assuming default export is the convict config
jest.mock('../../config/slackConfig', () => ({
  __esModule: true,
  default: {
    getSchema: jest.fn(() => ({})),
    get: jest.fn(),
    loadFile: jest.fn(),
    validate: jest.fn(),
  },
}));

describe('SlackProvider', () => {
  let provider: SlackProvider;
  let mockSlackService: any;
  let mockFs: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service instance
    mockSlackService = {
      getBotNames: jest.fn().mockReturnValue(['bot1']),
      getBotConfig: jest.fn().mockReturnValue({ slack: { defaultChannelId: 'C123', mode: 'socket' } }),
      addBot: jest.fn().mockResolvedValue(undefined),
    };
    (SlackService.getInstance as jest.Mock).mockReturnValue(mockSlackService);

    // Setup mock fs
    mockFs = fs.promises;
    mockFs.readFile.mockResolvedValue(JSON.stringify({ slack: { instances: [] } }));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);

    provider = new SlackProvider();
  });

  it('should have correct metadata', () => {
    expect(provider.id).toBe('slack');
    expect(provider.label).toBe('Slack');
    expect(provider.type).toBe('messenger');
    expect(provider.getSensitiveKeys()).toEqual(['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET']);
  });

  it('should return schema and config', () => {
    expect(provider.getSchema()).toEqual({});
    expect(provider.getConfig()).toBeDefined();
  });

  it('should get status with bots', async () => {
    const status = await provider.getStatus();

    expect(status.ok).toBe(true);
    expect(status.bots).toHaveLength(1);
    expect(status.bots[0]).toEqual({
      provider: 'slack',
      name: 'bot1',
      defaultChannel: 'C123',
      mode: 'socket',
      connected: true,
    });
    expect(mockSlackService.getBotNames).toHaveBeenCalled();
  });

  it('should get bot names', () => {
    const names = provider.getBotNames();
    expect(names).toEqual(['bot1']);
    expect(mockSlackService.getBotNames).toHaveBeenCalled();
  });

  it('should add a bot and persist config', async () => {
    const botConfig = {
      name: 'newbot',
      botToken: 'xoxb-token',
      signingSecret: 'secret',
      appToken: 'xapp-token',
      defaultChannelId: 'C999',
      mode: 'socket',
      llm: 'openai',
    };

    await provider.addBot(botConfig);

    // Verify file write
    expect(mockFs.readFile).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalled();

    // Verify runtime add
    expect(mockSlackService.addBot).toHaveBeenCalledWith(expect.objectContaining({
      name: 'newbot',
      slack: expect.objectContaining({
        botToken: 'xoxb-token',
        signingSecret: 'secret',
        defaultChannelId: 'C999',
      }),
      llm: 'openai'
    }));
  });

  it('should throw error if required fields missing in addBot', async () => {
    await expect(provider.addBot({ name: 'fail' })).rejects.toThrow('name, botToken, and signingSecret are required');
  });
});
