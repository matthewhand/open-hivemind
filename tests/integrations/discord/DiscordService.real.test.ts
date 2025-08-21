import { Discord } from '@src/integrations/discord/DiscordService';

const REAL_DISCORD_TOKEN = process.env.REAL_DISCORD_TOKEN;
const REAL_DISCORD_CHANNEL = process.env.REAL_DISCORD_CHANNEL;

describe('Discord Real Integration', () => {
  let service: any;

  beforeAll(() => {
    if (!REAL_DISCORD_TOKEN || !REAL_DISCORD_CHANNEL) {
      console.log('Skipping real Discord tests - set REAL_DISCORD_TOKEN and REAL_DISCORD_CHANNEL');
    }
  });

  beforeEach(() => {
    if (REAL_DISCORD_TOKEN) {
      process.env.DISCORD_BOT_TOKEN = REAL_DISCORD_TOKEN;
      service = Discord.DiscordService.getInstance();
    }
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
      (Discord.DiscordService as any).instance = undefined;
    }
  });

  it('should connect to real Discord', async () => {
    if (!REAL_DISCORD_TOKEN) return;

    await service.initialize();
    expect(service.getAllBots()).toHaveLength(1);
  }, 30000);

  it('should send real message', async () => {
    if (!REAL_DISCORD_TOKEN || !REAL_DISCORD_CHANNEL) return;

    await service.initialize();
    const messageId = await service.sendMessageToChannel(
      REAL_DISCORD_CHANNEL, 
      `Test message ${Date.now()}`
    );
    
    expect(messageId).toBeTruthy();
    expect(typeof messageId).toBe('string');
  }, 30000);

  it('should fetch real messages', async () => {
    if (!REAL_DISCORD_TOKEN || !REAL_DISCORD_CHANNEL) return;

    await service.initialize();
    const messages = await service.fetchMessages(REAL_DISCORD_CHANNEL, 5);
    
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(0);
  }, 30000);
});