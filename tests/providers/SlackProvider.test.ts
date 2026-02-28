import { SlackProvider } from '../../src/providers/SlackProvider';
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

// Mock SlackService
const mockSlackInstance = {
    getBotNames: jest.fn().mockReturnValue(['bot1']),
    getBotConfig: jest.fn().mockReturnValue({ slack: { defaultChannelId: 'C123', mode: 'socket' } }),
    addBot: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@hivemind/adapter-slack', () => ({
  SlackService: {
    getInstance: jest.fn(() => mockSlackInstance),
  },
}));

// Mock process.cwd to return a fixed path
const originalCwd = process.cwd;
beforeAll(() => {
    process.cwd = jest.fn().mockReturnValue('/app');
});
afterAll(() => {
    process.cwd = originalCwd;
});

describe('SlackProvider', () => {
  let provider: SlackProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SlackProvider();

    // Default fs behavior
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ slack: { instances: [] } }));
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  it('should have correct id and type', () => {
    expect(provider.id).toBe('slack');
    expect(provider.type).toBe('messenger');
    expect(provider.label).toBe('Slack');
  });

  it('should return schema', () => {
    const schema = provider.getSchema();
    // console.log('Schema:', JSON.stringify(schema, null, 2));
    expect(schema).toBeDefined();

    // Check if properties exist directly or nested
    const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
    if (!props.SLACK_BOT_TOKEN) {
         throw new Error('Keys: ' + Object.keys(props).join(', '));
    }
    expect(props.SLACK_BOT_TOKEN).toBeDefined();
  });

  it('should return sensitive keys', () => {
    const keys = provider.getSensitiveKeys();
    expect(keys).toContain('SLACK_BOT_TOKEN');
    expect(keys).toContain('SLACK_APP_TOKEN');
    expect(keys).toContain('SLACK_SIGNING_SECRET');
  });

  it('should get status with bots', async () => {
    mockSlackInstance.getBotNames.mockReturnValue(['bot1', 'bot2']);
    mockSlackInstance.getBotConfig.mockImplementation((name) => {
        if (name === 'bot1') return { slack: { defaultChannelId: 'C1', mode: 'socket' } };
        return { slack: { defaultChannelId: 'C2', mode: 'rtm' } };
    });

    const status = await provider.getStatus();

    expect(status.ok).toBe(true);
    expect(status.count).toBe(2);
    expect(status.bots).toHaveLength(2);
    expect(status.bots[0]).toEqual({
        provider: 'slack',
        name: 'bot1',
        defaultChannel: 'C1',
        mode: 'socket',
        connected: true,
    });
  });

  it('should add a bot', async () => {
    const newBotConfig = {
      name: 'newbot',
      botToken: 'xoxb-token',
      signingSecret: 'secret',
      appToken: 'xapp-token',
      defaultChannelId: 'C999',
      mode: 'socket',
    };

    await provider.addBot(newBotConfig);

    // Verify file write
    expect(fs.promises.mkdir).toHaveBeenCalled();
    expect(fs.promises.writeFile).toHaveBeenCalled();
    const writeCall = (fs.promises.writeFile as jest.Mock).mock.calls[0];
    const writtenConfig = JSON.parse(writeCall[1]);
    expect(writtenConfig.slack.instances).toHaveLength(1);
    expect(writtenConfig.slack.instances[0].name).toBe('newbot');
    expect(writtenConfig.slack.instances[0].token).toBe('xoxb-token');

    // Verify runtime add
    expect(mockSlackInstance.addBot).toHaveBeenCalledWith(expect.objectContaining({
        name: 'newbot',
        slack: expect.objectContaining({
            botToken: 'xoxb-token',
            defaultChannelId: 'C999'
        })
    }));
  });

  it('should throw error when adding bot with missing required fields', async () => {
    await expect(provider.addBot({ name: 'failbot' })).rejects.toThrow('name, botToken, and signingSecret are required');
  });

  it('should reload configuration', async () => {
    // Mock fs to return existing bots
    const mockFileContent = JSON.stringify({
        slack: {
            instances: [
                { name: 'bot1', token: 'token1', signingSecret: 's1' },
                { name: 'bot2', token: 'token2', signingSecret: 's2' } // New bot
            ]
        }
    });
    (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);

    // Assume bot1 is already running
    mockSlackInstance.getBotNames.mockReturnValue(['bot1']);

    const result = await provider.reload();

    expect(result.added).toBe(1); // bot2 should be added
    expect(mockSlackInstance.addBot).toHaveBeenCalledTimes(1);
    expect(mockSlackInstance.addBot).toHaveBeenCalledWith(expect.objectContaining({
        name: 'bot2'
    }));
  });
});
