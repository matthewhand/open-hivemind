import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { v4 as uuidv4 } from 'uuid';
import { BotConfigurationManager } from './BotConfigurationManager';
import type { BotConfig } from '@src/types/config';

const debug = Debug('app:providerConfigManager');

export interface ProviderInstance {
  id: string;
  type: string; // 'discord', 'slack', 'openai', etc.
  category: 'message' | 'llm';
  name: string;
  enabled: boolean;
  config: Record<string, any>; // Provider-specific config (token, model, etc.)
}

export interface ProviderStore {
  message: ProviderInstance[];
  llm: ProviderInstance[];
}

class ProviderConfigManager {
  private static instance: ProviderConfigManager;
  private configPath: string;
  private store: ProviderStore = { message: [], llm: [] };
  private initialized = false;

  private constructor() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    // Ensure providers directory exists
    const providersDir = path.join(configDir, 'providers');
    if (!fs.existsSync(providersDir)) {
      fs.mkdirSync(providersDir, { recursive: true });
    }
    this.configPath = path.join(providersDir, 'instances.json');
    this.loadConfig();

    // Migration: If empty, try to populate from legacy sources (one-time)
    if (this.store.message.length === 0 && this.store.llm.length === 0) {
      this.migrateLegacyConfigs();
    }

