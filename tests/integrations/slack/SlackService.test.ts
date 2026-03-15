import * as fs from 'fs';
import express from 'express';
import { WebClient } from '@slack/web-api';
import { SlackService } from '@integrations/slack/SlackService';

// Top-level mocks
jest.mock('fs');
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn(),
}));

jest.mock('@src/config/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn((key) => (key === 'MESSAGE_USERNAME_OVERRIDE' ? 'Madgwick AI' : undefined)),
  },
}));

jest.mock('@src/config/slackConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn((key) => {
      if (key === 'SLACK_DEFAULT_CHANNEL_ID') return 'C123';
      if (key === 'SLACK_JOIN_CHANNELS') return 'C123';
      if (key === 'SLACK_WELCOME_MESSAGE_QUOTE') return 'Welcome!';
      return undefined;
    }),
    getProperties: () => ({
      defaultChannelId: 'C123',
      joinChannels: 'C123',
      welcomeMessageQuote: 'Welcome!',
    }),
  },
}));

const mockWebClientInstance = {
  auth: { test: jest.fn().mockResolvedValue({ user_id: 'bot1', user: 'Madgwick AI' }) },
  chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
  conversations: {
    join: jest.fn().mockResolvedValue({}),
    history: jest.fn().mockResolvedValue({ messages: [] }),
  },
};

const mockBotManagerInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getAllBots: jest.fn().mockReturnValue([
    {
      botToken: 'xoxb-test-token',
      botUserId: 'bot1',
      botUserName: 'Madgwick AI',
      webClient: mockWebClientInstance,
    },
  ]),
  getBotByName: jest.fn().mockImplementation((name) => {
    if (name === 'LegacyBot1' || name === 'Madgwick AI' || !name) {
      return {
        botToken: 'xoxb-test-token',
        botUserId: 'bot1',
        botUserName: name || 'Madgwick AI',
        webClient: mockWebClientInstance,
      };
    }
    return undefined;
  }),
  setMessageHandler: jest.fn(),
};

jest.mock('@integrations/slack/SlackBotManager', () => ({
  SlackBotManager: jest.fn().mockImplementation(() => mockBotManagerInstance),
}));

describe('SlackService', () => {
  let service: any;
  let mockWebClient: any;
  let mockBotManager: any;
  let app: express.Application;

  beforeEach(async () => {
    jest.resetModules(); // Clear module cache
    jest.clearAllMocks();

    app = express();

    const { SlackBotManager } = require('@integrations/slack/SlackBotManager');
    mockBotManager = mockBotManagerInstance;

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
    (SlackBotManager as jest.Mock).mockImplementation(() => mockBotManager);

    delete process.env.SLACK_USERNAME_OVERRIDE;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_APP_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        slack: {
          instances: [
            {
              name: 'LegacyBot1',
              token: 'xoxb-legacy-token',
              signingSecret: 'legacy-secret',
            },
          ],
          mode: 'socket',
        },
      })
    );

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    service.setApp(app);
    await service.initialize(); // Explicit call
    mockWebClientInstance.chat.postMessage.mockClear();
  });

  afterEach(() => {
    service.shutdown();
  });

  it('initializes service', async () => {
    expect(mockBotManager.initialize).toHaveBeenCalled();
  });

  it('handles messaging operations', async () => {
    // Test sending message to channel
    await service.sendMessageToChannel('channel1', 'Hello', 'Madgwick AI');
    expect(mockBotManager.getBotByName().webClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'channel1',
        text: 'Hello',
        username: 'Madgwick AI',
      })
    );

    // Reset mocks and test fetching messages
    jest.clearAllMocks();
    await service.fetchMessages('channel1');
    expect(mockBotManager.getBotByName().webClient.conversations.history).toHaveBeenCalledWith({
      channel: 'channel1',
      limit: 10,
    });

    // Reset mocks and test sending public announcement
    jest.clearAllMocks();
    await service.sendPublicAnnouncement('channel1', 'Announce');
    expect(mockBotManager.getBotByName().webClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'channel1',
        text: 'Announce',
        username: 'Madgwick AI',
      })
    );
  });

  it('handles channel and service operations', async () => {
    // Test joining channel
    await service.joinChannel('channel1');
    expect(mockBotManager.getBotByName().webClient.conversations.join).toHaveBeenCalledWith({
      channel: 'channel1',
    });
    expect(mockBotManager.getBotByName().webClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'channel1',
        text: expect.stringContaining('Welcome'),
        username: 'Madgwick AI',
      })
    );

    // Reset mocks and test sending welcome message
    jest.clearAllMocks();
    const welcomeHandler = service.getWelcomeHandler('LegacyBot1');
    await welcomeHandler.sendBotWelcomeMessage('channel1');
    expect(
      mockBotManager.getBotByName('LegacyBot1').webClient.chat.postMessage
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'channel1',
        text: expect.stringContaining('Welcome'),
        username: 'Madgwick AI',
      })
    );

    // Test getting client ID
    expect(service.getClientId()).toBe('bot1');

    // Test getting default channel
    expect(service.getDefaultChannel()).toBe('C123');

    // Test shutdown
    await service.shutdown();
    expect(
      (require('@integrations/slack/SlackService').SlackService as any).instance
    ).toBeUndefined();
  });
});
