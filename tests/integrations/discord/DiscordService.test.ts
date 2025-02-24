jest.resetModules();

import { Discord } from '@integrations/discord/DiscordService';

jest.mock('discord.js', () => ({
  Client: jest.fn(() => ({
    on: jest.fn(),
    login: jest.fn().mockResolvedValue(undefined),
    user: { id: 'bot1', tag: 'Madgwick AI#1234' },
    destroy: jest.fn(),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildVoiceStates: 8,
  },
}));

jest.mock('@config/messageConfig', () => ({
  default: {
    get: jest.fn((key) => (key === 'MESSAGE_USERNAME_OVERRIDE' ? 'Madgwick AI' : undefined)),
  },
}));

jest.mock('@config/discordConfig', () => ({
  default: {
    get: jest.fn((key) => (key === 'DISCORD_MESSAGE_HISTORY_LIMIT' ? 10 : undefined)),
  },
}));

describe('DiscordService', () => {
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.DISCORD_USERNAME_OVERRIDE;
    process.env.DISCORD_BOT_TOKEN = 'token1';
    service = Discord.DiscordService.getInstance();
    await service.shutdown();
    service = Discord.DiscordService.getInstance();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  xit('initializes correctly', async () => {
    await service.initialize();
    expect(service.getAllBots()).toHaveLength(1);
  });
});
