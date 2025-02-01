import { SlackService } from '@integrations/slack/SlackService';

// Set a dummy token for tests
process.env.SLACK_BOT_TOKEN = 'dummy-token';

describe('SlackService', () => {
  let slackService: SlackService;

  beforeEach(() => {
    slackService = SlackService.getInstance();
  });

  it('should send a message to the specified channel', async () => {
    const channelId = 'general';
    const message = 'Hello from Slack!';
    // Provide a dummy resolved value (undefined)
    const sendSpy = jest.spyOn(slackService, 'sendMessage').mockResolvedValue(undefined);
    
    await slackService.sendMessage(channelId, message);
    expect(sendSpy).toHaveBeenCalledWith(channelId, message);
    
    sendSpy.mockRestore();
  });

  it('should fetch messages from a channel', async () => {
    const channelId = 'general';
    const testMessages = [{ text: 'Test message from Slack' }];
    const fetchSpy = jest.spyOn(slackService, 'fetchMessages').mockResolvedValue(testMessages);
    
    const messages = await slackService.fetchMessages(channelId);
    expect(messages).toEqual(testMessages);
    
    fetchSpy.mockRestore();
  });
});
