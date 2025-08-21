// Clear all mocks and reset modules for real integration test
jest.resetModules();
jest.clearAllMocks();
jest.unmock('discord.js');

// Import after unmocking
const { Discord } = require('@src/integrations/discord/DiscordService');

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN?.split(',')[0];
const DISCORD_CHANNEL = process.env.DISCORD_CHANNEL_ID;

describe('Discord Real Integration', () => {
  let service: any;

  beforeAll(() => {
    if (!DISCORD_TOKEN || !DISCORD_CHANNEL) {
      console.log('Skipping real Discord tests - DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID not found');
    }
  });

  beforeEach(() => {
    if (DISCORD_TOKEN) {
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
    if (!DISCORD_TOKEN) return;

    await service.initialize();
    expect(service.getAllBots()).toHaveLength(1);
  }, 30000);

  it('should send real message', async () => {
    if (!DISCORD_TOKEN || !DISCORD_CHANNEL) return;

    await service.initialize();
    const messageId = await service.sendMessageToChannel(
      DISCORD_CHANNEL, 
      `Test message ${Date.now()}`
    );
    
    expect(messageId).toBeTruthy();
    expect(typeof messageId).toBe('string');
  }, 30000);

  it('should fetch real messages', async () => {
    if (!DISCORD_TOKEN || !DISCORD_CHANNEL) return;

    await service.initialize();
    const messages = await service.fetchMessages(DISCORD_CHANNEL, 5);
    
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(0);
  }, 30000);
});