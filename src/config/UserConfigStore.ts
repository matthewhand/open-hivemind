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

export class UserConfigStore {
  private static instance: UserConfigStore;
  private config: {
    toolSettings?: Record<string, ToolConfig>;
    bots?: BotConfiguration[];
  } = {};

  private constructor() {
    // Load config synchronously for now to avoid async issues in constructor
    try {
      const configPath = path.join(process.cwd(), 'config', 'user-config.json');
      const data = require('fs').readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // If config file doesn't exist, use default empty config
      this.config = {
        toolSettings: {},
        bots: [],
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
      const configPath = path.join(process.cwd(), 'config', 'user-config.json');
      const data = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // If config file doesn't exist, use default empty config
      this.config = {
        toolSettings: {},
        bots: [],
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
}
