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
      on: jest.fn(),
      start: jest.fn(),
    })),
  };
});

jest.mock('@slack/rtm-api', () => {
  return {
    RTMClient: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      start: jest.fn(),
      addAppMetadata: jest.fn(),
    })),
  };
});

// Retrieve mocks for use in tests
const { __mocks__ } = require('@slack/web-api');
const postMessageMock = __mocks__.postMessageMock;
const joinMock = __mocks__.joinMock;
const historyMock = __mocks__.historyMock;
const authTestMock = __mocks__.authTestMock;

const SocketModeClient = require('@slack/socket-mode').SocketModeClient;
const RTMClient = require('@slack/rtm-api').RTMClient;
const socketClientMock = new SocketModeClient();
const socketOnMock = socketClientMock.on;
const socketStartMock = socketClientMock.start;

describe('SlackService', () => {
  beforeEach(() => {
    SlackService.resetInstance();
    // Set comma-separated environment variables.
    process.env.SLACK_BOT_TOKEN = 'dummy-slack-token';
    process.env.SLACK_APP_TOKEN = 'dummy-app-token';
    process.env.SLACK_SIGNING_SECRET = 'dummy-signing-secret';
    process.env.SLACK_JOIN_CHANNELS = 'DEADBEEFCAFE';
    process.env.SLACK_DEFAULT_CHANNEL_ID = 'DEADBEEFCAFE';
    postMessageMock.mockClear();
    joinMock.mockClear();
    historyMock.mockClear();
    authTestMock.mockClear();
    socketOnMock.mockClear();
    socketStartMock.mockClear();
  });

  afterEach(() => {
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_APP_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    delete process.env.SLACK_JOIN_CHANNELS;
    delete process.env.SLACK_DEFAULT_CHANNEL_ID;
  });

  it('should send a plain message', async () => {
    const slackService = SlackService.getInstance();
    // Simulate auth test result by manually setting botUserName on default bot.
    slackService['slackBots'][0].botUserName = 'TestBot';
    const channel = 'C123456';
    const message = 'Test message';

    await slackService.sendMessage(channel, message);
    // Adjust expected message formatting as needed.
    expect(postMessageMock).toHaveBeenCalledWith({
      channel,
      text: '*TestBot*: Test message',
      icon_emoji: ':robot_face:',
      username: 'TestBot',
      unfurl_links: true,
      unfurl_media: true,
    });
  });

  it('should send a welcome message', async () => {
    const slackService = SlackService.getInstance();
    slackService['slackBots'][0].botUserName = 'TestBot';
    const channel = 'C123456';

    // Call the public wrapper that sends a welcome message using the default bot.
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
    slackService['slackBots'][0].botUserName = 'TestBot';
    const channel = 'C123456';

    await slackService.joinChannel(channel);
    expect(joinMock).toHaveBeenCalledWith({ channel });
    // The welcome message should be sent after joining.
    expect(postMessageMock).toHaveBeenCalled();
  });

  it('should handle action endpoint with valid payload', async () => {
    const slackService = SlackService.getInstance();
    slackService['slackBots'][0].botUserName = 'TestBot';
    // Set a dummy messageHandler that resolves.
    slackService.setMessageHandler(async (message, history) => 'Handled');
    const validPayload = {
      type: 'block_actions',
      user: { id: 'U123456' },
      actions: [{ action_id: 'test_action_id', value: 'TestAction' }],
      trigger_id: 'trigger123'
    };
    const mockRequest = {
      body: {
        payload: JSON.stringify(validPayload),
      },
      headers: {
        'x-slack-signature': 'v0=valid_signature',
        'x-slack-request-timestamp': '1234567890',
      },
    };
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Instead of calling a non-existent handleActionRequest, we now call the eventProcessor's process.
    await (slackService as any).eventProcessor.process(mockRequest, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    // In this refactored design, no fixed response body is sent for a valid payload.
    expect(mockResponse.send).toHaveBeenCalled();
  });

  it('should handle action endpoint with invalid payload', async () => {
    const slackService = SlackService.getInstance();
    const mockRequest = {
      body: {
        payload: 'invalid_payload',
      },
      headers: {
        'x-slack-signature': 'v0=invalid_signature',
        'x-slack-request-timestamp': '1234567890',
      },
    };
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await (slackService as any).eventProcessor.process(mockRequest, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith('Bad Request');
  });
});
