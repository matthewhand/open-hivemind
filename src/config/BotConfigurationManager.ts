import Debug from 'debug';
import { UserConfigStore } from './UserConfigStore';
import { discoverBotNamesFromEnv, discoverBotNamesFromFiles } from './botDiscovery';
import { createBotConfig } from './botConfigFactory';
import { loadLegacyBots } from './botLegacyConfig';
import { addBotToFile, updateBotOnFile, deleteBotFromFile } from './botCrudOperations';
import { validateBotConfiguration, mergeConfigurations, sanitizeConfiguration } from './botValidation';

import type {
  BotConfig,
  ConfigurationValidationResult,
} from '@src/types/config';
import { TTLCache } from '../utils/TTLCache';

const debug = Debug('app:BotConfigurationManager');

// BotConfig interface is now imported from @src/types/config

export class BotConfigurationManager {
  private static instance: BotConfigurationManager;
  private bots = new Map<string, BotConfig>();
  private legacyMode = false;
  private warnings: string[] = [];
  private userConfigStore = UserConfigStore.getInstance();
  private configCache = new TTLCache<string, Record<string, unknown>>(30000, 'BotConfigCache');

  public constructor() {
    this.loadConfiguration();
  }

  /**
   * Gets the singleton instance of BotConfigurationManager.
   *
   * @returns {BotConfigurationManager} The singleton instance
   * @example
   * ```typescript
   * const manager = BotConfigurationManager.getInstance();
   * const botConfig = manager.getBot('my-bot');
   * ```
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

    // Check for new BOTS configuration and Auto-Discovery
    const botsEnv = process.env.BOTS;

    // Auto-discover unique bot names from BOTS_ prefixes
    const discoveredBots = discoverBotNamesFromEnv();
    const fileBots = discoverBotNamesFromFiles();

    // Merge explicit list with discovered list
    const explicitBots = botsEnv ? botsEnv.split(',').map((n) => n.trim()).filter(Boolean) : [];
    const canonical = (n: string): string => String(n || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

    // Deduplicate bots while preferring explicitly listed names from BOTS.
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
        const config = createBotConfig(botName, this.warnings, this.configCache, this.userConfigStore);
        if (config) {
          this.bots.set(botName, config);
        }
      }
    }

    // Always check for legacy configuration to support dual mode
    debug('Checking for legacy configuration (Dual Mode)');
    this.loadLegacyConfiguration();

    // Validate configuration
    this.validateConfigurationInternal();
  }

  /**
   * Load legacy configuration for backward compatibility
   */
  private loadLegacyConfiguration(): void {
    const { bots, legacyMode } = loadLegacyBots();
    if (legacyMode) {
      this.legacyMode = true;
      for (const [name, config] of bots) {
        this.bots.set(name, config);
      }
    }
  }

  /**
   * Check for configuration conflicts and issue warnings
   */
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
   *
   * @returns {BotConfig[]} Array of all bot configurations
   * @example
   * ```typescript
   * const bots = manager.getAllBots();
   * bots.forEach(bot => console.log(bot.name));
   * ```
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
   *
   * @param {string} name - The name of the bot to retrieve
   * @returns {BotConfig | undefined} The bot configuration or undefined if not found
   * @example
   * ```typescript
   * const bot = manager.getBot('my-bot');
   * if (bot) {
   *   console.log(bot.get('MESSAGE_PROVIDER'));
   * }
   * ```
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
    await addBotToFile(config, this.configCache);

    // Reload to pick up new bot
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

    // Deep clone the configuration to avoid reference issues
    const config = JSON.parse(JSON.stringify(originalBot));
    config.name = newName;

    // Remove internal properties if any (e.g., _updatedAt)
    if (typeof config === 'object' && config !== null && '_updatedAt' in config) {
      delete (config as Record<string, unknown>)._updatedAt;
    }

    // Add the new bot (this will validate and save it)
    await this.addBot(config);

    // Return the new bot config (reload happens inside addBot)
    // Note: Since reload is synchronous/in-memory update in addBot -> reload -> loadConfiguration,
    // this.bots should have the new bot.
    const newBot = this.bots.get(newName);
    if (!newBot) {
      throw new Error(`Failed to retrieve cloned bot "${newName}" after creation`);
    }
    return newBot;
  }

  /**
   * Update an existing bot configuration
   * For env-var bots, this creates/updates a JSON override file
   */
  public async updateBot(name: string, updates: Record<string, unknown>): Promise<void> {
    const existingBot = this.bots.get(name);
    if (!existingBot) {
      throw new Error(`Bot "${name}" not found`);
    }

    await updateBotOnFile(name, updates, this.configCache);

    // Reload to apply changes
    this.reload();
  }

  /**
   * Delete a bot configuration
   */
  public async deleteBot(name: string): Promise<void> {
    await deleteBotFromFile(name);

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
    return validateBotConfiguration(config);
  }

  /**
   * Merge configurations
   */
  public mergeConfigurations(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
    return mergeConfigurations(base, override);
  }

  /**
   * Sanitize configuration
   */
  public sanitizeConfiguration(config: Record<string, unknown>): Record<string, unknown> {
    return sanitizeConfiguration(config);
  }
}

export default BotConfigurationManager;
