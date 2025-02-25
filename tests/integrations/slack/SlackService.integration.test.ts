require('dotenv').config();
import { SlackService } from '@integrations/slack/SlackService';

describe('SlackService Integration', () => {
  const botToken = process.env.SLACK_BOT_TOKEN;

  beforeAll(() => {
    console.log('SLACK_BOT_TOKEN from process.env:', process.env.SLACK_BOT_TOKEN);
    if (!botToken || !botToken.startsWith('xoxb-')) {
      console.log('Skipping SlackService integration tests: Valid SLACK_BOT_TOKEN (xoxb-...) not provided');
      return;
    }
  });

  let service: SlackService;

  beforeEach(async () => {
    if (!botToken || !botToken.startsWith('xoxb-')) return;
    console.log('Initializing SlackService with token:', botToken.substring(0, 8) + '...');
    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    await service.initialize();
    const botInfo = service.getBotManager().getAllBots()[0];
    console.log('Bot Info after init:', { botUserId: botInfo.botUserId, botUserName: botInfo.botUserName });
  });

  afterEach(async () => {
    if (!botToken || !botToken.startsWith('xoxb-')) return;
    await service.shutdown();
  });

  (botToken && botToken.startsWith('xoxb-') ? it : it.skip)('sends message to channel', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    const result = await service.sendMessageToChannel(channelId, 'Test message', 'Madgwick AI');
    expect(result).toBeDefined();
  });

  (botToken && botToken.startsWith('xoxb-') ? it : it.skip)('fetches messages from channel', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    const messages = await service.fetchMessages(channelId);
    expect(Array.isArray(messages)).toBe(true);
  });

  (botToken && botToken.startsWith('xoxb-') ? it : it.skip)('gets client ID', async () => {
    const clientId = service.getClientId();
    console.log('Client ID:', clientId);
    expect(clientId).toMatch(/^B/);
  });

  (botToken && botToken.startsWith('xoxb-') ? it : it.skip)('gets default channel', async () => {
    const channel = service.getDefaultChannel();
    expect(channel).toBeDefined();
  });

  (botToken && botToken.startsWith('xoxb-') ? it : it.skip)('sends message with data to LLM', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    service.setMessageHandler(async (msg, history) => {
      console.log('SlackMessage Data:', JSON.stringify(msg.data));
      return 'Received';
    });
    const ts = await service.sendMessageToChannel(channelId, 'Test LLM', 'Madgwick AI');
    expect(ts).toBeDefined();
  });
});
