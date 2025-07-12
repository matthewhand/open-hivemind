import { SlackEventProcessor } from '@integrations/slack/SlackEventProcessor';
import { SlackService } from '@integrations/slack/SlackService';
import { SlackBotManager } from '@integrations/slack/SlackBotManager';
import SlackMessage from '@integrations/slack/SlackMessage';
import slackConfig from '@src/config/slackConfig';
import { WebClient } from '@slack/web-api';

jest.mock('@integrations/slack/SlackBotManager');
jest.mock('@integrations/slack/SlackMessage');
jest.mock('@src/config/slackConfig');
jest.mock('@slack/web-api');

const MockSlackBotManager = SlackBotManager as jest.MockedClass<typeof SlackBotManager>;
const MockSlackMessage = SlackMessage as jest.MockedClass<typeof SlackMessage>;
const MockSlackConfig = slackConfig as jest.Mocked<typeof slackConfig>;

describe('SlackEventProcessor', () => {
  let slackServiceInstance: SlackService;
  let eventProcessor: SlackEventProcessor;
  let mockBotManagerInstance: jest.Mocked<SlackBotManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the SlackBotManager constructor
    mockBotManagerInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      setMessageHandler: jest.fn(),
      getAllBots: jest.fn(),
      getBotByName: jest.fn(),
      handleMessage: jest.fn().mockResolvedValue('LLM Response'),
    } as unknown as jest.Mocked<SlackBotManager>;

    // Create a mock webClient that can be configured per test
    const mockWebClient: WebClient = {
      chat: {
        postMessage: jest.fn(),
      } as any,
      auth: {
        test: jest.fn(),
      } as any,
      conversations: {
        list: jest.fn(),
      } as any,
    } as any;

    // Default mock for getAllBots to return a bot with the mockWebClient
    mockBotManagerInstance.getAllBots.mockReturnValue([
      {
        webClient: mockWebClient,
        botUserId: 'U123',
        botToken: 'token1',
        signingSecret: 'test-secret'
      },
    ]);

    MockSlackBotManager.mockImplementation(() => mockBotManagerInstance);

    // Mock slackConfig.get
    MockSlackConfig.get.mockImplementation((key: any): any => {
      if (key === undefined) {
        // Return a mock configuration object when .get() is called without arguments
        return {
          SLACK_BOT_TOKEN: 'xoxb-mock-token',
          SLACK_APP_TOKEN: 'xapp-mock-token',
          SLACK_SIGNING_SECRET: 'mock-signing-secret',
          SLACK_MODE: 'socket',
          SLACK_HELP_COMMAND_TOKEN: 'valid_token',
          SLACK_JOIN_CHANNELS: '#general',
          SLACK_DEFAULT_CHANNEL_ID: 'C123',
          SLACK_BOT_JOIN_CHANNEL_MESSAGE: '# Bot joined the {channel} channel!',
          SLACK_USER_JOIN_CHANNEL_MESSAGE: '# Welcome, {user}, to the {channel} channel!',
          SLACK_BOT_LEARN_MORE_MESSAGE: 'Here’s more info about channel {channel}!',
          SLACK_BUTTON_MAPPINGS: '{}',
          WELCOME_RESOURCE_URL: 'https://example.com',
          REPORT_ISSUE_URL: 'https://example.com',
        };
      }
      switch (key) {
        case 'SLACK_BOT_TOKEN': return 'xoxb-mock-token';
        case 'SLACK_APP_TOKEN': return 'xapp-mock-token';
        case 'SLACK_SIGNING_SECRET': return 'mock-signing-secret';
        case 'SLACK_MODE': return 'socket';
        case 'SLACK_HELP_COMMAND_TOKEN': return 'valid_token';
        case 'SLACK_JOIN_CHANNELS': return '#general';
        case 'SLACK_DEFAULT_CHANNEL_ID': return 'C123';
        default: return undefined;
      }
    });

    // Get the singleton instance of SlackService
    slackServiceInstance = SlackService.getInstance();

    // Manually set the mocked botManager on the service instance
    // This is a bit of a hack due to the private constructor and singleton pattern
    // In a real scenario, you might consider dependency injection for better testability
    (slackServiceInstance as any).botManager = mockBotManagerInstance;

    // Mock necessary methods on slackServiceInstance
    slackServiceInstance.fetchMessages = jest.fn().mockResolvedValue([]);

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
      expect(slackServiceInstance.getBotManager().handleMessage).toHaveBeenCalledTimes(1);
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

      expect(MockSlackMessage).toHaveBeenCalledWith(mockEvent.text, mockEvent.channel, mockEvent);
      expect(slackServiceInstance.getBotManager().handleMessage).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should ignore bot_message event_callback', async () => {
      const mockEvent = { type: 'message', subtype: 'bot_message', event_ts: '123.456' };
      const mockReq = { body: { type: 'event_callback', event: mockEvent } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(slackServiceInstance.getBotManager().handleMessage).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle message_deleted event_callback', async () => {
      const mockEvent = { type: 'message', subtype: 'message_deleted', previous_message: { ts: '123.456' } };
      const mockReq = { body: { type: 'event_callback', event: mockEvent } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      await eventProcessor.handleActionRequest(mockReq, mockRes);

      expect(eventProcessor.hasDeletedMessage('123.456')).toBe(true);
      expect(slackServiceInstance.getBotManager().handleMessage).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should ignore duplicate event_callback', async () => {
      const mockEvent = { type: 'message', event_ts: '123.456', text: 'user message', channel: 'channel123' };
      const mockReq = { body: { type: 'event_callback', event: mockEvent } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;

      // First call
      await eventProcessor.handleActionRequest(mockReq, mockRes);
      expect(slackServiceInstance.getBotManager().handleMessage).toHaveBeenCalledTimes(1);

      // Second call with same event_ts
      await eventProcessor.handleActionRequest(mockReq, mockRes);
      expect(slackServiceInstance.getBotManager().handleMessage).toHaveBeenCalledTimes(1); // Should not be called again
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
        if (key === undefined) {
          return {
            SLACK_HELP_COMMAND_TOKEN: 'valid_token',
            SLACK_JOIN_CHANNELS: '#general',
            SLACK_MODE: 'socket',
            SLACK_DEFAULT_CHANNEL_ID: 'C123',
          };
        }
        if (key === 'SLACK_HELP_COMMAND_TOKEN') return 'valid_token';
        if (key === 'SLACK_JOIN_CHANNELS') return '#general';
        if (key === 'SLACK_MODE') return 'socket';
        if (key === 'SLACK_DEFAULT_CHANNEL_ID') return 'C123';
        return undefined;
      });
      // Mock webClient.chat.postMessage
      mockBotManagerInstance.getAllBots.mockReturnValue([
        {
          webClient: {
            chat: {
              postMessage: jest.fn().mockResolvedValue({ ts: 'mockTs' })
            }
          },
          botUserId: 'U123',
          botToken: 'token1',
          signingSecret: 'test-secret'
        } as any
      ]);
    });

    it('should send a help DM if token is valid', async () => {
      // Use fake timers to force setImmediate to run during the test
      jest.useFakeTimers();

      // Mock the postMessage call to actually resolve
      mockBotManagerInstance.getAllBots()[0].webClient.chat.postMessage = jest.fn().mockResolvedValue({ ts: 'mockTs' });

      await eventProcessor.handleHelpRequest(mockReq, mockRes);

      // Advance timers to run the setImmediate block
      jest.runAllTimers();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledTimes(1);
      expect(mockBotManagerInstance.getAllBots()[0].webClient.chat.postMessage).toHaveBeenCalledTimes(1);
      expect(mockBotManagerInstance.getAllBots()[0].webClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        channel: 'U123',
        text: expect.stringContaining('Hi <@U123>, here’s my configuration:'), // Matches actual helpText in implementation
      }));

      // Restore timers
      jest.useRealTimers();
    });

    it('should return 401 if token is invalid', async () => {
      mockReq.body.token = 'invalid_token';
      await eventProcessor.handleHelpRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith('Unauthorized');
      expect(mockBotManagerInstance.getAllBots()[0].webClient.chat.postMessage).not.toHaveBeenCalled();
    });

    it('should return 400 if user_id is missing', async () => {
      delete mockReq.body.user_id;
      await eventProcessor.handleHelpRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Missing user ID');
      expect(mockBotManagerInstance.getAllBots()[0].webClient.chat.postMessage).not.toHaveBeenCalled();
    });

    it('should handle error during DM sending', async () => {
      // Use fake timers to force setImmediate to run during the test
      jest.useFakeTimers();

      mockBotManagerInstance.getAllBots.mockReturnValue([
        {
          webClient: {
            chat: {
              postMessage: jest.fn().mockRejectedValue(new Error('DM failed'))
            }
          },
          botUserId: 'U123',
          botToken: 'token1',
          signingSecret: 'test-secret'
        } as any
      ]);

      const handleRequestPromise = eventProcessor.handleHelpRequest(mockReq, mockRes);

      // Advance timers to run the setImmediate block
      jest.runAllTimers();

      await handleRequestPromise;

      expect(mockRes.status).toHaveBeenCalledWith(200); // Acknowledges command first
      // Expect the DM to be attempted even if it fails
      expect(mockBotManagerInstance.getAllBots()[0].webClient.chat.postMessage).toHaveBeenCalledTimes(1);

      // Restore timers
      jest.useRealTimers();
    });
  });

  describe('debugEventPermissions', () => {
    it('should log bot permissions', async () => {
      const mockAuthTest = jest.fn().mockResolvedValue({ user_id: 'U123', user: 'testuser' });
      const mockConversationsList = jest.fn().mockResolvedValue({ ok: true, channels: [{ id: 'C1', name: 'general' }] });
      mockBotManagerInstance.getAllBots.mockReturnValue([
        {
          webClient: {
            auth: { test: mockAuthTest },
            conversations: { list: mockConversationsList }
          },
          botUserId: 'U123',
          botToken: 'token1',
          signingSecret: 'test-secret'
        } as any
      ]);

      await eventProcessor.debugEventPermissions();

      expect(mockAuthTest).toHaveBeenCalledTimes(1);
      expect(mockConversationsList).toHaveBeenCalledWith({ types: 'public_channel,private_channel' });
    });

    it('should handle errors during auth test', async () => {
      const mockAuthTest = jest.fn().mockRejectedValue(new Error('Auth error'));
      const mockConversationsList = jest.fn().mockResolvedValue({ ok: true, channels: [] });
      mockBotManagerInstance.getAllBots.mockReturnValue([
        { webClient: { auth: { test: mockAuthTest }, conversations: { list: mockConversationsList } }, botUserId: 'U123', botToken: 'token1' } as any
      ]);

      await expect(eventProcessor.debugEventPermissions()).resolves.not.toThrow();

      expect(mockAuthTest).toHaveBeenCalledTimes(1);
      expect(mockConversationsList).toHaveBeenCalledTimes(1); // It always calls this, even on auth failure
    });

    it('should handle errors during conversations list', async () => {
      const mockAuthTest = jest.fn().mockResolvedValue({ user_id: 'U123', user: 'testuser' });
      const mockConversationsList = jest.fn().mockRejectedValue(new Error('Conversations error'));
      mockBotManagerInstance.getAllBots.mockReturnValue([
        { webClient: { auth: { test: mockAuthTest }, conversations: { list: mockConversationsList } }, botUserId: 'U123', botToken: 'token1' } as any
      ]);

      await expect(eventProcessor.debugEventPermissions()).resolves.not.toThrow();

      expect(mockAuthTest).toHaveBeenCalledTimes(1);
      expect(mockConversationsList).toHaveBeenCalledTimes(1);
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
