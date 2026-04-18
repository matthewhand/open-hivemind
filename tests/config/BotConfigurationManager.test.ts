import * as path from 'path';
import fs from 'fs';
import BotConfigurationManager from '../../src/config/BotConfigurationManager';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('BotConfigurationManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    
    // Clear any BOTS related env vars
    Object.keys(originalEnv).forEach(key => {
      if (key.startsWith('BOTS')) {
        delete process.env[key];
      }
    });

    // Default fs mocks
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.readFileSync.mockImplementation((p) => {
      throw new Error(`File not found: ${p}`);
    });

    // Reset singleton instance
    BotConfigurationManager.resetInstance();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Multi-bot configuration with BOTS prefix', () => {
    it('should load multiple bots from environment variables', () => {
      process.env.BOTS = 'alpha,beta';
      process.env.BOTS_ALPHA_DISCORD_BOT_TOKEN = 'token-alpha';
      process.env.BOTS_BETA_DISCORD_BOT_TOKEN = 'token-beta';

      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();

      expect(bots.length).toBe(2);
      expect(manager.getBot('alpha')?.discord?.token).toBe('token-alpha');
      expect(manager.getBot('beta')?.discord?.token).toBe('token-beta');
    });

    it('should load bot-specific configurations', () => {
      process.env.BOTS = 'testbot';
      process.env.BOTS_TESTBOT_DISCORD_BOT_TOKEN = 'discord-token-789';
      process.env.BOTS_TESTBOT_MESSAGE_PROVIDER = 'discord';
      process.env.BOTS_TESTBOT_DISCORD_CHANNEL_ID = 'channel-789';

      const manager = BotConfigurationManager.getInstance();
      const bot = manager.getBot('testbot');

      expect(bot).toBeDefined();
      expect(bot?.discord?.token).toBe('discord-token-789');
      expect(bot?.discord?.channelId).toBe('channel-789');
    });

    it('should discover bots from env vars even if BOTS is not set', () => {
      process.env.BOTS_AUTO_DISCORD_BOT_TOKEN = 'auto-token-123';

      const manager = BotConfigurationManager.getInstance();
      const bot = manager.getBot('auto');

      expect(bot).toBeDefined();
      expect(bot?.discord?.token).toBe('auto-token-123');
    });
  });

  describe('Legacy configuration compatibility', () => {
    it('should load legacy comma-separated tokens', () => {
      process.env.DISCORD_BOT_TOKEN = 'token1,token2,token3';
      process.env.OPENAI_API_KEY = 'legacy-openai-key';

      const manager = BotConfigurationManager.getInstance();
      const discordBots = manager.getDiscordBotConfigs();

      expect(discordBots.length).toBe(3);
      expect(discordBots[0].discord?.token).toBe('token1');
      expect(discordBots[1].discord?.token).toBe('token2');
      expect(discordBots[2].discord?.token).toBe('token3');
    });
  });

  describe('File-based configuration', () => {
    it('should load bot-specific configuration files', () => {
      const botName = 'filebot';
      const configDir = '/tmp';
      const botsDir = path.join(configDir, 'bots');
      const botConfigPath = path.join(botsDir, `${botName}.json`);

      // Set environment variable BEFORE anything else
      process.env.NODE_CONFIG_DIR = configDir;
      BotConfigurationManager.resetInstance();

      mockFs.existsSync.mockImplementation((p: any) => {
        if (p === botsDir) return true;
        if (p === botConfigPath) return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: any) => {
        if (p === botsDir) return [`${botName}.json`] as any;
        return [];
      });

      const fileConfig = {
        name: 'File Bot',
        BOT_ID: botName,
        MESSAGE_PROVIDER: 'discord',
        DISCORD_BOT_TOKEN: 'file-token-123',
        LLM_PROVIDER: 'openai',
        OPENAI_API_KEY: 'file-openai-key',
      };

      mockFs.readFileSync.mockImplementation((p: any) => {
        if (p === botConfigPath) return JSON.stringify(fileConfig);
        throw new Error(`File not found: ${p}`);
      });

      const manager = BotConfigurationManager.getInstance();

      // The manager normalizes names to lower-case and dashes
      const bot = manager.getBot('filebot');

      expect(bot).toBeDefined();
      expect(bot?.name).toBe('File Bot');
      expect(bot?.discord?.token).toBe('file-token-123');
      expect(bot?.llmProvider).toBe('openai');
    });
  });
});
