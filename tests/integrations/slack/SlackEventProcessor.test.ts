import { SlackEventProcessor } from '@integrations/slack/SlackEventProcessor';
import { SlackService } from '@integrations/slack/SlackService';
import { SlackBotManager } from '@integrations/slack/SlackBotManager';
import SlackMessage from '@integrations/slack/SlackMessage';
import slackConfig from '@src/config/slackConfig';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import { WebClient } from '@slack/web-api';

jest.mock('@integrations/slack/SlackBotManager');
jest.mock('@integrations/slack/SlackMessage');
jest.mock('@src/config/slackConfig');
jest.mock('@src/config/BotConfigurationManager');
jest.mock('@slack/web-api');

const MockSlackBotManager = SlackBotManager as jest.MockedClass<typeof SlackBotManager>;
const MockSlackMessage = SlackMessage as jest.MockedClass<typeof SlackMessage>;
const MockSlackConfig = slackConfig as jest.Mocked<typeof slackConfig>;
const MockBotConfigurationManager = BotConfigurationManager as jest.MockedClass<typeof BotConfigurationManager>;

describe('SlackEventProcessor', () => {
  let slackServiceInstance: SlackService;
  let eventProcessor: SlackEventProcessor;
  let mockBotManagerInstance: jest.Mocked<SlackBotManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create properly mocked webClient methods
    const mockPostMessage = jest.fn().mockResolvedValue({ ts: 'mockTs' });
    const mockAuthTest = jest.fn().mockResolvedValue({ user_id: 'U123', user: 'testuser' });
    const mockConversationsList = jest.fn().mockResolvedValue({ ok: true, channels: [{ id: 'C1', name: 'general' }] });

    // Create a mock webClient with properly structured methods
    const mockWebClient = {
      chat: {
        postMessage: mockPostMessage,
      },
      auth: {
        test: mockAuthTest,
      },
      conversations: {
        list: mockConversationsList,
      },
    };

    // Create a mock bot object that will be reused
    const mockBot = {
      webClient: mockWebClient,
      botUserId: 'U123',
      botToken: 'token1',
      signingSecret: 'test-secret',
      config: {},
    };

    // Mock the SlackBotManager constructor
    mockBotManagerInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      setMessageHandler: jest.fn(),
      getAllBots: jest.fn().mockReturnValue([mockBot]),
      getBotByName: jest.fn(),
      handleMessage: jest.fn().mockResolvedValue('LLM Response'),
    } as unknown as jest.Mocked<SlackBotManager>;

    MockSlackBotManager.mockImplementation(() => mockBotManagerInstance);

    // Mock BotConfigurationManager to return our test configuration
    const mockGetAllBots = jest.fn().mockReturnValue([
      {
        name: 'test-bot',
        messageProvider: 'slack',
        slack: {
          botToken: 'xoxb-test-token',
          signingSecret: 'test-secret',
          appToken: 'xapp-test-token',
          defaultChannelId: 'C123',
          joinChannels: '#general',
          mode: 'socket'
        }
      }
    ]);
    
    // Mock the static getInstance method
    MockBotConfigurationManager.getInstance = jest.fn().mockReturnValue({
      getAllBots: mockGetAllBots
    } as any);

    // Mock slackConfig.get
    MockSlackConfig.get.mockImplementation((key: any): any => {
      switch (key) {
        case 'SLACK_HELP_COMMAND_TOKEN': return 'valid_token';
        case 'SLACK_JOIN_CHANNELS': return '#general';
        case 'SLACK_DEFAULT_CHANNEL_ID': return 'C123';
        case 'SLACK_MODE': return 'socket';
        default: return undefined;
      }
    });

    // Reset the singleton to force re-initialization with our mocks
    (SlackService as any).instance = undefined;
    
    // Get the singleton instance of SlackService
    slackServiceInstance = SlackService.getInstance();

    eventProcessor = new SlackEventProcessor(slackServiceInstance);
  });

  it('should be defined', () => {
    expect(eventProcessor).toBeDefined();
  });

  it('should throw an error if slackService is not provided to constructor', () => {
    expect(() => new SlackEventProcessor(undefined as any)).toThrow('SlackService instance required');
  });

  describe('handleActionRequest', () => {
    it('should handle url_verification requests', async () => {
      const mockReq = { body: { type: 'url_verification', challenge: 'test_challenge' } } as any;
      const mockRes = { set: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('test_challenge');
    });

    it('should handle payload requests', async () => {
      const mockPayload = {
        text: 'payload message',
        channel: { id: 'channel123' },
        actions: [{ action_id: 'test_action' }],
      };
      const mockReq = { body: { payload: JSON.stringify(mockPayload) } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(MockSlackMessage).toHaveBeenCalledWith(mockPayload.text, mockPayload.channel.id, mockPayload);
      const botManager = slackServiceInstance.getBotManager();
      expect(botManager).toBeDefined();
      expect(botManager?.handleMessage).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid payload', async () => {
      const mockReq = { body: { payload: '{}' } } as any; // Invalid payload
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Bad Request');
    });

    it('should handle event_callback of type message and no subtype', async () => {
      const mockEvent = { type: 'message', event_ts: '123.456', text: 'user message', channel: 'channel123' };
      const mockReq = { body: { type: 'event_callback', event: mockEvent } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      const botManager = slackServiceInstance.getBotManager();
      expect(botManager).toBeDefined();
      expect(botManager?.handleMessage).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle event_callback of type message and no subtype', async () => {
      const mockEvent = { type: 'message', event_ts: '123.456', text: 'user message', channel: 'channel123' };
      const mockReq = { body: { type: 'event_callback', event: mockEvent } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(MockSlackMessage).toHaveBeenCalledWith(mockEvent.text, mockEvent.channel, mockEvent);
      const botManager = slackServiceInstance.getBotManager();
      expect(botManager).toBeDefined();
      expect(botManager?.handleMessage).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for unhandled request type', async () => {
      const mockReq = { body: { type: 'unhandled_type' } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Bad Request');
    });

    it('should handle errors during request processing', async () => {
      const mockReq = { body: 'invalid json' } as any; // This will cause JSON.parse to throw
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Bad Request');
    });
  });

  describe('handleHelpRequest', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = { body: { token: 'valid_token', user_id: 'U123' } } as any;
      mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;
      
      // Mock slackConfig.get for handleHelpRequest
      MockSlackConfig.get.mockImplementation((key: any): any => {
        if (key === 'SLACK_HELP_COMMAND_TOKEN') return 'valid_token';
        return undefined;
      });
    });

    it('should send a help DM if token is valid', async () => {
      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = ((callback: any) => {
        callback();
        return 1 as any;
      }) as any;

      try {
        await eventProcessor.handleHelpRequest(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledTimes(1);
        
        const bots = mockBotManagerInstance.getAllBots();
        expect(bots[0].webClient.chat.postMessage).toHaveBeenCalled();
        expect(bots[0].webClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
          channel: 'U123',
          text: expect.stringContaining('Hi <@U123>, here’s my configuration:'),
        }));
      } finally {
        global.setImmediate = originalSetImmediate;
      }
    });

    it('should return 401 if token is invalid', async () => {
      mockReq.body.token = 'invalid_token';
      await eventProcessor.handleHelpRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith('Unauthorized');
    });

    it('should return 400 if user_id is missing', async () => {
      delete mockReq.body.user_id;
      await eventProcessor.handleHelpRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Missing user ID');
    });

    it('should handle error during DM sending', async () => {
      // Configure mock to reject
      const bots = mockBotManagerInstance.getAllBots();
      (bots[0].webClient.chat.postMessage as jest.Mock).mockRejectedValue(new Error('DM failed'));

      // Mock setImmediate to execute immediately
      const originalSetImmediate = global.setImmediate;
      global.setImmediate = ((callback: any) => {
        callback();
        return 1 as any;
      }) as any;

      try {
        await eventProcessor.handleHelpRequest(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200); // Acknowledges command first
        expect(bots[0].webClient.chat.postMessage).toHaveBeenCalled();
      } finally {
        global.setImmediate = originalSetImmediate;
      }
    });
  });

  describe('debugEventPermissions', () => {
    it('should log bot permissions', async () => {
      const bots = mockBotManagerInstance.getAllBots();
      
      await eventProcessor.debugEventPermissions();

      expect(bots[0].webClient.auth.test).toHaveBeenCalled();
      expect(bots[0].webClient.conversations.list).toHaveBeenCalledWith({ types: 'public_channel,private_channel' });
    });

    it('should handle errors during auth test', async () => {
      const bots = mockBotManagerInstance.getAllBots();
      (bots[0].webClient.auth.test as jest.Mock).mockRejectedValue(new Error('Auth error'));

      await eventProcessor.debugEventPermissions();

      expect(bots[0].webClient.auth.test).toHaveBeenCalled();
      expect(bots[0].webClient.conversations.list).toHaveBeenCalled();
    });

    it('should handle errors during conversations list', async () => {
      const bots = mockBotManagerInstance.getAllBots();
      (bots[0].webClient.conversations.list as jest.Mock).mockRejectedValue(new Error('Conversations error'));

      await eventProcessor.debugEventPermissions();

      expect(bots[0].webClient.auth.test).toHaveBeenCalled();
      expect(bots[0].webClient.conversations.list).toHaveBeenCalled();
    });
  });

  describe('hasDeletedMessage', () => {
    it('should return true if message is deleted', () => {
      // Simulate a message_deleted event first to populate deletedMessages Set
      const mockEvent = { type: 'message', subtype: 'message_deleted', previous_message: { ts: '123.456' } };
      const mockReq = { body: { type: 'event_callback', event: mockEvent } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      eventProcessor.handleActionRequest(mockReq, mockRes); // This will add '123.456' to deletedMessages

      expect(eventProcessor.hasDeletedMessage('123.456')).toBe(true);
    });

    it('should return false if message is not deleted', () => {
      expect(eventProcessor.hasDeletedMessage('nonexistent_ts')).toBe(false);
    });
  });
});
