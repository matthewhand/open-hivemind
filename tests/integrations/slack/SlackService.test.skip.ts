import { WebClient } from '@slack/web-api';

// Top-level mocks
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn(),
}));

jest.mock('@src/config/messageConfig', () => ({
  default: {
    get: jest.fn((key) => (key === 'MESSAGE_USERNAME_OVERRIDE' ? 'Madgwick AI' : undefined)),
  },
}));

jest.mock('@src/config/slackConfig', () => ({
  default: {
    get: jest.fn((key) => (key === 'SLACK_DEFAULT_CHANNEL_ID' ? 'C123' : key === 'SLACK_JOIN_CHANNELS' ? 'C123' : undefined)),
  },
}));

jest.mock('@integrations/slack/SlackBotManager', () => ({
  SlackBotManager: jest.fn(),
}));

import { SlackService } from '@integrations/slack/SlackService';

describe('SlackService', () => {
  let service: any;
  let mockWebClient: any;

  beforeEach(async () => {
    jest.resetModules(); // Clear module cache
    jest.clearAllMocks();

    // Define mockWebClient first
    mockWebClient = {
      auth: { test: jest.fn().mockResolvedValue({ user_id: 'bot1', user: 'Madgwick AI' }) },
      chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
      conversations: {
        join: jest.fn().mockResolvedValue({}),
        history: jest.fn().mockResolvedValue({ messages: [] }),
      },
    };
    require('@slack/web-api').WebClient.mockImplementation(() => mockWebClient);

    // Mock SlackBotManager with mockWebClient
    require('@integrations/slack/SlackBotManager').SlackBotManager.mockImplementation(() => ({
      initialize: jest.fn().mockImplementation(async () => {
        console.log('Mock initialize called');
        await mockWebClient.auth.test();
      }),
      getAllBots: jest.fn().mockReturnValue([{
        botToken: 'xoxb-test-token',
        botUserId: 'bot1',
        botUserName: 'Madgwick AI',
        webClient: mockWebClient,
      }]),
      getBotByName: jest.fn().mockImplementation((name) => ({
        botToken: 'xoxb-test-token',
        botUserId: 'bot1',
        botUserName: name,
        webClient: mockWebClient,
      })),
      setMessageHandler: jest.fn(),
    }));

    delete process.env.SLACK_USERNAME_OVERRIDE;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_APP_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    await service.getBotManager().initialize(); // Explicit call
  });

  afterEach(() => {
    service.shutdown();
  });

  it('initializes service', async () => {
    expect(mockWebClient.auth.test).toHaveBeenCalled();
  });

  it('sends message to channel', async () => {
    await service.sendMessageToChannel('channel1', 'Hello', 'Madgwick AI');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'channel1',
      text: '*Madgwick AI*: Hello',
      username: 'Madgwick AI',
    }));
  });

  it('fetches messages from channel', async () => {
    await service.fetchMessages('channel1');
    expect(mockWebClient.conversations.history).toHaveBeenCalledWith({ channel: 'channel1', limit: 10 });
  });

  it('sends public announcement', async () => {
    await service.sendPublicAnnouncement('channel1', 'Announce');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'channel1',
      text: '*Madgwick AI*: Announce',
      username: 'Madgwick AI',
    }));
  });

  it('joins channel', async () => {
    await service.joinChannel('channel1');
    expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel: 'channel1' });
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'channel1',
      text: '*Madgwick AI*: Welcome from Madgwick AI!',
      username: 'Madgwick AI',
    }));
  });

  it('sends welcome message', async () => {
    await service.sendWelcomeMessage('channel1');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'channel1',
      text: '*Madgwick AI*: Welcome from Madgwick AI!',
      username: 'Madgwick AI',
    }));
  });

  it('gets client ID', () => {
    expect(service.getClientId()).toBe('bot1');
  });

  it('gets default channel', () => {
    expect(service.getDefaultChannel()).toBe('C123');
  });

  it('shuts down', async () => {
    await service.shutdown();
    expect((require('@integrations/slack/SlackService').SlackService as any).instance).toBeUndefined();
  });
});
