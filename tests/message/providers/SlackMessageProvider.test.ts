import { SlackMessageProvider } from '@message/providers/SlackMessageProvider';
import { SlackService } from '@integrations/slack/SlackService';

const slackServiceMock = {
  sendMessage: jest.fn(),
  fetchMessages: jest.fn(() => Promise.resolve([{ text: 'Hello from Slack' }])),
};

jest.mock('@integrations/slack/SlackService', () => {
  return {
    SlackService: {
      getInstance: jest.fn(() => slackServiceMock),
    },
  };
});

describe('SlackMessageProvider', () => {
  let provider: SlackMessageProvider;

  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = 'mock-token'; // ✅ Ensure token exists

    // Reset mocks before each test
    slackServiceMock.sendMessage.mockClear();
    slackServiceMock.fetchMessages.mockClear();

    provider = new SlackMessageProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should send a message via SlackService', async () => {
    await provider.sendMessage('general', 'Hello Slack!');
    expect(slackServiceMock.sendMessage).toHaveBeenCalledWith('general', 'Hello Slack!');
  });

  test('should fetch messages from SlackService', async () => {
    const messages = await provider.getMessages('general');
    expect(messages).toEqual([{ text: 'Hello from Slack' }]);
    expect(slackServiceMock.fetchMessages).toHaveBeenCalledWith('general');
  });
});
