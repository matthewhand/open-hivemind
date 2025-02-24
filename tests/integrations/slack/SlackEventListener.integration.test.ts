require('dotenv').config();
import { SlackService } from '@integrations/slack/SlackService';
import SlackMessage from '@integrations/slack/SlackMessage';

describe('SlackEventListener Integration', () => {
  const botToken = process.env.SLACK_BOT_TOKEN;

  beforeAll(() => {
    if (!botToken || !botToken.startsWith('xoxb-')) {
      console.log('Skipping SlackEventListener integration tests: Valid SLACK_BOT_TOKEN (xoxb-...) not provided');
      return;
    }
  });

  let service: SlackService;

  beforeEach(async () => {
    if (!botToken || !botToken.startsWith('xoxb-')) return;
    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    await service.initialize();
    service.setMessageHandler(async (message: SlackMessage) => {
      console.log('Received message:', message.getText());
      return `Echo: ${message.getText()}`;
    });
  });

  afterEach(async () => {
    if (!botToken || !botToken.startsWith('xoxb-')) return;
    await service.shutdown();
  });

  (botToken && botToken.startsWith('xoxb-') ? it : it.skip)('handles message event', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    const ts = await service.sendMessageToChannel(channelId, 'Test event', 'User');
    expect(ts).toBeDefined();
    const messages = await service.fetchMessages(channelId);
    const echo = messages.find((m: SlackMessage) => m.getText().includes('Echo: Test event'));
    expect(echo).toBeDefined();
  });
});
