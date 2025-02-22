import { SlackService } from '@integrations/slack/SlackService';
import express, { Application } from 'express';

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: jest.fn().mockResolvedValue({ user_id: 'bot1', user: 'Jeeves' }) },
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
    conversations: { join: jest.fn().mockResolvedValue({}), history: jest.fn().mockResolvedValue({ messages: [] }) },
  })),
}));

jest.mock('@integrations/slack/SlackBotManager', () => {
  const mockWebClient = {
    auth: { test: jest.fn().mockResolvedValue({ user_id: 'bot1', user: 'Jeeves' }) },
    chat: { postMessage: jest.fn().mockResolvedValue({ ts: 'msg123' }) },
    conversations: { join: jest.fn().mockResolvedValue({}), history: jest.fn().mockResolvedValue({ messages: [] }) },
  };
  return {
    SlackBotManager: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      getAllBots: jest.fn().mockReturnValue([{ botUserId: 'bot1', botUserName: 'Jeeves', webClient: mockWebClient }]),
      getBotByName: jest.fn().mockReturnValue({ botUserId: 'bot1', botUserName: 'Jeeves', webClient: mockWebClient }),
      setMessageHandler: jest.fn(),
    })),
  };
});

jest.mock('@integrations/slack/SlackSignatureVerifier', () => ({
  SlackSignatureVerifier: jest.fn().mockImplementation(() => ({
    verify: jest.fn((req, res, next) => next()),
  })),
}));

jest.mock('@integrations/slack/SlackInteractiveHandler', () => ({
  SlackInteractiveHandler: jest.fn().mockImplementation(() => ({
    handleRequest: jest.fn(),
    handleBlockAction: jest.fn(),
  })),
}));

jest.mock('@integrations/slack/SlackInteractiveActions', () => ({
  SlackInteractiveActions: jest.fn().mockImplementation(() => ({
    sendCourseInfo: jest.fn().mockResolvedValue(undefined),
    sendBookingInstructions: jest.fn().mockResolvedValue(undefined),
    sendStudyResources: jest.fn().mockResolvedValue(undefined),
    sendAskQuestionModal: jest.fn().mockResolvedValue(undefined),
    sendInteractiveHelpMessage: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@src/config/slackConfig', () => ({
  __esModule: true,
  default: { get: jest.fn().mockReturnValue('') },
}));

describe('SlackService', () => {
  let service: SlackService;
  let app: Application;
  let mockWebClient: any;

  beforeEach(async () => {
    process.env.SLACK_BOT_TOKEN = 'token1';
    process.env.SLACK_APP_TOKEN = 'appToken1';
    process.env.SLACK_SIGNING_SECRET = 'secret1';
    (SlackService as any).instance = undefined;
    jest.clearAllMocks();
    service = SlackService.getInstance();
    app = express();
    service.setApp(app);
    await service.initialize();
    mockWebClient = service.getBotManager().getAllBots()[0].webClient;
  });

  afterEach(() => {
    (SlackService as any).instance = undefined;
  });

  it('initializes service', async () => {
    expect(service.getBotManager().initialize).toHaveBeenCalled();
  });

  it('sends message to channel', async () => {
    const messageId = await service.sendMessageToChannel('channel1', 'Hello', 'Jeeves');
    expect(messageId).toBe('msg123');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'channel1', text: '*Jeeves*: Hello' }));
  });

  it('fetches messages from channel', async () => {
    const messages = await service.getMessagesFromChannel('channel1');
    expect(messages).toEqual([]);
    expect(mockWebClient.conversations.history).toHaveBeenCalledWith({ channel: 'channel1', limit: 10 });
  });

  it('sends public announcement', async () => {
    await service.sendPublicAnnouncement('channel1', 'Announce');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'channel1', text: '*Jeeves*: Announce' }));
  });

  it('joins channel', async () => {
    await service.joinChannel('channel1');
    expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel: 'channel1' });
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'channel1', text: '*Jeeves*: Welcome from Jeeves!' }));
  });

  it('sends welcome message', async () => {
    await service.sendWelcomeMessage('channel1');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'channel1', text: '*Jeeves*: Welcome from Jeeves!' }));
  });

  it('gets client ID', () => {
    expect(service.getClientId()).toBe('bot1');
  });

  it('gets default channel', () => {
    expect(service.getDefaultChannel()).toBe('');
  });

  it('shuts down', async () => {
    await service.shutdown();
    expect((SlackService as any).instance).toBeUndefined();
  });
});
