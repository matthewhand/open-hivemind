import Debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';
import { BotConfigCache } from './BotConfigCache';
import { BotConfigValidator } from './BotConfigValidator';
import { BotConfigLoader } from './BotConfigLoader';

import type {
  BotConfig,
  LlmProvider,
  ConfigurationValidationResult,
} from '@src/types/config';

const debug = Debug('app:BotConfigurationManager');

export class BotConfigurationManager {
  private static instance: BotConfigurationManager;
  private bots = new Map<string, BotConfig>();
  private legacyMode = false;
  private warnings: string[] = [];

  private configCache = new BotConfigCache(30000);
  private validator = new BotConfigValidator();
  private loader = new BotConfigLoader(this.configCache);

  public constructor() {
    this.loadConfiguration();
  }

  /**
   * Gets the singleton instance of BotConfigurationManager.
   */
  public static getInstance(): BotConfigurationManager {
    if (!BotConfigurationManager.instance) {
      BotConfigurationManager.instance = new BotConfigurationManager();
    }
    return BotConfigurationManager.instance;
  }

  /**
   * Load configuration from environment variables and config files
   */
  private loadConfiguration(): void {
    this.bots.clear();
    this.warnings = [];

    const botsEnv = process.env.BOTS;

    const discoveredBots = this.loader.discoverBotNamesFromEnv();
    const fileBots = this.loader.discoverBotNamesFromFiles();

    const explicitBots = botsEnv ? botsEnv.split(',').map((n) => n.trim()).filter(Boolean) : [];
    const canonical = (n: string): string => String(n || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

    const byCanonical = new Map<string, string>();
    for (const name of discoveredBots) {
      byCanonical.set(canonical(name), name);
    }
    for (const name of fileBots) {
      byCanonical.set(canonical(name), name);
    }
    for (const name of explicitBots) {
      byCanonical.set(canonical(name), name);
    }
    const allBotNames = Array.from(byCanonical.values());

    if (allBotNames.length > 0) {
      debug(`Loading multi-bot configuration for: ${allBotNames.join(', ')}`);
      for (const botName of allBotNames) {
        const config = this.loader.createBotConfig(botName, this.warnings);
        if (config) {
          this.bots.set(botName, config);
        }
      }
    }

    debug('Checking for legacy configuration (Dual Mode)');
    this.loadLegacyConfiguration();

    this.validateConfigurationInternal();
  }

  /**
   * Load legacy configuration for backward compatibility
   */
  private loadLegacyConfiguration(): void {
    const legacyTokens = process.env.DISCORD_BOT_TOKEN;

    if (legacyTokens && legacyTokens.trim()) {
      debug('Loading legacy configuration from DISCORD_BOT_TOKEN');
      this.legacyMode = true;

      const tokens = legacyTokens.split(',').map(token => token.trim());

      tokens.forEach((token, index) => {
        const botName = `Bot${index + 1}`;
        const config: BotConfig = {
          name: botName,
          messageProvider: 'discord',
          llmProvider: this.loader.detectLegacyLlmProvider() as LlmProvider,
          discord: {
            token,
            clientId: process.env.DISCORD_CLIENT_ID,
            guildId: process.env.DISCORD_GUILD_ID,
            channelId: process.env.DISCORD_CHANNEL_ID,
            voiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID,
          },
        };

        if (config.llmProvider === 'openai' && process.env.OPENAI_API_KEY) {
          config.openai = {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4',
            baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            systemPrompt: process.env.OPENAI_SYSTEM_PROMPT || '',
          };
        } else if (config.llmProvider === 'flowise' && process.env.FLOWISE_API_KEY) {
          config.flowise = {
            apiKey: process.env.FLOWISE_API_KEY,
            apiBaseUrl: process.env.FLOWISE_API_BASE_URL || 'http://localhost:3000/api/v1',
          };
        } else if (config.llmProvider === 'openwebui' && process.env.OPENWEBUI_API_KEY) {
          config.openwebui = {
            apiKey: process.env.OPENWEBUI_API_KEY,
            apiUrl: process.env.OPENWEBUI_API_URL || 'http://localhost:3000/api/',
          };
        } else if (config.llmProvider === 'openswarm') {
          config.openswarm = {
            baseUrl: process.env.OPENSWARM_BASE_URL || 'http://localhost:8000/v1',
            apiKey: process.env.OPENSWARM_API_KEY || 'dummy-key',
            team: process.env.OPENSWARM_TEAM || 'default-team',
          };
        }

        this.bots.set(botName, config);
      });
    }
  }

  private validateConfigurationInternal(): void {
    const hasBotsConfig = !!process.env.BOTS;
    const hasLegacyConfig = !!process.env.DISCORD_BOT_TOKEN;

    if (hasBotsConfig && hasLegacyConfig) {
      debug('Both BOTS and DISCORD_BOT_TOKEN environment variables are set. Dual mode enabled.');
      this.warnings.push('Both BOTS and DISCORD_BOT_TOKEN environment variables are set. Dual mode enabled.');
    }

    if (this.bots.size === 0) {
      debug('No bot configuration found');
      this.warnings.push('No bot configuration found');
    }
  }

  /**
   * Gets all configured bot instances.
   */
  public getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get Discord-specific bot configurations
   */
  public getDiscordBotConfigs(): BotConfig[] {
    return Array.from(this.bots.values()).filter(bot =>
      bot.messageProvider === 'discord' && bot.discord?.token,
    );
  }

  /**
   * Gets a specific bot configuration by name.
   */
  public getBot(name: string): BotConfig | undefined {
    return this.bots.get(name);
  }

  /**
   * Check if running in legacy mode
   */
  public isLegacyMode(): boolean {
    return this.legacyMode;
  }

  /**
   * Get configuration warnings
   */
  public getWarnings(): string[] {
    return [...this.warnings];
  }

  public async addBot(config: BotConfig): Promise<void> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const botsDir = path.join(configDir, 'bots');

    const safeName = config.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filePath = path.join(botsDir, `${safeName}.json`);

    try {
      await fs.promises.access(filePath);
      throw new Error(`Bot with defined filename ${safeName}.json already exists`);
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }

    try {
      await fs.promises.access(botsDir);
    } catch {
      await fs.promises.mkdir(botsDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, JSON.stringify(config, null, 2));
    this.configCache.invalidate(filePath);

    this.reload();
  }

  /**
   * Clone a bot configuration
   */
  public async cloneBot(name: string, newName: string): Promise<BotConfig> {
    const originalBot = this.bots.get(name);
    if (!originalBot) {
      throw new Error(`Bot "${name}" not found`);
    }

    const config = JSON.parse(JSON.stringify(originalBot));
    config.name = newName;

    if (typeof config === 'object' && config !== null && '_updatedAt' in config) {
      delete (config as Record<string, unknown>)._updatedAt;
    }

    await this.addBot(config);

    const newBot = this.bots.get(newName);
    if (!newBot) {
      throw new Error(`Failed to retrieve cloned bot "${newName}" after creation`);
    }
    return newBot;
  }

  /**
   * Update an existing bot configuration
   */
  public async updateBot(name: string, updates: Record<string, unknown>): Promise<void> {
    const existingBot = this.bots.get(name);
    if (!existingBot) {
      throw new Error(`Bot "${name}" not found`);
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const botsDir = path.join(configDir, 'bots');
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filePath = path.join(botsDir, `${safeName}.json`);

    let currentConfig: Record<string, unknown> = {};

    try {
      const cached = this.configCache.get(filePath);
      if (cached) {
        currentConfig = cached;
      } else {
        const data = await fs.promises.readFile(filePath, 'utf8');
        currentConfig = JSON.parse(data);
        this.configCache.set(filePath, currentConfig);
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        debug(`Failed to read existing bot config ${filePath}: ${e}`);
      }
    }

    const mergedConfig = {
      ...currentConfig,
      ...updates,
      name,
      _updatedAt: new Date().toISOString(),
    };

    try {
      await fs.promises.access(botsDir);
    } catch {
      await fs.promises.mkdir(botsDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, JSON.stringify(mergedConfig, null, 2));
    this.configCache.invalidate(filePath);
    debug(`Updated bot config for ${name} at ${filePath}`);

    this.reload();
  }

  /**
   * Delete a bot configuration
   */
  public async deleteBot(name: string): Promise<void> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const botsDir = path.join(configDir, 'bots');
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filePath = path.join(botsDir, `${safeName}.json`);

    try {
      await fs.promises.access(filePath);
      await fs.promises.unlink(filePath);
      debug(`Deleted bot config for ${name} at ${filePath}`);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        const envBotNames = this.loader.discoverBotNamesFromEnv();
        const canonical = (n: string): string => String(n || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
        const canonicalName = canonical(name);

        const foundInEnv = envBotNames.some((n) => canonical(n) === canonicalName);

        if (foundInEnv) {
          throw new Error(
            `Cannot delete bot "${name}" defined by environment variables. Please remove the environment variables starting with BOTS_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_...`
          );
        } else {
          throw new Error(`Bot "${name}" not found`);
        }
      } else {
        throw e;
      }
    }

    this.reload();
  }

  /**
   * Reload configuration
   */
  public reload(): void {
    this.loadConfiguration();
  }

  /**
   * Validate configuration
   */
  public validateConfiguration(config: unknown): ConfigurationValidationResult {
    return this.validator.validateConfiguration(config);
  }

  /**
   * Merge configurations
   */
  public mergeConfigurations(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
    return { ...base, ...override };
  }

  /**
   * Sanitize configuration
   */
  public sanitizeConfiguration(config: Record<string, unknown>): Record<string, unknown> {
    return this.validator.sanitizeConfiguration(config);
  }
}

export default BotConfigurationManager;
