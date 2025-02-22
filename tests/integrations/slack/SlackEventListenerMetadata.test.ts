import { SlackService } from '@integrations/slack/SlackService';
import express, { Application } from 'express';

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: jest.fn().mockResolvedValue({ user_id: 'bot1', user: 'Jeeves' }) },
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
    conversations: { join: jest.fn(), history: jest.fn() },
  })),
}));

describe('SlackEventListener with Metadata', () => {
  let slackService: SlackService;
  let app: Application;

  beforeEach(() => {
    slackService = SlackService.getInstance();
    app = express();
    slackService.setApp(app);
    jest.clearAllMocks();
  });

  it('includes metadata for message event', async () => {
    await slackService.initialize();
    jest.spyOn(slackService, 'sendMessageToChannel').mockResolvedValue('msg123');
    await slackService.sendMessageToChannel('C123', 'Hello with metadata!', 'Jeeves', '123');
    expect(slackService.sendMessageToChannel).toHaveBeenCalledWith('C123', 'Hello with metadata!', 'Jeeves', '123');
  });
});
