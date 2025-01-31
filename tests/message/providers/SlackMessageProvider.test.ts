import { SlackMessageProvider } from '@message/providers/SlackMessageProvider';
import { SlackService } from '@integrations/slack/SlackService';

jest.mock('@integrations/slack/SlackService'); // Mock Slack API service

describe('SlackMessageProvider', () => {
  let slackProvider: SlackMessageProvider;
  let slackServiceMock: jest.Mocked<SlackService>;

  beforeEach(() => {
    slackServiceMock = new SlackService() as jest.Mocked<SlackService>;
    slackServiceMock.sendMessage = jest.fn().mockResolvedValue(undefined);
    slackServiceMock.fetchMessages = jest.fn().mockResolvedValue([{ text: 'Hello from Slack' }]);

    slackProvider = new SlackMessageProvider();
    (slackProvider as any).slackService = slackServiceMock; // Inject mock service
  });

  test('should be instantiated properly', () => {
    expect(slackProvider).toBeInstanceOf(SlackMessageProvider);
  });

  test('should send a message via SlackService', async () => {
    await slackProvider.sendMessage('general', 'Hello Slack!');
    expect(slackServiceMock.sendMessage).toHaveBeenCalledWith('general', 'Hello Slack!');
  });

  test('should fetch messages via SlackService', async () => {
    const messages = await slackProvider.getMessages('general');
    expect(messages).toEqual([{ text: 'Hello from Slack' }]);
  });

  test('should return the correct client ID', () => {
    expect(slackProvider.getClientId()).toBe('slack-bot');
  });
});
