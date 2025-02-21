import { SlackService } from '../../../src/integrations/slack/SlackService';
import { WebClient } from '@slack/web-api';
import slackConfig from '../../../src/config/slackConfig';

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: jest.fn().mockResolvedValue({ user_id: 'test-id', user: 'TestBot' }) },
    conversations: {
      join: jest.fn().mockResolvedValue({}),
      history: jest.fn().mockResolvedValue({ messages: [{ text: 'test' }] }),
    },
    chat: { postMessage: jest.fn().mockResolvedValue({}) },
  })),
}));

describe('SlackService', () => {
  let slackService: SlackService;
  let mockWebClient: any;
  const channel = 'C123456';

  beforeEach(async () => {
    // Reset environment
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_MODE = 'socket';
    process.env.SLACK_JOIN_CHANNELS = 'C123456';
    process.env.SLACK_DEFAULT_CHANNEL_ID = 'C123';
    process.env.NODE_ENV = 'test';

    // Reload slackConfig to pick up env vars
    slackConfig.load({ SLACK_DEFAULT_CHANNEL_ID: 'C123' }); // Force env override

    // Reset singleton and mocks
    (SlackService as any).instance = undefined;
    jest.clearAllMocks();

    // Initialize SlackService
    slackService = SlackService.getInstance();
    const app = { post: jest.fn() }; // Dummy app for initialize
    await slackService.initialize(app as any);

    // Get the mock WebClient from botManager
    mockWebClient = slackService.getBotManager().getAllBots()[0].webClient;
  });

  afterEach(() => {
    (SlackService as any).instance = undefined; // Type-safe reset
  });

  it('initializes correctly', async () => {
    const app = { post: jest.fn() };
    await slackService.initialize(app as any);
    expect(app.post).toHaveBeenCalledTimes(2); // Two endpoints
  });

  it('sends a message', async () => {
    await slackService.sendMessageToChannel(channel, 'Hello', 'TestBot');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel,
      text: '*TestBot*: Hello',
      username: 'TestBot',
    }));
  });

  it('fetches messages', async () => {
    const messages = await slackService.getMessagesFromChannel(channel);
    expect(messages).toHaveLength(1);
    expect(messages[0].getText()).toBe('test');
  });

  it('joins a channel', async () => {
    await slackService.joinChannel(channel);
    expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel });
  });

  it('sends welcome message', async () => {
    await slackService.sendWelcomeMessage(channel);
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      channel,
      text: '*TestBot*: Welcome from TestBot!',
    }));
  });

  it('gets client ID', () => {
    expect(slackService.getClientId()).toBe('test-id');
  });

  it('gets default channel', () => {
    expect(slackService.getDefaultChannel()).toBe('C123');
  });

  it('shuts down', async () => {
    await slackService.shutdown();
    expect((SlackService as any).instance).toBeUndefined();
  });
});
