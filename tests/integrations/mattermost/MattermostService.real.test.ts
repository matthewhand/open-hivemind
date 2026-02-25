import { MattermostService } from '../../../packages/adapter-mattermost/src/MattermostService';

const REAL_MATTERMOST_URL = process.env.REAL_MATTERMOST_URL;
const REAL_MATTERMOST_TOKEN = process.env.REAL_MATTERMOST_TOKEN;
const REAL_MATTERMOST_CHANNEL = process.env.REAL_MATTERMOST_CHANNEL;

jest.unmock('@src/config/BotConfigurationManager');

describe('Mattermost Real Integration', () => {
  let service: MattermostService;

  beforeAll(() => {
    if (!REAL_MATTERMOST_URL || !REAL_MATTERMOST_TOKEN || !REAL_MATTERMOST_CHANNEL) {
      console.log(
        'Skipping real Mattermost tests - set REAL_MATTERMOST_URL, REAL_MATTERMOST_TOKEN, REAL_MATTERMOST_CHANNEL'
      );
    }
  });

  beforeEach(() => {
    if (REAL_MATTERMOST_URL && REAL_MATTERMOST_TOKEN) {
      const { default: BotConfigurationManager } = require('@src/config/BotConfigurationManager');
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: () => [
          {
            name: 'test-bot',
            messageProvider: 'mattermost',
            mattermost: {
              serverUrl: REAL_MATTERMOST_URL,
              token: REAL_MATTERMOST_TOKEN,
              channel: REAL_MATTERMOST_CHANNEL,
            },
          },
        ],
      });

      service = MattermostService.getInstance();
    }
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
      (MattermostService as any).instance = undefined;
    }
    jest.restoreAllMocks();
  });

  it('should connect to real Mattermost', async () => {
    if (!REAL_MATTERMOST_URL || !REAL_MATTERMOST_TOKEN) return;

    await service.initialize();
    const bots = service.getBotNames();
    expect(bots.length).toBeGreaterThan(0);
  }, 30000);

  it('should send real message', async () => {
    if (!REAL_MATTERMOST_URL || !REAL_MATTERMOST_TOKEN || !REAL_MATTERMOST_CHANNEL) return;

    await service.initialize();
    const messageId = await service.sendMessageToChannel(
      REAL_MATTERMOST_CHANNEL,
      `Test message ${Date.now()}`
    );

    expect(messageId).toBeTruthy();
    expect(typeof messageId).toBe('string');
  }, 30000);

  it('should fetch real messages', async () => {
    if (!REAL_MATTERMOST_URL || !REAL_MATTERMOST_TOKEN || !REAL_MATTERMOST_CHANNEL) return;

    await service.initialize();
    const messages = await service.fetchMessages(REAL_MATTERMOST_CHANNEL, 5);

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(0);
  }, 30000);
});
