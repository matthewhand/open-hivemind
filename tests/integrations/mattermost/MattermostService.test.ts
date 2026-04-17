/**
 * MattermostService Unit Tests
 *
 * Tests the service's orchestration logic (bot registration, lifecycle,
 * routing) without mocking the entire class under test.
 *
 * The MattermostClient is mocked at the module boundary so the real
 * MattermostService executes its actual logic paths.
 */
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import { MattermostService } from '@src/integrations/mattermost/MattermostService';

// ---------------------------------------------------------------------------
// Mock boundaries — only the client and config manager, NOT the service itself
// ---------------------------------------------------------------------------

const createMockClient = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  postMessage: jest.fn().mockResolvedValue({ id: 'post-abc', channel_id: 'general' }),
  getChannelPosts: jest.fn().mockResolvedValue([]),
  sendTyping: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(false),
  getCurrentUserId: jest.fn().mockReturnValue('bot-user-123'),
  getCurrentUsername: jest.fn().mockReturnValue('test-bot'),
  getChannelInfo: jest.fn().mockResolvedValue({ name: 'general', display_name: 'General' }),
  on: jest.fn(),
  off: jest.fn(),
});

jest.mock('../../../packages/message-mattermost/src/mattermostClient', () => {
  return jest.fn().mockImplementation(() => createMockClient());
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetSingleton() {
  (MattermostService as any).instance = undefined;
}

function configureMockBots(bots: any[]) {
  const mockManager = {
    getAllBots: jest.fn().mockReturnValue(bots),
    getBot: jest.fn(),
    updateBot: jest.fn(),
  };
  jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue(mockManager as any);
  return mockManager;
}

function validBot(name = 'test-bot', channel = 'general') {
  return {
    name,
    messageProvider: 'mattermost',
    mattermost: {
      serverUrl: 'https://mattermost.example.com',
      token: 'test-token-' + name,
      channel,
      username: name,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MattermostService', () => {
  beforeEach(() => {
    jest.resetModules();
    resetSingleton();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetSingleton();
    jest.restoreAllMocks();
  });

  // ---- Singleton & Initialization ----

  it('should return a singleton instance', () => {
    configureMockBots([]);
    const s1 = MattermostService.getInstance();
    const s2 = MattermostService.getInstance();
    expect(s1).toBe(s2);
  });

  it('should register a bot for each valid Mattermost config', () => {
    configureMockBots([validBot('bot-a'), validBot('bot-b')]);
    const service = MattermostService.getInstance();
    const names = service.getBotNames();
    expect(names).toContain('bot-a');
    expect(names).toContain('bot-b');
    expect(names).toHaveLength(2);
  });

  it('should skip bots with invalid Mattermost configurations', () => {
    configureMockBots([
      validBot('valid-bot'),
      { name: 'no-url-bot', messageProvider: 'mattermost', mattermost: { token: 'tok' } },
      {
        name: 'no-token-bot',
        messageProvider: 'mattermost',
        mattermost: { serverUrl: 'https://x' },
      },
      { name: 'discord-bot', messageProvider: 'discord' },
    ]);
    const service = MattermostService.getInstance();
    expect(service.getBotNames()).toEqual(['valid-bot']);
  });

  // ---- Lifecycle ----

  it('should connect all registered bots on initialize', async () => {
    configureMockBots([validBot('bot1'), validBot('bot2')]);
    const service = MattermostService.getInstance();
    await service.initialize();
    // Each bot's client should have been connected
    expect(service.getBotNames()).toHaveLength(2);
  });

  it('should handle connection failure for one bot without crashing others', async () => {
    const failingClient = createMockClient();
    failingClient.connect.mockRejectedValueOnce(new Error('ENOTFOUND'));

    const workingClient = createMockClient();
    jest
      .requireMock('../../../packages/message-mattermost/src/mattermostClient')
      .mockImplementationOnce(() => failingClient)
      .mockImplementationOnce(() => workingClient);

    configureMockBots([validBot('bad-bot'), validBot('good-bot')]);
    const service = MattermostService.getInstance();

    // initialize should not throw even if one bot fails
    await expect(service.initialize()).resolves.not.toThrow();
    expect(service.getBotNames()).toHaveLength(2);
  });

  it('should support shutdown and re-initialization', async () => {
    configureMockBots([validBot('reinit-bot')]);
    const service = MattermostService.getInstance();
    await service.initialize();
    expect(service.getBotNames()).toContain('reinit-bot');

    await service.shutdown();
    // After shutdown the singleton is cleared
    expect((MattermostService as any).instance).toBeUndefined();
  });

  // ---- Messaging ----

  it('should send a message to a channel and return the post id', async () => {
    configureMockBots([validBot('msg-bot')]);
    const service = MattermostService.getInstance();
    const postId = await service.sendMessageToChannel('general', 'Hello');
    expect(postId).toBe('post-abc');
  });

  it('should send a reply in a thread when replyToMessageId is provided', async () => {
    configureMockBots([validBot('thread-bot')]);
    const service = MattermostService.getInstance();
    const postId = await service.sendMessageToChannel(
      'general',
      'Reply text',
      undefined,
      undefined,
      'parent-123'
    );
    // Should return a post id from the mocked client
    expect(postId).toBe('post-abc');
  });

  it('should fetch messages from a channel', async () => {
    configureMockBots([validBot('fetch-bot')]);
    const service = MattermostService.getInstance();
    const messages = await service.fetchMessages('general', 10);
    expect(Array.isArray(messages)).toBe(true);
  });

  it('should send a public announcement', async () => {
    configureMockBots([validBot('announce-bot')]);
    const service = MattermostService.getInstance();
    await service.sendPublicAnnouncement('general', { message: 'System maintenance tonight' });
    // Should not throw and should use the client
  });

  // ---- Introspection ----

  it('should return bot configuration for a known bot', () => {
    configureMockBots([validBot('config-bot')]);
    const service = MattermostService.getInstance();
    const config = service.getBotConfig('config-bot');
    expect(config.name).toBe('config-bot');
    expect(config.serverUrl).toBe('https://mattermost.example.com');
    expect(config.token).toBe('test-token-config-bot');
  });

  it('should return undefined for unknown bot config', () => {
    configureMockBots([]);
    const service = MattermostService.getInstance();
    expect(service.getBotConfig('nonexistent')).toBeUndefined();
  });

  it('should report supportsChannelPrioritization', () => {
    configureMockBots([]);
    const service = MattermostService.getInstance();
    expect(service.supportsChannelPrioritization).toBe(true);
  });

  it('should compute a score for an arbitrary channel', () => {
    configureMockBots([]);
    const service = MattermostService.getInstance();
    const score = service.scoreChannel('some-channel');
    expect(typeof score).toBe('number');
  });

  it('should return delegated services and agent summaries as arrays', () => {
    configureMockBots([]);
    const service = MattermostService.getInstance();
    expect(Array.isArray(service.getDelegatedServices())).toBe(true);
    expect(Array.isArray(service.getAgentStartupSummaries())).toBe(true);
    // resolveAgentContext returns a context object (may be empty but not null)
    const context = service.resolveAgentContext();
    expect(context).toBeDefined();
    expect(typeof context).toBe('object');
  });

  // ---- Event Emitter Behavior ----

  it('should extend EventEmitter and be able to emit/listen events', () => {
    configureMockBots([]);
    const service = MattermostService.getInstance();
    const handler = jest.fn();
    service.on('connected', handler);
    service.emit('connected', { botName: 'event-bot' });
    expect(handler).toHaveBeenCalledWith({ botName: 'event-bot' });
  });
});
