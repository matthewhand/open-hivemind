jest.resetModules();

import { SlackService } from '@integrations/slack/SlackService';
import { WebClient } from '@slack/web-api';

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn(() => ({
    auth: { test: jest.fn().mockResolvedValue({ user_id: 'bot1', user: 'Madgwick AI' }) },
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
    conversations: {
      join: jest.fn().mockResolvedValue({}),
      history: jest.fn().mockResolvedValue({ messages: [] }),
    },
  })),
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

describe('SlackService', () => {
  let service: SlackService;
  let mockWebClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.SLACK_USERNAME_OVERRIDE;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    await service.initialize();
    mockWebClient = service.getBotManager().getAllBots()[0].webClient;
  });

  afterEach(() => {
    service.shutdown();
  });

  xit('initializes service', async () => {
    expect(mockWebClient.auth.test).toHaveBeenCalled();
  });

  xit('sends message to channel', async () => {
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

  xit('sends public announcement', async () => {
    await service.sendPublicAnnouncement('channel1', 'Announce');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'channel1',
      text: '*Madgwick AI*: Announce',
      username: 'Madgwick AI',
    }));
  });

  xit('joins channel', async () => {
    await service.joinChannel('channel1');
    expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel: 'channel1' });
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'channel1',
      text: '*Madgwick AI*: Welcome from Madgwick AI!',
      username: 'Madgwick AI',
    }));
  });

  xit('sends welcome message', async () => {
    await service.sendWelcomeMessage('channel1');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'channel1',
      text: '*Madgwick AI*: Welcome from Madgwick AI!',
      username: 'Madgwick AI',
    }));
  });

  xit('gets client ID', () => {
    expect(service.getClientId()).toBe('bot1');
  });

  xit('gets default channel', () => {
    expect(service.getDefaultChannel()).toBe('C123');
  });

  it('shuts down', async () => {
    await service.shutdown();
    expect((SlackService as any).instance).toBeUndefined();
  });
});
