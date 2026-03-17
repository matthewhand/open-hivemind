import { SlackService } from '../../../packages/adapter-slack/src/SlackService';

const REAL_SLACK_TOKEN = process.env.REAL_SLACK_TOKEN;
const REAL_SLACK_CHANNEL = process.env.REAL_SLACK_CHANNEL;
const REAL_SLACK_SIGNING_SECRET = process.env.REAL_SLACK_SIGNING_SECRET;

describe('Slack Real Integration', () => {
  let service: SlackService;

  beforeAll(() => {
    if (!REAL_SLACK_TOKEN || !REAL_SLACK_CHANNEL || !REAL_SLACK_SIGNING_SECRET) {
      console.log(
        'Skipping real Slack tests - set REAL_SLACK_TOKEN, REAL_SLACK_CHANNEL, REAL_SLACK_SIGNING_SECRET'
      );
    }
  });

  beforeEach(async () => {
    if (REAL_SLACK_TOKEN) {
      service = SlackService.getInstance();
      await service.addBot({
        name: 'test-bot',
        slack: {
          botToken: REAL_SLACK_TOKEN,
          signingSecret: REAL_SLACK_SIGNING_SECRET,
        },
      });
    }
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
      (SlackService as any).instance = undefined;
    }
  });

  it('should connect to real Slack', async () => {
    if (!REAL_SLACK_TOKEN) return;

    await service.initialize();
    const bots = service.getAllBots();
    expect(bots.length).toBeGreaterThan(0);
  }, 30000);

  it('should send real message', async () => {
    if (!REAL_SLACK_TOKEN || !REAL_SLACK_CHANNEL) return;

    await service.initialize();
    const messageId = await service.sendMessageToChannel(
      REAL_SLACK_CHANNEL,
      `Test message ${Date.now()}`
    );

    expect(messageId).toBeTruthy();
    expect(typeof messageId).toBe('string');
  }, 30000);

  it('should fetch real messages', async () => {
    if (!REAL_SLACK_TOKEN || !REAL_SLACK_CHANNEL) return;

    await service.initialize();
    const messages = await service.fetchMessages(REAL_SLACK_CHANNEL, 5);

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(0);
  }, 30000);
});
