import fs from 'fs';
import path from 'path';
import { MattermostService } from '@hivemind/message-mattermost';
import mattermostConfig from '../../src/config/mattermostConfig';
import { MattermostProvider } from '../../src/providers/MattermostProvider';

// Mock fs module
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

// Mock Mattermost Service
const mockMattermostInstance = {
  getBotNames: jest.fn(() => []),
  getBotConfig: jest.fn(() => ({})),
  sendMessageToChannel: jest.fn(),
  getMessagesFromChannel: jest.fn(),
  getClientId: jest.fn(),
  getChannelOwnerId: jest.fn(),
  initialize: jest.fn(),
};

// Mock dependencies
jest.mock('@hivemind/message-mattermost', () => ({
  MattermostService: {
    getInstance: jest.fn(() => mockMattermostInstance),
  },
}));

describe('MattermostProvider', () => {
  let provider: MattermostProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new MattermostProvider();

    (fs.promises.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({ mattermost: { instances: [] } })
    );
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  it('should have correct id and type', () => {
    expect(provider.id).toBe('mattermost');
    expect(provider.type).toBe('messenger');
    expect(provider.label).toBe('Mattermost');
  });

  it('should return schema', () => {
    const schema = provider.getSchema();
    expect(typeof schema).toBe('object');
    // Verify properties from mattermostConfig
    const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
    expect(props.MATTERMOST_SERVER_URL).not.toBeUndefined();
  });

  it('should return sensitive keys', () => {
    expect(provider.getSensitiveKeys()).toContain('MATTERMOST_TOKEN');
  });

  it('should get status', async () => {
    const status = await provider.getStatus();
    expect(status.ok).toBe(true);
    expect(status.bots).toEqual([]);
  });

  it('should return bot names', () => {
    expect(provider.getBotNames()).toEqual([]);
  });

  it('should return bots list', async () => {
    const bots = await provider.getBots();
    expect(bots).toEqual([]);
  });

  it('should throw error for unimplemented addBot', async () => {
    await expect(provider.addBot({})).rejects.toThrow('Method not implemented.');
  });

  describe('Message Provider Methods', () => {
    describe('sendMessage', () => {
      it('should delegate to MattermostService.sendMessageToChannel', async () => {
        mockMattermostInstance.sendMessageToChannel.mockResolvedValue('post_123');

        const result = await provider.sendMessage('channel123', 'Hello, World!', 'bot1');

        expect(mockMattermostInstance.sendMessageToChannel).toHaveBeenCalledWith(
          'channel123',
          'Hello, World!',
          'bot1'
        );
        expect(result).toBe('post_123');
      });

      it('should handle sendMessage without senderName', async () => {
        mockMattermostInstance.sendMessageToChannel.mockResolvedValue('post_456');

        const result = await provider.sendMessage('channel456', 'Test message');

        expect(mockMattermostInstance.sendMessageToChannel).toHaveBeenCalledWith(
          'channel456',
          'Test message',
          undefined
        );
        expect(result).toBe('post_456');
      });
    });

    describe('getMessages', () => {
      it('should delegate to MattermostService.getMessagesFromChannel', async () => {
        const mockMessages = [
          { id: '1', text: 'msg1', channelId: 'channel123' },
          { id: '2', text: 'msg2', channelId: 'channel123' },
        ];
        mockMattermostInstance.getMessagesFromChannel.mockResolvedValue(mockMessages);

        const result = await provider.getMessages('channel123', 10);

        expect(mockMattermostInstance.getMessagesFromChannel).toHaveBeenCalledWith(
          'channel123',
          10
        );
        expect(result).toEqual(mockMessages);
      });

      it('should handle getMessages with default limit', async () => {
        mockMattermostInstance.getMessagesFromChannel.mockResolvedValue([]);

        const result = await provider.getMessages('channel789');

        expect(mockMattermostInstance.getMessagesFromChannel).toHaveBeenCalledWith(
          'channel789',
          undefined
        );
        expect(result).toEqual([]);
      });
    });

    describe('sendMessageToChannel', () => {
      it('should delegate to MattermostService.sendMessageToChannel', async () => {
        mockMattermostInstance.sendMessageToChannel.mockResolvedValue('post_789');

        const result = await provider.sendMessageToChannel('channel321', 'Agent message', 'agent1');

        expect(mockMattermostInstance.sendMessageToChannel).toHaveBeenCalledWith(
          'channel321',
          'Agent message',
          'agent1',
          undefined
        );
        expect(result).toBe('post_789');
      });

      it('should handle sendMessageToChannel without agent name', async () => {
        mockMattermostInstance.sendMessageToChannel.mockResolvedValue('post_abc');

        const result = await provider.sendMessageToChannel('channel999', 'No agent');

        expect(mockMattermostInstance.sendMessageToChannel).toHaveBeenCalledWith(
          'channel999',
          'No agent',
          undefined,
          undefined
        );
        expect(result).toBe('post_abc');
      });
    });

    describe('getClientId', () => {
      it('should delegate to MattermostService.getClientId', () => {
        mockMattermostInstance.getClientId.mockReturnValue('mattermost_bot_123');

        const result = provider.getClientId();

        expect(mockMattermostInstance.getClientId).toHaveBeenCalled();
        expect(result).toBe('mattermost_bot_123');
      });

      it('should return client ID for default bot', () => {
        mockMattermostInstance.getClientId.mockReturnValue('mattermost-bot');

        const result = provider.getClientId();

        expect(result).toBe('mattermost-bot');
      });
    });

    describe('getForumOwner', () => {
      it('should delegate to MattermostService.getChannelOwnerId', async () => {
        mockMattermostInstance.getChannelOwnerId.mockResolvedValue('user_owner_123');

        const result = await provider.getForumOwner('channel555');

        expect(mockMattermostInstance.getChannelOwnerId).toHaveBeenCalledWith('channel555');
        expect(result).toBe('user_owner_123');
      });

      it('should return empty string when owner not found', async () => {
        mockMattermostInstance.getChannelOwnerId.mockResolvedValue('');

        const result = await provider.getForumOwner('channel666');

        expect(mockMattermostInstance.getChannelOwnerId).toHaveBeenCalledWith('channel666');
        expect(result).toBe('');
      });

      it('should handle errors gracefully', async () => {
        mockMattermostInstance.getChannelOwnerId.mockRejectedValue(new Error('Channel not found'));

        await expect(provider.getForumOwner('nonexistent')).rejects.toThrow('Channel not found');
      });
    });

    describe('reload', () => {
      it('should reload configuration and add new bots', async () => {
        const mockFileContent = JSON.stringify({
          mattermost: {
            instances: [
              {
                name: 'bot1',
                serverUrl: 'https://mattermost.example.com',
                token: 'token123',
                channel: 'general',
              },
            ],
          },
        });
        (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);
        mockMattermostInstance.getBotNames.mockReturnValue([]);
        mockMattermostInstance.initialize.mockResolvedValue(undefined);

        const result = await provider.reload();

        expect(result.added).toBe(1);
        expect(fs.promises.readFile).toHaveBeenCalled();
      });

      it('should not add existing bots', async () => {
        const mockFileContent = JSON.stringify({
          mattermost: {
            instances: [{ name: 'bot1', serverUrl: 'https://mm.example.com', token: 'token1' }],
          },
        });
        (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);
        mockMattermostInstance.getBotNames.mockReturnValue(['bot1']);

        const result = await provider.reload();

        expect(result.added).toBe(0);
      });

      it('should handle missing config file', async () => {
        (fs.promises.readFile as jest.Mock).mockRejectedValue(
          new Error('ENOENT: no such file or directory')
        );

        const result = await provider.reload();

        expect(result.added).toBe(0);
      });

      it('should handle invalid JSON in config file', async () => {
        (fs.promises.readFile as jest.Mock).mockResolvedValue('invalid json');

        const result = await provider.reload();

        expect(result.added).toBe(0);
      });

      it('should generate bot name when name is missing', async () => {
        const mockFileContent = JSON.stringify({
          mattermost: {
            instances: [{ serverUrl: 'https://mm.example.com', token: 'token2' }],
          },
        });
        (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);
        mockMattermostInstance.getBotNames.mockReturnValue([]);
        mockMattermostInstance.initialize.mockResolvedValue(undefined);

        const result = await provider.reload();

        expect(result.added).toBe(1);
      });
    });
  });
});
