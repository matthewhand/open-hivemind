import { BotConfigurationManager, BotConfig } from '../../src/config/BotConfigurationManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('BotConfigurationManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Preserve original env and replace with a clean slate.
    // Set NODE_CONFIG_DIR to /tmp so discoverBotNamesFromFiles() finds no
    // demo bots from the real config/bots/ directory.
    originalEnv = { ...process.env };
    process.env = {
      NODE_CONFIG_DIR: '/tmp',
    };

    // Reset singleton instance so each test starts fresh
    (BotConfigurationManager as any).instance = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Multi-bot configuration with BOTS prefix', () => {
    it('should load multiple bots from BOTS environment variable', () => {
      process.env.BOTS = 'max,sam';
      process.env.BOTS_MAX_DISCORD_BOT_TOKEN = 'max-token-123';
      process.env.BOTS_MAX_MESSAGE_PROVIDER = 'discord';
      process.env.BOTS_MAX_LLM_PROVIDER = 'flowise';
      process.env.BOTS_MAX_FLOWISE_API_KEY = 'max-flowise-key';

      process.env.BOTS_SAM_DISCORD_BOT_TOKEN = 'sam-token-456';
      process.env.BOTS_SAM_MESSAGE_PROVIDER = 'discord';
      process.env.BOTS_SAM_LLM_PROVIDER = 'openai';
      process.env.BOTS_SAM_OPENAI_API_KEY = 'sam-openai-key';

      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();

      expect(bots).toHaveLength(2);
      expect(bots[0].name).toBe('max');
      expect(bots[0].messageProvider).toBe('discord');
      expect(bots[0].llmProvider).toBe('flowise');
      expect(bots[0].discord?.token).toBe('max-token-123');

      expect(bots[1].name).toBe('sam');
      expect(bots[1].messageProvider).toBe('discord');
      expect(bots[1].llmProvider).toBe('openai');
      expect(bots[1].discord?.token).toBe('sam-token-456');
    });

    it('should load Discord-specific configurations', () => {
      process.env.BOTS = 'testbot';
      process.env.BOTS_TESTBOT_DISCORD_BOT_TOKEN = 'discord-token-789';
      process.env.BOTS_TESTBOT_MESSAGE_PROVIDER = 'discord';
      process.env.BOTS_TESTBOT_LLM_PROVIDER = 'flowise';
      process.env.BOTS_TESTBOT_DISCORD_CLIENT_ID = 'client-123';
      process.env.BOTS_TESTBOT_DISCORD_GUILD_ID = 'guild-456';
      process.env.BOTS_TESTBOT_DISCORD_CHANNEL_ID = 'channel-789';

      const manager = BotConfigurationManager.getInstance();
      const discordBots = manager.getDiscordBotConfigs();

      expect(discordBots).toHaveLength(1);
      expect(discordBots[0].name).toBe('testbot');
      expect(discordBots[0].discord?.token).toBe('discord-token-789');
      expect(discordBots[0].discord?.clientId).toBe('client-123');
      expect(discordBots[0].discord?.guildId).toBe('guild-456');
      expect(discordBots[0].discord?.channelId).toBe('channel-789');
    });

    it('should load bot-specific configuration files', () => {
      const botName = 'filebot';
      const configDir = 'config';
      const botsDir = `${configDir}/bots`;
      const botConfigPath = `${botsDir}/${botName}.json`;

      mockFs.existsSync.mockImplementation((path) => {
        if (path === botsDir) return true;
        if (path === botConfigPath) return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((path) => {
        if (path === botsDir) return [`${botName}.json`] as any;
        return [];
      });

      const fileConfig = {
        DISCORD_BOT_TOKEN: 'file-token-123',
        MESSAGE_PROVIDER: 'discord',
        LLM_PROVIDER: 'openai',
        OPENAI_API_KEY: 'file-openai-key',
      };

      mockFs.readFileSync.mockImplementation((path) => {
        if (path === botConfigPath) return JSON.stringify(fileConfig);
        throw new Error(`File not found: ${path}`);
      });

      process.env.NODE_CONFIG_DIR = configDir;
      const manager = BotConfigurationManager.getInstance();
      const bot = manager.getBot(botName);

      expect(bot).toBeDefined();
      expect(bot?.name).toBe(botName);
      expect(bot?.discord?.token).toBe('file-token-123');
      expect(bot?.llmProvider).toBe('openai');
      expect(bot?.openai?.apiKey).toBe('file-openai-key');
    });
  });

  describe('Legacy configuration compatibility', () => {
    it('should load legacy comma-separated tokens', () => {
      process.env.DISCORD_BOT_TOKEN = 'token1,token2,token3';
      process.env.OPENAI_API_KEY = 'legacy-openai-key';

      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();

      expect(bots).toHaveLength(3);
      expect(bots[0].name).toBe('Bot1');
      expect(bots[0].discord?.token).toBe('token1');
      expect(bots[0].llmProvider).toBe('openai');

      expect(bots[1].name).toBe('Bot2');
      expect(bots[1].discord?.token).toBe('token2');

      expect(bots[2].name).toBe('Bot3');
      expect(bots[2].discord?.token).toBe('token3');
    });

    it('should detect Flowise as default LLM provider', () => {
      process.env.DISCORD_BOT_TOKEN = 'single-token';
      process.env.FLOWISE_API_KEY = 'flowise-key';

      const manager = BotConfigurationManager.getInstance();
      const bot = manager.getBot('Bot1');

      expect(bot?.llmProvider).toBe('flowise');
    });

    it('should detect OpenWebUI as LLM provider', () => {
      process.env.DISCORD_BOT_TOKEN = 'single-token';
      process.env.OPENWEBUI_API_KEY = 'openwebui-key';

      const manager = BotConfigurationManager.getInstance();
      const bot = manager.getBot('Bot1');

      expect(bot?.llmProvider).toBe('openwebui');
    });
  });

  describe('Configuration validation and warnings', () => {
    it('should issue warning when both BOTS and legacy config are present', () => {
      process.env.BOTS = 'max';
      process.env.BOTS_MAX_DISCORD_BOT_TOKEN = 'max-token';
      process.env.DISCORD_BOT_TOKEN = 'legacy-token';

      const manager = BotConfigurationManager.getInstance();
      const warnings = manager.getWarnings();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Both BOTS and DISCORD_BOT_TOKEN');
    });

    it('should return empty array when no bots configured', () => {
      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();

      expect(bots).toHaveLength(0);
    });

    it('should handle empty bot names in BOTS variable', () => {
      process.env.BOTS = 'max,,sam,';
      process.env.BOTS_MAX_DISCORD_BOT_TOKEN = 'max-token';
      process.env.BOTS_SAM_DISCORD_BOT_TOKEN = 'sam-token';

      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();

      expect(bots).toHaveLength(2);
      expect(bots.map((b: BotConfig) => b.name)).toEqual(['max', 'sam']);
    });
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BotConfigurationManager.getInstance();
      const instance2 = BotConfigurationManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should reload configuration', () => {
      process.env.BOTS = 'reload-bot';
      process.env.BOTS_RELOAD_BOT_DISCORD_BOT_TOKEN = 'reload-token';

      const manager = BotConfigurationManager.getInstance();
      expect(manager.getAllBots()).toHaveLength(1);

      process.env.BOTS = 'reload-bot,new-bot';
      process.env.BOTS_NEW_BOT_DISCORD_BOT_TOKEN = 'new-token';

      manager.reload();
      expect(manager.getAllBots()).toHaveLength(2);
    });
  });
});
