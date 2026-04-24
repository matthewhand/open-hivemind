import { promises as fs, readFileSync, existsSync } from 'fs';
import path from 'path';
import type { BotConfiguration } from '../database/DatabaseManager';
import type { BotOverride, MessageProvider, LlmProvider, McpServerConfig, McpGuardConfig } from '@src/types/config';
import Debug from 'debug';
import { SecureConfigManager } from './SecureConfigManager';

const debug = Debug('app:config:UserConfigStore');

interface ToolConfig {
  guards?: {
    ownerOnly?: boolean;
    allowedUsers?: string[];
  };
}

interface BotDisabledState {
  disabled: boolean;
  disabledAt?: string;
}

type GeneralSettings = Record<string, any>;

export class UserConfigStore {
  private static instance: UserConfigStore;
  private config: {
    toolSettings?: Record<string, ToolConfig>;
    bots?: BotConfiguration[];
    botDisabledStates?: Record<string, BotDisabledState>;
    generalSettings?: GeneralSettings;
  } = {};
  private get configPath(): string {
    return path.join(process.cwd(), 'config', 'user-config.json');
  }

  private botMap: Map<string, BotConfiguration> = new Map();

  public constructor() {
    // Load config synchronously for now to avoid async issues in constructor
    try {
      if (existsSync(this.configPath)) {
        const rawData = readFileSync(this.configPath, 'utf-8');

        // Detect if file is encrypted (contains multiple colon-separated segments and doesn't look like JSON)
        const isEncrypted = rawData.includes(':') && !rawData.trim().startsWith('{');

        if (isEncrypted) {
          const secureManager = SecureConfigManager.getInstanceSync();
          const decryptedData = secureManager.decrypt(rawData);
          this.config = JSON.parse(decryptedData);
        } else {
          debug('Loading legacy plain-text user configuration');
          this.config = JSON.parse(rawData);
          // Migration will happen on next async load or explicit save
        }
      } else {
        this.setDefaultConfig();
      }
    } catch (err) {
      debug('ERROR:', 'Failed to load user config synchronously:', err);
      this.setDefaultConfig();
    }
    this.initializeBotMap();
  }

  private setDefaultConfig(): void {
    this.config = {
      toolSettings: {},
      bots: [],
      botDisabledStates: {},
    };
  }

  /**
   * Initialize the internal bot map for O(1) lookups.
   */
  private initializeBotMap(): void {
    this.botMap.clear();
    if (this.config.bots) {
      for (const bot of this.config.bots) {
        if (bot.name) {
          this.botMap.set(bot.name, bot);
        }
      }
    }
  }

  public static getInstance(): UserConfigStore {
    if (!UserConfigStore.instance) {
      UserConfigStore.instance = new UserConfigStore();
    }
    return UserConfigStore.instance;
  }

  private async loadConfig(): Promise<void> {
    try {
      if (!existsSync(this.configPath)) {
        this.setDefaultConfig();
        return;
      }

      const rawData = await fs.readFile(this.configPath, 'utf-8');

      // Detect if file is encrypted (contains multiple colon-separated segments and doesn't look like JSON)
      const isEncrypted = rawData.includes(':') && !rawData.trim().startsWith('{');

      if (isEncrypted) {
        const secureManager = await SecureConfigManager.getInstance();
        const decryptedData = secureManager.decrypt(rawData);
        this.config = JSON.parse(decryptedData);
      } else {
        debug('Loading legacy plain-text user configuration (async)');
        this.config = JSON.parse(rawData);
        // Migrate to encrypted format immediately (only if encryption is enabled)
        const encryptionEnabled = process.env.DISABLE_ENCRYPTION !== 'true';
        if (encryptionEnabled) {
          await this.saveConfig();
        }
      }
    } catch (error) {
      debug('ERROR:', 'Failed to load user config:', error);
      this.setDefaultConfig();
    }
    this.initializeBotMap();
  }

