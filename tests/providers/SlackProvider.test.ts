import fs from 'fs';
import path from 'path';
import { SlackProvider } from '../../src/providers/SlackProvider';

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

jest.mock('@hivemind/message-slack', () => ({
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
    (fs.promises.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({ slack: { instances: [] } })
    );
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
    expect(typeof schema).toBe('object');

    // Check if properties exist directly or nested
    const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
    if (!props.SLACK_BOT_TOKEN) {
      throw new Error('Keys: ' + Object.keys(props).join(', '));
    }
    expect(props.SLACK_BOT_TOKEN).not.toBeUndefined();
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
    expect(status.bots[0]).toEqual(
      expect.objectContaining({
        provider: 'slack',
        name: 'bot1',
        defaultChannel: 'C1',
        mode: 'socket',
        connected: true,
      })
    );
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
    expect(mockSlackInstance.addBot).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'newbot',
        slack: expect.objectContaining({
          botToken: 'xoxb-token',
          defaultChannelId: 'C999',
        }),
      })
    );
  });

  it('should throw error when adding bot with missing required fields', async () => {
    await expect(provider.addBot({ name: 'failbot' })).rejects.toThrow(
      'name, botToken, and signingSecret are required'
    );
  });

  it('should reload configuration', async () => {
    // Mock fs to return existing bots
    const mockFileContent = JSON.stringify({
      slack: {
        instances: [
          { name: 'bot1', token: 'token1', signingSecret: 's1' },
          { name: 'bot2', token: 'token2', signingSecret: 's2' }, // New bot
        ],
      },
    });
    (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);

    // Assume bot1 is already running
    mockSlackInstance.getBotNames.mockReturnValue(['bot1']);

    const result = await provider.reload();

    expect(result.added).toBe(1); // bot2 should be added
    expect(mockSlackInstance.addBot).toHaveBeenCalledTimes(1);
    expect(mockSlackInstance.addBot).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'bot2',
      })
    );
  });

  describe('Message Provider Methods', () => {
    it('should send message via SlackService', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue('msg_123');
      (mockSlackInstance as any).sendMessageToChannel = mockSendMessage;

      const result = await provider.sendMessage('C123', 'Hello', 'bot1');

      expect(mockSendMessage).toHaveBeenCalledWith('C123', 'Hello', 'bot1');
      expect(result).toBe('msg_123');
    });

    it('should throw error when SlackService lacks sendMessageToChannel', async () => {
      delete (mockSlackInstance as any).sendMessageToChannel;

      await expect(provider.sendMessage('C123', 'Hello')).rejects.toThrow(
        'SlackProvider.sendMessage: SlackService does not expose sendMessageToChannel method'
      );
    });

    it('should get messages via SlackService', async () => {
      const mockMessages = [{ text: 'msg1' }, { text: 'msg2' }];
      (mockSlackInstance as any).fetchMessages = jest.fn().mockResolvedValue(mockMessages);

      const result = await provider.getMessages('C123', 10);

      expect((mockSlackInstance as any).fetchMessages).toHaveBeenCalledWith('C123', 10);
      expect(result).toEqual(mockMessages);
    });

    it('should get client ID via SlackService', () => {
      (mockSlackInstance as any).getClientId = jest.fn().mockReturnValue('U12345');

      const result = provider.getClientId();

      expect(result).toBe('U12345');
    });

    it('should return fallback client ID when method not available', () => {
      delete (mockSlackInstance as any).getClientId;

      const result = provider.getClientId();

      expect(result).toBe('slack');
    });

    it('should get forum owner via SlackService', async () => {
      (mockSlackInstance as any).getChannelOwnerId = jest.fn().mockResolvedValue('U99999');

      const result = await provider.getForumOwner('C123');

      expect((mockSlackInstance as any).getChannelOwnerId).toHaveBeenCalledWith('C123');
      expect(result).toBe('U99999');
    });

    it('should return empty string when forum owner not found', async () => {
      (mockSlackInstance as any).getChannelOwnerId = jest.fn().mockResolvedValue(null);

      const result = await provider.getForumOwner('C123');

      expect(result).toBe('');
    });

    it('should handle sendMessageToChannel as alias for sendMessage', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue('msg_456');
      (mockSlackInstance as any).sendMessageToChannel = mockSendMessage;

      const result = await provider.sendMessageToChannel('C123', 'Test', 'agent1');

      expect(mockSendMessage).toHaveBeenCalledWith('C123', 'Test', 'agent1');
      expect(result).toBe('msg_456');
    });
  });
});
