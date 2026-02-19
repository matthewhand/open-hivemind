import { promises as fs } from 'fs';
import path from 'path';
import type { BotConfiguration } from '../database/DatabaseManager';
import type { BotOverride, MessageProvider, LlmProvider, McpServerConfig, McpGuardConfig } from '@src/types/config';

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

interface GeneralSettings {
  [key: string]: any;  // Flexible key-value store for general settings
}

export class UserConfigStore {
  private static instance: UserConfigStore;
  private config: {
    toolSettings?: Record<string, ToolConfig>;
    bots?: BotConfiguration[];
    botDisabledStates?: Record<string, BotDisabledState>;
    generalSettings?: GeneralSettings;
  } = {};
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'user-config.json');
    // Load config synchronously for now to avoid async issues in constructor
    try {
      const data = require('fs').readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // If config file doesn't exist, use default empty config
      this.config = {
        toolSettings: {},
        bots: [],
        botDisabledStates: {},
      };
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
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // If config file doesn't exist, use default empty config
      this.config = {
        toolSettings: {},
        bots: [],
        botDisabledStates: {},
      };
    }
  }

  /**
   * Save the current configuration to disk.
   */
  public async saveConfig(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save user config:', error);
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
    const botConfig = this.config.bots.find(bot => bot.name === botName);
    if (!botConfig) {
      return undefined;
    }
    // Map BotConfiguration to BotOverride
    return {
      disabled: this.isBotDisabled(botName),
      messageProvider: botConfig.messageProvider as MessageProvider,
      llmProvider: botConfig.llmProvider as LlmProvider,
      llmProfile: (botConfig as any).llmProfile as string | undefined,
      responseProfile: botConfig.responseProfile as string | undefined,
      persona: botConfig.persona,
      systemInstruction: botConfig.systemInstruction,
      mcpServers: botConfig.mcpServers as McpServerConfig[],
      mcpGuard: botConfig.mcpGuard as McpGuardConfig,
      mcpGuardProfile: (botConfig as any).mcpGuardProfile as string | undefined,
    };
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
    const existingBotIndex = this.config.bots.findIndex(bot => bot.name === botName);
    const botConfig: BotConfiguration = {
      name: botName,
      messageProvider: overrides.messageProvider || 'discord' as MessageProvider,
      llmProvider: overrides.llmProvider || 'flowise' as LlmProvider,
      llmProfile: (overrides as any).llmProfile,
      responseProfile: overrides.responseProfile,
      persona: overrides.persona,
      systemInstruction: overrides.systemInstruction,
      mcpServers: overrides.mcpServers,
      mcpGuard: overrides.mcpGuard,
      mcpGuardProfile: (overrides as any).mcpGuardProfile,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingBotIndex >= 0) {
      this.config.bots[existingBotIndex] = botConfig;
    } else {
      this.config.bots.push(botConfig);
    }
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
}