  /**
   * Save the current configuration to disk.
   */
  public async saveConfig(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true });

      const dataToSave = JSON.stringify(this.config, null, 2);
      let finalData: string;

      // Allow disabling encryption for tests to simplify them
      const encryptionEnabled = process.env.DISABLE_ENCRYPTION !== 'true';

      if (encryptionEnabled) {
        const secureManager = await SecureConfigManager.getInstance();
        finalData = secureManager.encrypt(dataToSave);
        debug('User configuration saved (encrypted)');
      } else {
        finalData = dataToSave;
        debug('User configuration saved (plain-text)');
      }

      await fs.writeFile(this.configPath, finalData, 'utf-8');
    } catch (error) {
      debug('ERROR:', 'Failed to save user config:', error);
      throw error;
    }
  }

  /**
   * Check if a bot is disabled.
   * @param botName The name of the bot.
   * @returns true if bot is disabled, false otherwise.
   */
  public isBotDisabled(botName: string): boolean {
    return this.config.botDisabledStates?.[botName]?.disabled ?? false;
  }

  /**
   * Set bot disabled state and persist to config file.
   * @param botName The name of the bot.
   * @param disabled Whether the bot should be disabled.
   */
  public async setBotDisabled(botName: string, disabled: boolean): Promise<void> {
    if (!this.config.botDisabledStates) {
      this.config.botDisabledStates = {};
    }

    this.config.botDisabledStates[botName] = {
      disabled,
      disabledAt: disabled ? new Date().toISOString() : undefined,
    };

    const override = this.botMap.get(botName);
    if (override) {
      (override as BotConfiguration & { disabled?: boolean }).disabled = disabled;
    }

    await this.saveConfig();
  }

  /**
   * Get all disabled bot names.
   * @returns Array of disabled bot names.
   */
  public getDisabledBots(): string[] {
    if (!this.config.botDisabledStates) {
      return [];
    }
    return Object.entries(this.config.botDisabledStates)
      .filter(([_, state]) => state.disabled)
      .map(([name]) => name);
  }

  public getToolConfig(toolName: string): ToolConfig | undefined {
    return this.config.toolSettings?.[toolName];
  }

  public setToolConfig(toolName: string, config: ToolConfig): void {
    if (!this.config.toolSettings) {
      this.config.toolSettings = {};
    }
    this.config.toolSettings[toolName] = config;
  }

  /**
   * Get user overrides for a specific bot.
   * @param botName The name of the bot.
   * @returns A BotOverride object if found, otherwise undefined.
   */
  public getBotOverride(botName: string): BotOverride | undefined {
    if (!this.config.bots) {
      return undefined;
    }
    // Use the O(1) Map lookup
    const botConfig = this.botMap.get(botName);
    if (!botConfig) {
      return undefined;
    }
    // Map BotConfiguration to BotOverride
    return {
      disabled: this.isBotDisabled(botName),
      messageProvider: botConfig.messageProvider as MessageProvider,
      llmProvider: botConfig.llmProvider as LlmProvider,
      llmProfile: 'llmProfile' in botConfig ? (botConfig.llmProfile as string | undefined) : undefined,
      responseProfile: botConfig.responseProfile as string | undefined,
      persona: botConfig.persona,
      systemInstruction: botConfig.systemInstruction,
      mcpServers: botConfig.mcpServers as McpServerConfig[],
      mcpGuard: botConfig.mcpGuard as McpGuardConfig,
      mcpGuardProfile: 'mcpGuardProfile' in botConfig ? (botConfig.mcpGuardProfile as string | undefined) : undefined,
    };
  }

  /**
   * Get all user overrides for bots in a Map for O(1) lookup.
   * @returns A Map of botName to BotOverride.
   */
  public getAllBotOverrides(): Map<string, BotOverride> {
    return new Map(this.botMap) as unknown as Map<string, BotOverride>;
  }

  /**
   * Set user overrides for a specific bot.
   * @param botName The name of the bot.
   * @param overrides The overrides to apply.
   */
  public setBotOverride(botName: string, overrides: BotOverride): void {
    if (!this.config.bots) {
      this.config.bots = [];
    }

    // Use the map to find existing config in O(1)
    const existingBot = this.botMap.get(botName);

    const botConfig: BotConfiguration = {
      name: botName,
      messageProvider: overrides.messageProvider || ('discord' as MessageProvider),
      llmProvider: overrides.llmProvider || ('flowise' as LlmProvider),
      llmProfile: 'llmProfile' in overrides ? (overrides.llmProfile as string | undefined) : undefined,
      responseProfile: overrides.responseProfile,
      persona: overrides.persona,
      systemInstruction: overrides.systemInstruction,
      mcpServers: overrides.mcpServers,
      mcpGuard: overrides.mcpGuard,
      mcpGuardProfile:
        'mcpGuardProfile' in overrides ? (overrides.mcpGuardProfile as string | undefined) : undefined,
      isActive: true,
      createdAt: existingBot?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (existingBot) {
      // Update existing object in-place in both the array and the map
      Object.assign(existingBot, botConfig);
    } else {
      this.config.bots.push(botConfig);
      this.botMap.set(botName, botConfig);
    }
    this.botMap.set(botName, botConfig);
  }

  /**
   * Remove the user override for a bot and keep the botMap in sync.
   * Returns true if a record was removed, false if no override existed.
   */
  public deleteBotOverride(botName: string): boolean {
    const before = this.config.bots?.length ?? 0;
    this.config.bots = (this.config.bots ?? []).filter((b) => b.name !== botName);
    this.botMap.delete(botName);
    return (this.config.bots?.length ?? 0) < before;
  }

  /**
   * Find the first bot whose configuration satisfies a predicate.
   * Useful for provider-based or platform-based lookups without iterating externally.
   */
  public findBot(predicate: (bot: BotConfiguration) => boolean): BotConfiguration | undefined {
    for (const bot of this.botMap.values()) {
      if (predicate(bot)) return bot;
    }
    return undefined;
  }

  /**
   * Return all bot configurations as an array.
   * Reads from the in-memory map so callers don't need to access the internal config object.
   */
  public getAllBots(): BotConfiguration[] {
    return Array.from(this.botMap.values());
  }

  /**
   * Get general settings.
   * @returns The general settings object.
   */
  public getGeneralSettings(): GeneralSettings {
    return this.config.generalSettings || {};
  }

  /**
   * Set general settings and persist to config file.
   * @param settings The settings to merge/save.
   */
  public async setGeneralSettings(settings: GeneralSettings): Promise<void> {
    if (!this.config.generalSettings) {
      this.config.generalSettings = {};
    }

    // Merge new settings with existing
    this.config.generalSettings = {
      ...this.config.generalSettings,
      ...settings,
    };

    await this.saveConfig();
  }

  /**
   * Check if the system is in maintenance mode.
   * @returns true if maintenance mode is enabled, false otherwise.
   */
  public isMaintenanceMode(): boolean {
    return this.getGeneralSettings()['app.maintenanceMode'] === true;
  }
}

