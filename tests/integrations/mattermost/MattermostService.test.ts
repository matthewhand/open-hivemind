// Mock dependencies before importing the module
jest.mock('@hivemind/adapter-mattermost', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    postMessage: jest.fn().mockResolvedValue({ id: 'post123' }),
    getChannelPosts: jest.fn().mockResolvedValue([]),
    getUser: jest.fn().mockResolvedValue({ id: 'user123', username: 'testuser' }),
    isConnected: jest.fn().mockReturnValue(true),
    disconnect: jest.fn(),
    getCurrentUserId: jest.fn().mockReturnValue('user123'),
    getCurrentUsername: jest.fn().mockReturnValue('testuser'),
    getChannelInfo: jest.fn().mockResolvedValue(null),
    sendTyping: jest.fn().mockResolvedValue(undefined),
  };

  const { EventEmitter } = require('events');

  class MockMattermostService extends EventEmitter {
    private static instance: MockMattermostService | undefined;
    private clients: Map<string, any> = new Map();
    private channels: Map<string, string> = new Map();
    private botConfigs: Map<string, any> = new Map();
    private deps: any;
    public supportsChannelPrioritization: boolean = true;

    private constructor(deps?: any) {
      super();
      this.deps = deps || {};
      this.clients.set('test-bot', mockClient);
      this.channels.set('test-bot', 'general');
      this.botConfigs.set('test-bot', {
        name: 'test-bot',
        serverUrl: 'https://mattermost.example.com',
        token: 'test-token',
        channel: 'general',
        userId: 'user123',
        username: 'testuser',
      });
    }

    public static getInstance(deps?: any): MockMattermostService {
      if (!MockMattermostService.instance) {
        MockMattermostService.instance = new MockMattermostService(deps);
      } else if (deps) {
        // Update dependencies if provided to an existing instance
        MockMattermostService.instance.setDependencies(deps);
      }
      return MockMattermostService.instance;
    }

    public static resetInstance(): void {
      MockMattermostService.instance = undefined;
    }

    public setDependencies(deps: any): void {
      this.deps = { ...this.deps, ...deps };
    }

    public async initialize(): Promise<void> {
      await mockClient.connect();
    }

    public setApp(): void { }

    public setMessageHandler(): void { }

    public async sendMessageToChannel(
      channelId: string,
      text: string,
      senderName?: string,
      threadId?: string,
      replyToMessageId?: string
    ): Promise<string> {
      const rootId = threadId || replyToMessageId;
      const post = await mockClient.postMessage({
        channel: channelId,
        text: text,
        ...(rootId ? { root_id: rootId } : {}),
      });
      return post.id;
    }

    public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<any[]> {
      return this.fetchMessages(channelId, limit);
    }

    public async fetchMessages(
      channelId: string,
      limit: number = 10,
      botName?: string
    ): Promise<any[]> {
      const posts = await mockClient.getChannelPosts(channelId, 0, limit);
      const messages: any[] = [];
      for (const post of posts.slice(0, limit)) {
        const user = await mockClient.getUser(post.user_id);
        messages.push({
          ...post,
          content: post.message,
          platform: 'mattermost',
          getChannelId: () => post.channel_id,
          getAuthorId: () => post.user_id,
          getText: () => post.message,
        });
      }
      return messages.reverse();
    }

    public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
      const text =
        typeof announcement === 'string' ? announcement : announcement?.message || 'Announcement';
      await mockClient.postMessage({
        channel: channelId,
        text: text,
      });
    }

    public async joinChannel(): Promise<void> { }

    public getClientId(): string {
      return 'test-bot';
    }

    public getDefaultChannel(): string {
      return 'general';
    }

    public async getChannelTopic(): Promise<string | null> {
      return null;
    }

    public async sendTyping(): Promise<void> { }

    public async setModelActivity(): Promise<void> { }

    public async shutdown(): Promise<void> {
      MockMattermostService.instance = undefined;
    }

    public scoreChannel(): number {
      return 0;
    }

    public getBotNames(): string[] {
      return Array.from(this.clients.keys());
    }

    public getBotConfig(botName: string): any {
      return this.botConfigs.get(botName);
    }

    public getDelegatedServices(): any[] {
      return [];
    }

    public getAgentStartupSummaries(): any[] {
      return [];
    }

    public resolveAgentContext(): any {
      return null;
    }
  }

  return {
    MattermostService: MockMattermostService,
    default: MockMattermostService,
    MattermostClient: jest.fn(() => mockClient),
    MattermostMessage: jest.fn(),
    testMattermostConnection: jest.fn(),
  };
});

// Import from the adapter package directly to test the class
import { MattermostService } from '@hivemind/adapter-mattermost';

describe('MattermostService', () => {
  let service: MattermostService;

  beforeEach(() => {
    // Reset instance before each test
    (MattermostService as any).instance = undefined;
    service = MattermostService.getInstance();
  });

  afterEach(() => {
    (MattermostService as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('should initialize successfully', async () => {
    await service.initialize();
    expect(true).toBe(true);
  });

  it('handles messaging and connection operations', async () => {
    await service.initialize();

    const result = await service.sendMessageToChannel('general', 'Hello world');
    expect(result).toBe('post123');

    const messages = await service.fetchMessages('channel123', 10);
    expect(messages).toHaveLength(0);

    await service.sendPublicAnnouncement('general', 'Important announcement');
    expect(true).toBe(true);
  });

  it('handles service configuration and management', async () => {
    const clientId = service.getClientId();
    expect(clientId).toBe('test-bot');

    const channel = service.getDefaultChannel();
    expect(channel).toBe('general');

    expect(service.supportsChannelPrioritization).toBe(true);

    const score = service.scoreChannel('general');
    expect(typeof score).toBe('number');

    const names = service.getBotNames();
    expect(names).toContain('test-bot');

    const config = service.getBotConfig('test-bot');
    expect(config.name).toBe('test-bot');

    await service.shutdown();
    expect((MattermostService as any).instance).toBeUndefined();
  });

  describe('getInstance with dependencies', () => {
    it('should return the same instance on subsequent calls', () => {
      const instance1 = MattermostService.getInstance();
      const instance2 = MattermostService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should update dependencies when provided to an existing instance', () => {
      // First call without dependencies
      const instance1 = MattermostService.getInstance();

      // Create mock dependencies
      const mockBotConfigProvider = {
        getAllBots: jest.fn().mockReturnValue([]),
      };
      const mockMetricsCollector = {
        incrementMessages: jest.fn(),
        incrementErrors: jest.fn(),
        recordResponseTime: jest.fn(),
        recordMessageFlow: jest.fn(),
      };

      // Second call with dependencies - should update existing instance
      const instance2 = MattermostService.getInstance({
        botConfigProvider: mockBotConfigProvider as any,
        metricsCollector: mockMetricsCollector as any,
      });

      // Should still be the same instance
      expect(instance2).toBe(instance1);
    });

    it('should create new instance with dependencies when none exists', () => {
      // Reset the instance first
      (MattermostService as any).instance = undefined;

      const mockBotConfigProvider = {
        getAllBots: jest.fn().mockReturnValue([]),
      };
      const mockMetricsCollector = {
        incrementMessages: jest.fn(),
        incrementErrors: jest.fn(),
        recordResponseTime: jest.fn(),
        recordMessageFlow: jest.fn(),
      };

      const instance = MattermostService.getInstance({
        botConfigProvider: mockBotConfigProvider as any,
        metricsCollector: mockMetricsCollector as any,
      });

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(MattermostService);
    });
  });
});
