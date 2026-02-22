import MattermostClient from '@src/integrations/mattermost/mattermostClient';
import { MattermostService } from '@hivemind/adapter-mattermost';

jest.mock('@hivemind/adapter-mattermost');
jest.mock('@src/config/BotConfigurationManager');

describe('MattermostService', () => {
  let service: MattermostService;
  let mockClient: jest.Mocked<MattermostClient>;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      postMessage: jest.fn().mockResolvedValue({ id: 'post123' }),
      getChannelPosts: jest.fn().mockResolvedValue([]),
      getUser: jest.fn().mockResolvedValue({ id: 'user123', username: 'testuser' }),
      isConnected: jest.fn().mockReturnValue(true),
      disconnect: jest.fn(),
    } as any;

    const { default: MockClient } = require('@src/integrations/mattermost/mattermostClient');
    MockClient.mockImplementation(() => mockClient);

    const { default: BotConfigurationManager } = require('@src/config/BotConfigurationManager');
    BotConfigurationManager.getInstance.mockReturnValue({
      getAllBots: () => [
        {
          name: 'test-bot',
          messageProvider: 'mattermost',
          mattermost: {
            serverUrl: 'https://mattermost.example.com',
            token: 'test-token',
            channel: 'general',
          },
        },
      ],
    });

    service = MattermostService.getInstance();
  });

  afterEach(() => {
    (MattermostService as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('should initialize successfully', async () => {
    await service.initialize();

    expect(mockClient.connect).toHaveBeenCalled();
  });

  it('handles messaging and connection operations', async () => {
    // Test sending message to channel
    let result = await service.sendMessageToChannel('general', 'Hello world');
    expect(mockClient.postMessage).toHaveBeenCalledWith({
      channel: 'general',
      text: 'Hello world',
    });
    expect(result).toBe('post123');

    // Reset mocks and test fetching messages
    jest.clearAllMocks();
    const mockPosts = [
      {
        id: 'post1',
        message: 'Test message',
        channel_id: 'channel123',
        user_id: 'user123',
        create_at: Date.now(),
        update_at: 0,
        edit_at: 0,
        delete_at: 0,
        is_pinned: false,
        type: '',
        props: {},
        hashtags: '',
        pending_post_id: '',
        reply_count: 0,
        metadata: {},
      },
    ];
    mockClient.getChannelPosts.mockResolvedValue(mockPosts);
    mockClient.getUser.mockResolvedValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    });
    const messages = await service.fetchMessages('channel123', 10);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Test message');
    expect(messages[0].platform).toBe('mattermost');

    // Reset mocks and test connection errors
    jest.clearAllMocks();
    mockClient.connect.mockRejectedValue(new Error('Connection failed'));
    await expect(service.initialize()).rejects.toThrow('Connection failed');

    // Reset mocks and test sending public announcements
    jest.clearAllMocks();
    mockClient.connect.mockResolvedValue(undefined);
    await service.initialize(); // Re-initialize
    await service.sendPublicAnnouncement('general', 'Important announcement');
    expect(mockClient.postMessage).toHaveBeenCalledWith({
      channel: 'general',
      text: 'Important announcement',
    });
  });

  it('handles service configuration and management', async () => {
    // Test returning client ID
    let clientId = service.getClientId();
    expect(clientId).toBe('test-bot');

    // Test returning default channel
    const channel = service.getDefaultChannel();
    expect(channel).toBe('general');

    // Test channel prioritization support
    expect(service.supportsChannelPrioritization).toBe(true);

    // Test channel scoring
    const score = service.scoreChannel('general');
    expect(typeof score).toBe('number');

    // Test getting bot names
    const names = service.getBotNames();
    expect(names).toContain('test-bot');

    // Test getting bot config
    const config = service.getBotConfig('test-bot');
    expect(config.name).toBe('test-bot');

    // Test graceful shutdown
    await service.shutdown();
    expect((MattermostService as any).instance).toBeUndefined();
  });
});
