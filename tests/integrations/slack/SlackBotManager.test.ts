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

  it('should initialize with socket mode and multiple tokens', async () => {
    const instances = [
      { token: 'botToken1', appToken: 'appToken1', signingSecret: 'secret1' },
      { token: 'botToken2', appToken: 'appToken2', signingSecret: 'secret2' },
    ];
    const manager = new SlackBotManager(instances, 'socket');

    await manager.initialize();

    expect(MockWebClient).toHaveBeenCalledTimes(2);
    expect(MockSocketModeClient).toHaveBeenCalledTimes(2);
    expect(manager.getAllBots().length).toBe(2);
    expect(manager.getAllBots()[0].botUserId).toBe('U123');
    expect(manager.getAllBots()[0].botUserName).toBe('testuser');
    expect(manager.getAllBots()[0].socketClient?.start).toHaveBeenCalledTimes(1); // Only primary bot starts listener
    expect(manager.getAllBots()[1].socketClient?.start).toHaveBeenCalledTimes(1); // Secondary bot also starts listener
  });

  it('should initialize with rtm mode', async () => {
    const instances = [{ token: 'botToken1', signingSecret: 'secret1' }];
    const manager = new SlackBotManager(instances, 'rtm');

    await manager.initialize();

    expect(MockWebClient).toHaveBeenCalledTimes(1);
    expect(MockRTMClient).toHaveBeenCalledTimes(1);
    expect(manager.getAllBots().length).toBe(1);
    expect(manager.getAllBots()[0].rtmClient?.start).toHaveBeenCalledTimes(1);
  });

  it('should throw error if bot authentication fails', async () => {
    MockWebClient.mockImplementation(() => ({
      auth: {
        test: jest.fn(() => Promise.reject(new Error('Auth failed'))),
      },
      conversations: {
        history: jest.fn(() => Promise.resolve({ messages: [] })),
      },
    } as any));

    const manager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    await expect(manager.initialize()).rejects.toThrow('Auth failed');
  });

  it('should set message handler', () => {
    const manager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    const mockHandler = jest.fn();
    manager.setMessageHandler(mockHandler);
    expect(manager['messageHandler']).toBe(mockHandler);
  });

  it('should return all bots', () => {
    const manager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    const bots = manager.getAllBots();
    expect(bots.length).toBe(1);
    expect(bots[0].botToken).toBe('botToken1');
  });

  it('should return bot by name', async () => {
    const instances = [
      { token: 'botToken1', signingSecret: 'secret1' },
      { token: 'botToken2', signingSecret: 'secret2' },
    ];
    const manager = new SlackBotManager(instances, 'socket');
    // Manually set bot user names for testing getBotByName
    manager.getAllBots()[0].botUserName = 'BotOne';
    manager.getAllBots()[1].botUserName = 'BotTwo';

    expect(manager.getBotByName('BotOne')).toBeDefined();
    expect(manager.getBotByName('BotTwo')).toBeDefined();
    expect(manager.getBotByName('nonexistent')).toBeUndefined();
  });

  it('should handle message with message handler', async () => {
    const manager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    const mockHandler = jest.fn(() => Promise.resolve('handled'));
    manager.setMessageHandler(mockHandler);

    const mockMessage = { getText: () => 'test', data: { event_ts: '123', ts: '123', channel: 'C123', user: 'U456' } };
    const result = await manager.handleMessage(mockMessage as any, [], {});
    expect(mockHandler).toHaveBeenCalledWith(mockMessage, [], {});
    expect(result).toBe('handled');
  });

  it('should return empty string if no message handler set', async () => {
    const manager = new SlackBotManager([{ token: 'botToken1', signingSecret: 'secret1' }], 'socket');
    const mockMessage = { getText: () => 'test', data: { event_ts: '123', ts: '123', channel: 'C123', user: 'U456' } };
    const result = await manager.handleMessage(mockMessage as any, [], {});
    expect(result).toBe('');
  });
});
