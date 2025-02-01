import { WebClient } from '@slack/web-api';
import { SlackService } from '../../../src/integrations/slack/SlackService';

// Create mocks for the instance methods.
const postMessageMock = jest.fn();
const joinMock = jest.fn();
const historyMock = jest.fn();

jest.mock('@slack/web-api', () => {
  return {
    WebClient: jest.fn(() => ({
      chat: { postMessage: postMessageMock },
      conversations: { join: joinMock, history: historyMock },
    })),
  };
});

describe('SlackService', () => {
  beforeEach(() => {
    // Set a dummy Slack bot token for testing.
    process.env.SLACK_BOT_TOKEN = 'dummy-slack-token';
    postMessageMock.mockClear();
    joinMock.mockClear();
    historyMock.mockClear();
  });

  afterEach(() => {
    delete process.env.SLACK_BOT_TOKEN;
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
    // Ensure that after joining, a welcome message is sent.
    expect(postMessageMock).toHaveBeenCalled();
  });

  it('should fetch messages from a channel', async () => {
    const slackService = SlackService.getInstance();
    const channel = 'C123456';
    const dummyMessages = [{ text: 'Test message' }];
    (historyMock as jest.Mock).mockResolvedValue({ messages: dummyMessages });
    const messages = await slackService.fetchMessages(channel);
    expect(historyMock).toHaveBeenCalledWith({ channel });
    expect(messages).toEqual(dummyMessages);
  });
});
