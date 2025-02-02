import { WebClient } from '@slack/web-api';
import { SlackService } from '../../../src/integrations/slack/SlackService';

jest.mock('@slack/web-api', () => {
  const postMessageMock = jest.fn();
  const joinMock = jest.fn();
  const historyMock = jest.fn();
  const authTestMock = jest.fn().mockResolvedValue({ user_id: 'U123456', user: 'TestBot' });

  return {
    WebClient: jest.fn(() => ({
      chat: { postMessage: postMessageMock },
      conversations: { join: joinMock, history: historyMock },
      auth: { test: authTestMock },
    })),
    __mocks__: {
      postMessageMock,
      joinMock,
      historyMock,
      authTestMock,
    },
  };
});

jest.mock('@slack/socket-mode', () => {
  return {
    SocketModeClient: jest.fn().mockImplementation(() => ({
      on: jest.fn(),    // ✅ Ensure event handling is mocked
      start: jest.fn(), // ✅ Ensure start() is mocked
    })),
  };
});

// ✅ Retrieve mocks for use in tests
const { __mocks__ } = require('@slack/web-api');
const postMessageMock = __mocks__.postMessageMock;
const joinMock = __mocks__.joinMock;
const historyMock = __mocks__.historyMock;
const authTestMock = __mocks__.authTestMock;

const SocketModeClient = require('@slack/socket-mode').SocketModeClient;
const socketClientMock = new SocketModeClient();

const socketOnMock = socketClientMock.on;
const socketStartMock = socketClientMock.start;

// Mock SocketModeClient to prevent API calls
jest.mock('@slack/socket-mode', () => {
  return {
    SocketModeClient: jest.fn(() => ({
      on: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('SlackService', () => {
  beforeEach(() => {
    SlackService.resetInstance();
    process.env.SLACK_BOT_TOKEN = 'dummy-slack-token';
    process.env.SLACK_APP_TOKEN = 'dummy-app-token';
    process.env.SLACK_JOIN_CHANNELS = 'DEADBEEFCAFE';
    process.env.SLACK_DEFAULT_CHANNEL_ID = 'DEADBEEFCAFE';
    postMessageMock.mockClear();
    joinMock.mockClear();
    historyMock.mockClear();
  });

  afterEach(() => {
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_APP_TOKEN;
  });

  it('should send a plain message', async () => {
    const slackService = SlackService.getInstance();
    const channel = 'C123456';
    const message = 'Test message';

    await slackService.sendMessage(channel, message);
    expect(postMessageMock).toHaveBeenCalledWith({ channel, text: message });
  });

  it('should send a welcome message', async () => {
    const slackService = SlackService.getInstance();
    const channel = 'C123456';

    await slackService.sendWelcomeMessage(channel);
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channel,
        blocks: expect.any(Array),
      })
    );
  });

  it('should join a channel and send a welcome message', async () => {
    const slackService = SlackService.getInstance();
    const channel = 'C123456';

    await slackService.joinChannel(channel);
    expect(joinMock).toHaveBeenCalledWith({ channel });
    expect(postMessageMock).toHaveBeenCalled(); // Welcome message check
  });

  // it('should fetch messages from a channel', async () => {
  //   const slackService = SlackService.getInstance();
  //   const channel = 'C123456';
  //   const dummyMessages = [{ text: 'Test message' }];

  //   (historyMock as jest.Mock).mockResolvedValue({ messages: dummyMessages });

  //   const messages = await slackService.fetchMessages(channel);
  //   expect(historyMock).toHaveBeenCalledWith({ channel, limit: 10 });
  //   expect(messages).toEqual(dummyMessages);
  // });
});
