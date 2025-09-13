import { SlackBotManager } from '@integrations/slack/SlackBotManager';
import { SocketModeClient } from '@slack/socket-mode';
import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';

jest.mock('@slack/socket-mode');
jest.mock('@slack/rtm-api');
jest.mock('@slack/web-api');

const MockSocketModeClient = SocketModeClient as jest.MockedClass<typeof SocketModeClient>;
const MockRTMClient = RTMClient as jest.MockedClass<typeof RTMClient>;
const MockWebClient = WebClient as jest.MockedClass<typeof WebClient>;

describe('SlackBotManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks for each test
    MockSocketModeClient.mockClear();
    MockRTMClient.mockClear();
    MockWebClient.mockClear();

    // Default mock implementations for WebClient auth.test
    MockWebClient.mockImplementation(() => ({
      auth: {
        test: jest.fn(() => Promise.resolve({ user_id: 'U123', user: 'testuser' })),
      },
      conversations: {
        history: jest.fn(() => Promise.resolve({ messages: [] })),
      },
    } as any));

    // Default mock implementations for SocketModeClient
    MockSocketModeClient.mockImplementation(() => ({
      on: jest.fn(),
      start: jest.fn(() => Promise.resolve()),
    } as any));

    // Default mock implementations for RTMClient
    MockRTMClient.mockImplementation(() => ({
      start: jest.fn(() => Promise.resolve()),
    } as any));
  });

  it('should handle initialization, configuration, and message handling', async () => {
    // Test socket mode initialization with multiple tokens
    const instances = [
      { token: 'botToken1', appToken: 'appToken1', signingSecret: 'secret1' },
      { token: 'botToken2', appToken: 'appToken2', signingSecret: 'secret2' },
    ];
    const manager = new SlackBotManager(instances, 'socket');
    await manager.initialize();
    expect(MockWebClient).toHaveBeenCalledTimes(2);
    expect(MockSocketModeClient).toHaveBeenCalledTimes(2);
    expect(manager.getAllBots().length).toBe(2);

    // Test RTM mode initialization
    const rtmInstances = [{ token: 'botToken1', signingSecret: 'secret1' }];
    const rtmManager = new SlackBotManager(rtmInstances, 'rtm');
    await rtmManager.initialize();
    expect(MockWebClient).toHaveBeenCalledTimes(3); // +1 from previous
    expect(MockRTMClient).toHaveBeenCalledTimes(1);

    // Test authentication failure
    MockWebClient.mockImplementation(() => ({
      auth: {
        test: jest.fn(() => Promise.reject(new Error('Auth failed'))),
      },
      conversations: {
        history: jest.fn(() => Promise.resolve({ messages: [] })),
      },
    } as any));
    const failManager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    await expect(failManager.initialize()).rejects.toThrow('Auth failed');

    // Test message handler configuration
    const handlerManager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    const mockHandler = jest.fn(() => Promise.resolve('handled'));
    handlerManager.setMessageHandler(mockHandler);
    expect(handlerManager['messageHandler']).toBe(mockHandler);

    // Test bot retrieval
    const bots = handlerManager.getAllBots();
    expect(bots.length).toBe(1);
    expect(bots[0].botToken).toBe('botToken1');

    // Test getBotByName
    const nameInstances = [
      { token: 'botToken1', signingSecret: 'secret1' },
      { token: 'botToken2', signingSecret: 'secret2' },
    ];
    const nameManager = new SlackBotManager(nameInstances, 'socket');
    nameManager.getAllBots()[0].botUserName = 'BotOne';
    nameManager.getAllBots()[1].botUserName = 'BotTwo';
    expect(nameManager.getBotByName('BotOne')).toBeDefined();
    expect(nameManager.getBotByName('nonexistent')).toBeUndefined();

    // Test message handling with handler
    const mockMessage = { getText: () => 'test', data: { event_ts: '123', ts: '123', channel: 'C123', user: 'U456' } };
    const result = await handlerManager.handleMessage(mockMessage as any, [], {});
    expect(mockHandler).toHaveBeenCalledWith(mockMessage, [], {});
    expect(result).toBe('handled');

    // Test message handling without handler
    const noHandlerManager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    const noHandlerResult = await noHandlerManager.handleMessage(mockMessage as any, [], {});
    expect(noHandlerResult).toBe('');
  });
});
