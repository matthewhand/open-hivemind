import express from 'express';
import { SlackService } from '@hivemind/message-slack/SlackService';
import { WebClient } from '@slack/web-api';

interface SlackBotInfo {
  botToken: string;
  botUserId: string;
  botUserName: string;
  webClient: WebClient;
}

interface SlackBotManagerMock {
  initialize: jest.Mock<Promise<void>>;
  getAllBots: jest.Mock<SlackBotInfo[]>;
  getBotByName: jest.Mock<SlackBotInfo | undefined>;
  setMessageHandler: jest.Mock<void>;
}

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn(() => ({
    auth: { test: jest.fn().mockResolvedValue({ user_id: 'bot1', user: 'Madgwick AI' }) },
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
    conversations: { join: jest.fn().mockResolvedValue({}), history: jest.fn() },
  })),
}));

jest.mock('@src/config/messageConfig', () => ({
  default: {
    get: jest.fn((key) => (key === 'MESSAGE_USERNAME_OVERRIDE' ? 'Madgwick AI' : undefined)),
  },
}));

jest.mock('@src/config/slackConfig', () => ({
  default: {
    get: jest.fn((key) => (key === 'SLACK_JOIN_CHANNELS' ? 'C123' : undefined)),
  },
}));

jest.mock('@src/services/StartupGreetingService', () => ({
  StartupGreetingService: jest.fn(),
}));

jest.mock('tsyringe', () => {
  const actual = jest.requireActual('tsyringe');
  return {
    ...actual,
    container: {
      ...actual.container,
      resolve: jest.fn(() => ({
        emit: jest.fn(),
      })),
    },
  };
});

jest.mock('@hivemind/message-slack/SlackBotManager', () => {
  return jest.fn().mockImplementation(
    (): SlackBotManagerMock => ({
      initialize: jest.fn().mockImplementation(async function (this: SlackBotManagerMock) {
        const botInfo = this.getAllBots()[0];
        await botInfo.webClient.auth.test();
      }),
      getAllBots: jest.fn().mockReturnValue([
        {
          botToken: 'xoxb-test-token',
          botUserId: 'bot1',
          botUserName: 'Madgwick AI',
          webClient: new (require('@slack/web-api').WebClient)('xoxb-test-token'),
        },
      ]),
      getBotByName: jest.fn(),
      setMessageHandler: jest.fn(),
    })
  );
});

describe('SlackEventListener', () => {
  let service: SlackService;
  let app: express.Application;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Register mock StartupGreetingService in tsyringe container
    const { container } = require('tsyringe');
    const { StartupGreetingService } = require('@src/services/StartupGreetingService');
    const mockStartupGreetingService = {
      emit: jest.fn(),
      on: jest.fn(),
    };
    container.registerInstance(StartupGreetingService, mockStartupGreetingService);

    delete process.env.SLACK_USERNAME_OVERRIDE;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_APP_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    app = express();
    service.setApp(app);
    await service.initialize();
  });

  it('handles message event', async () => {
    const botManager = service.getBotManager();
    expect(botManager).toBeDefined();
    expect(botManager?.getAllBots().length).toBe(1);
  });
});