    // Note: BOTS_* env provider sync is triggered separately via syncBotProviders()
    // because the ProviderConfigManager singleton may be created before dotenv loads.
  }

  public static getInstance(): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager();
    }
    return ProviderConfigManager.instance;
  }

  /**
   * Interpolate ${ENV_VAR} patterns in config values with actual environment variables
   */
  private interpolateEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
        const value = process.env[envVar] || '';
        debug(`Interpolating \${${envVar}} -> "${value}" (env available: ${!!process.env[envVar]})`);
        return value;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateEnvVars(item));
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.interpolateEnvVars(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Interpolate ${ENV_VAR} patterns with actual env values
        this.store = this.interpolateEnvVars(parsed);
        debug(`Loaded ${this.store.message.length} message and ${this.store.llm.length} llm providers`);
      } else {
        this.store = { message: [], llm: [] };
        this.saveConfig();
      }
      this.initialized = true;
    } catch (error) {
      debug('Error loading provider config:', error);
      this.store = { message: [], llm: [] };
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.store, null, 2));
      debug('Saved provider config');
    } catch (error) {
      debug('Error saving provider config:', error);
    }
  }

  /**
   * One-time migration from environment variables/legacy configs to instances
   */
  private migrateLegacyConfigs(): void {
    debug('Migrating legacy configs...');
    let changed = false;

    // Discord
    const discordToken = process.env.DISCORD_BOT_TOKEN;
    if (discordToken) {
      const tokens = discordToken.split(',');
      tokens.forEach((token, idx) => {
        if (token.trim()) {
          this.store.message.push({
            id: `discord-${idx === 0 ? 'default' : uuidv4()}`,
            type: 'discord',
            category: 'message',
            name: idx === 0 ? 'Default Discord Bot' : `Discord Bot ${idx + 2}`,
            enabled: true,
            config: { token: token.trim() },
          });
          changed = true;
        }
      });
    }

    // OpenAI
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      this.store.llm.push({
        id: 'openai-default',
        type: 'openai',
        category: 'llm',
        name: 'Default OpenAI',
        enabled: true,
        config: {
          apiKey: openAiKey,
          model: process.env.OPENAI_MODEL || 'gpt-4',
        },
      });
      changed = true;
    }

    // Ollama
    const ollamaUrl = process.env.OLLAMA_BASE_URL;
    if (ollamaUrl) {
      this.store.llm.push({
        id: 'ollama-default',
        type: 'ollama',
        category: 'llm',
        name: 'Local Ollama',
        enabled: true,
        config: {
          baseUrl: ollamaUrl,
          model: process.env.OLLAMA_MODEL || 'llama2',
        },
      });
      changed = true;
    }

    if (changed) {
      this.saveConfig();
      debug('Migration complete');
    }
  }

  /**
   * Check if a provider instance already exists by type, category, and a key config field.
   * Returns the existing instance if found, or undefined.
   */
  private findExistingProvider(
    category: 'message' | 'llm',
    type: string,
    configKey: string,
    configValue: string,
  ): ProviderInstance | undefined {
    return this.store[category].find(
      (p) => p.type === type && p.config[configKey] === configValue,
    );
  }

  /**
   * Sync provider instances from BOTS_* env-configured bots.
   * For each bot with embedded credentials, creates a provider instance
   * if one with the same type + credential doesn't already exist.
   * This is idempotent and safe to call on every startup.
   */
  private migrateFromBotEnvConfig(): void {
    let botConfigManager: BotConfigurationManager;
    try {
      botConfigManager = BotConfigurationManager.getInstance();
    } catch {
      debug('BotConfigurationManager not available, skipping BOTS_* migration');
      return;
    }

    const bots = botConfigManager.getAllBots();
    if (bots.length === 0) return;

    debug(`Syncing provider instances from ${bots.length} BOTS_* configured bots`);
    let changed = false;

    for (const bot of bots) {
      const botName = bot.name.toLowerCase();

      // --- Message providers ---
      changed = this.syncMessageProvider(bot, botName) || changed;

      // --- LLM providers ---
      changed = this.syncLlmProvider(bot, botName) || changed;
    }

    if (changed) {
      this.saveConfig();
      debug('BOTS_* provider migration complete');
    }
  }

  /**
   * Create a message provider instance from a bot's embedded config if not already present.
   * Returns true if a new instance was created.
   */
  private syncMessageProvider(bot: BotConfig, botName: string): boolean {
    const msgType = bot.messageProvider;
    if (!msgType) return false;

    if (msgType === 'discord' && bot.discord?.token) {
      if (this.findExistingProvider('message', 'discord', 'token', bot.discord.token)) {
        return false;
      }
      this.store.message.push({
        id: `bot-${botName}-discord`,
        type: 'discord',
        category: 'message',
        name: `${botName}-discord`,
        enabled: true,
        config: {
          token: bot.discord.token,
          clientId: bot.discord.clientId || '',
          guildId: bot.discord.guildId || '',
          channelId: bot.discord.channelId || '',
        },
      });
      debug(`Created discord message provider for bot "${botName}"`);
      return true;
    }

    if (msgType === 'slack' && bot.slack?.botToken) {
      if (this.findExistingProvider('message', 'slack', 'botToken', bot.slack.botToken)) {
        return false;
      }
      this.store.message.push({
        id: `bot-${botName}-slack`,
        type: 'slack',
        category: 'message',
        name: `${botName}-slack`,
        enabled: true,
        config: {
          botToken: bot.slack.botToken,
          appToken: bot.slack.appToken || '',
          signingSecret: bot.slack.signingSecret || '',
          joinChannels: bot.slack.joinChannels || '',
          defaultChannelId: bot.slack.defaultChannelId || '',
          mode: bot.slack.mode || 'socket',
        },
      });
      debug(`Created slack message provider for bot "${botName}"`);
      return true;
    }

    if (msgType === 'mattermost' && bot.mattermost?.token) {
      if (this.findExistingProvider('message', 'mattermost', 'token', bot.mattermost.token)) {
        return false;
      }
      this.store.message.push({
        id: `bot-${botName}-mattermost`,
        type: 'mattermost',
        category: 'message',
        name: `${botName}-mattermost`,
        enabled: true,
        config: {
          serverUrl: bot.mattermost.serverUrl || '',
          token: bot.mattermost.token,
          channel: bot.mattermost.channel || '',
        },
      });
      debug(`Created mattermost message provider for bot "${botName}"`);
      return true;
    }

    return false;
  }

  /**
   * Create an LLM provider instance from a bot's embedded config if not already present.
   * Returns true if a new instance was created.
   */
  private syncLlmProvider(bot: BotConfig, botName: string): boolean {
    const llmType = bot.llmProvider;
    if (!llmType) return false;

    if (llmType === 'openai' && bot.openai?.apiKey) {
      if (this.findExistingProvider('llm', 'openai', 'apiKey', bot.openai.apiKey)) {
        return false;
      }
      this.store.llm.push({
        id: `bot-${botName}-openai`,
        type: 'openai',
        category: 'llm',
        name: `${botName}-openai`,
        enabled: true,
        config: {
          apiKey: bot.openai.apiKey,
          model: bot.openai.model || 'gpt-4o',
          baseUrl: bot.openai.baseUrl || '',
        },
      });
      debug(`Created openai LLM provider for bot "${botName}"`);
      return true;
    }

    if (llmType === 'flowise' && bot.flowise?.apiKey) {
      if (this.findExistingProvider('llm', 'flowise', 'apiKey', bot.flowise.apiKey)) {
        return false;
      }
      this.store.llm.push({
        id: `bot-${botName}-flowise`,
        type: 'flowise',
        category: 'llm',
        name: `${botName}-flowise`,
        enabled: true,
        config: {
          apiKey: bot.flowise.apiKey,
          apiBaseUrl: bot.flowise.apiBaseUrl || '',
        },
      });
      debug(`Created flowise LLM provider for bot "${botName}"`);
      return true;
    }

    if (llmType === 'openwebui' && bot.openwebui?.apiKey) {
      if (this.findExistingProvider('llm', 'openwebui', 'apiKey', bot.openwebui.apiKey)) {
        return false;
      }
      this.store.llm.push({
        id: `bot-${botName}-openwebui`,
        type: 'openwebui',
        category: 'llm',
        name: `${botName}-openwebui`,
        enabled: true,
        config: {
          apiKey: bot.openwebui.apiKey,
          apiUrl: bot.openwebui.apiUrl || '',
        },
      });
      debug(`Created openwebui LLM provider for bot "${botName}"`);
      return true;
    }

    if (llmType === 'openswarm' && bot.openswarm?.apiKey) {
      if (this.findExistingProvider('llm', 'openswarm', 'apiKey', bot.openswarm.apiKey)) {
        return false;
      }
      this.store.llm.push({
        id: `bot-${botName}-openswarm`,
        type: 'openswarm',
        category: 'llm',
        name: `${botName}-openswarm`,
        enabled: true,
        config: {
          baseUrl: bot.openswarm.baseUrl || '',
          apiKey: bot.openswarm.apiKey,
          team: bot.openswarm.team || '',
        },
      });
      debug(`Created openswarm LLM provider for bot "${botName}"`);
      return true;
    }

    return false;
  }

  /**
   * Get the provider instance ID for a given bot's message provider.
   * Returns the ID if a matching provider was created from this bot's config.
   */
  public getMessageProviderIdForBot(botName: string): string | undefined {
    const id = `bot-${botName.toLowerCase()}-`;
    return this.store.message.find((p) => p.id.startsWith(id))?.id;
  }

  /**
   * Get the provider instance ID for a given bot's LLM provider.
   * Returns the ID if a matching provider was created from this bot's config.
   */
  public getLlmProviderIdForBot(botName: string): string | undefined {
    const id = `bot-${botName.toLowerCase()}-`;
    return this.store.llm.find((p) => p.id.startsWith(id))?.id;
  }

  /**
   * Public entry point to sync BOTS_* env-configured providers.
   * Must be called after dotenv is loaded and BotConfigurationManager is ready.
   * Safe to call multiple times — idempotent.
   */
  public syncBotProviders(): void {
    this.migrateFromBotEnvConfig();
  }

  // CRUD Operations

  public getAllProviders(category?: 'message' | 'llm'): ProviderInstance[] {
    if (category) {
      return this.store[category];
    }
    return [...this.store.message, ...this.store.llm];
  }

  public getProvider(id: string): ProviderInstance | undefined {
    return [...this.store.message, ...this.store.llm].find(p => p.id === id);
  }

  public createProvider(data: Omit<ProviderInstance, 'id'>): ProviderInstance {
    const newInstance: ProviderInstance = {
      ...data,
      id: uuidv4(), // Generate ID
    };

    if (newInstance.category === 'message') {
      this.store.message.push(newInstance);
    } else {
      this.store.llm.push(newInstance);
    }

    this.saveConfig();
    return newInstance;
  }

  public updateProvider(id: string, updates: Partial<ProviderInstance>): ProviderInstance | null {
    let target = this.store.message.find(p => p.id === id);

    if (!target) {
      target = this.store.llm.find(p => p.id === id);
    }

    if (!target) {return null;}

    // Merge updates
    Object.assign(target, updates);
    // Ensure category/id/type are immutable if needed? For now allow update except ID
    target.id = id;

    this.saveConfig();
    return target;
  }

  public deleteProvider(id: string): boolean {
    const msgIdx = this.store.message.findIndex(p => p.id === id);
    if (msgIdx !== -1) {
      this.store.message.splice(msgIdx, 1);
      this.saveConfig();
      return true;
    }

    const llmIdx = this.store.llm.findIndex(p => p.id === id);
    if (llmIdx !== -1) {
      this.store.llm.splice(llmIdx, 1);
      this.saveConfig();
      return true;
    }

    return false;
  }
}

export default ProviderConfigManager;
