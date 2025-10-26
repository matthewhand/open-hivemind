import { promises as fs } from 'fs';
import path from 'path';
import { BotConfiguration } from '../database/DatabaseManager';
import { BotOverride } from '@src/types/config';

interface ToolConfig {
  guards?: {
    ownerOnly?: boolean;
    allowedUsers?: string[];
  };
}

export class UserConfigStore {
  private static instance: UserConfigStore;
  private config: {
    toolSettings?: Record<string, ToolConfig>;
    bots?: BotConfiguration[];
  } = {};

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): UserConfigStore {
    if (!UserConfigStore.instance) {
      UserConfigStore.instance = new UserConfigStore();
    }
    return UserConfigStore.instance;
  }

  private async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'config', 'user-config.json');
      const data = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // If config file doesn't exist, use default empty config
      this.config = {
        toolSettings: {},
        bots: []
      };
    }
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
      messageProvider: botConfig.messageProvider,
      llmProvider: botConfig.llmProvider,
      persona: botConfig.persona,
      systemInstruction: botConfig.systemInstruction,
      mcpServers: botConfig.mcpServers,
      mcpGuard: botConfig.mcpGuard,
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
      ...overrides,
      updatedAt: new Date().toISOString(),
    };

    if (existingBotIndex >= 0) {
      this.config.bots[existingBotIndex] = botConfig;
    } else {
      this.config.bots.push(botConfig);
    }
  }
}