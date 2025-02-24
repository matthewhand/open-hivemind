jest.resetModules();

import { SlackService } from '@integrations/slack/SlackService';
import express from 'express';

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

describe('SlackEventListener with Metadata', () => {
  let slackService: SlackService;
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SLACK_USERNAME_OVERRIDE;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    (SlackService as any).instance = undefined;
    slackService = SlackService.getInstance();
    app = express();
    slackService.setApp(app);
  });

  xit('includes metadata for message event', async () => {
    await slackService.initialize();
    jest.spyOn(slackService, 'sendMessageToChannel').mockResolvedValue('msg123');
    await slackService.sendMessageToChannel('C123', 'Hello with metadata!', 'Madgwick AI', '123');
    expect(slackService.sendMessageToChannel).toHaveBeenCalledWith('C123', 'Hello with metadata!', 'Madgwick AI', '123');
  });
});
