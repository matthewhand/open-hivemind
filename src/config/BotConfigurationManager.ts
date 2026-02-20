import convict from 'convict';
import Debug from 'debug';
import path from 'path';
import fs from 'fs';
import { UserConfigStore } from './UserConfigStore';

// Define BotOverride interface locally since it's not exported
interface BotOverride {
  messageProvider?: string;
  llmProvider?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: unknown[];
  mcpGuard?: unknown;
}
import type {
  BotConfig,
  MessageProvider,
  LlmProvider,
  McpServerConfig,
  McpGuardConfig,
  ConfigurationValidationResult
} from '@src/types/config';
import { ConfigurationError, ValidationError } from '../types/errorClasses';

const debug = Debug('app:BotConfigurationManager');

// Define the schema for individual bot configuration
const botSchema = {
  // Message provider configuration
  MESSAGE_PROVIDER: {
    doc: 'Message provider type (discord, slack, etc.)',
    format: ['discord', 'slack', 'mattermost', 'webhook'],
    default: 'discord',
    env: 'BOTS_{name}_MESSAGE_PROVIDER'
  },

  // LLM provider configuration
  LLM_PROVIDER: {
    doc: 'LLM provider type (openai, flowise, etc.)',
    format: ['openai', 'flowise', 'openwebui', 'perplexity', 'replicate', 'n8n', 'openswarm'],
    default: 'flowise',
    env: 'BOTS_{name}_LLM_PROVIDER'
  },

  // Persona configuration
  PERSONA: {
    doc: 'Bot persona key',
    format: String,
    default: 'default',
    env: 'BOTS_{name}_PERSONA'
  },

  SYSTEM_INSTRUCTION: {
    doc: 'Bot system instruction/prompt',
    format: String,
    default: '',
    env: 'BOTS_{name}_SYSTEM_INSTRUCTION'
  },

  MCP_SERVERS: {
    doc: 'MCP servers configuration (JSON array)',
    format: Array,
    default: [],
    env: 'BOTS_{name}_MCP_SERVERS'
  },

  MCP_GUARD: {
    doc: 'MCP tool usage guard configuration (JSON)',
    format: Object,
    default: { enabled: false, type: 'owner' },
    env: 'BOTS_{name}_MCP_GUARD'
  },

  // Discord-specific configuration
  DISCORD_BOT_TOKEN: {
    doc: 'Discord bot token',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_BOT_TOKEN'
  },

  DISCORD_CLIENT_ID: {
    doc: 'Discord client ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_CLIENT_ID'
  },

  DISCORD_GUILD_ID: {
    doc: 'Discord guild ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_GUILD_ID'
  },

  DISCORD_CHANNEL_ID: {
    doc: 'Default Discord channel ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_CHANNEL_ID'
  },

  DISCORD_VOICE_CHANNEL_ID: {
    doc: 'Discord voice channel ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_VOICE_CHANNEL_ID'
  },

  // Slack-specific configuration
  SLACK_BOT_TOKEN: {
    doc: 'Slack bot token',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_BOT_TOKEN'
  },

  SLACK_APP_TOKEN: {
    doc: 'Slack app token for Socket Mode',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_APP_TOKEN'
  },

  SLACK_SIGNING_SECRET: {
    doc: 'Slack signing secret for verifying requests',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_SIGNING_SECRET'
  },

  SLACK_JOIN_CHANNELS: {
    doc: 'Comma-separated Slack channel IDs to join',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_JOIN_CHANNELS'
  },

  SLACK_DEFAULT_CHANNEL_ID: {
    doc: 'Default Slack channel ID for messages',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_DEFAULT_CHANNEL_ID'
  },

  SLACK_MODE: {
    doc: 'Slack connection mode (socket or rtm)',
    format: ['socket', 'rtm'],
    default: 'socket',
    env: 'BOTS_{name}_SLACK_MODE'
  },

  // Mattermost-specific configuration
  MATTERMOST_SERVER_URL: {
    doc: 'Mattermost server endpoint',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_SERVER_URL'
  },

  MATTERMOST_TOKEN: {
    doc: 'Mattermost authentication token',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_TOKEN'
  },

  MATTERMOST_CHANNEL: {
    doc: 'Default Mattermost channel for messages',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_CHANNEL'
  },

  // OpenAI configuration
  OPENAI_API_KEY: {
    doc: 'OpenAI API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENAI_API_KEY'
  },

  OPENAI_MODEL: {
    doc: 'OpenAI model name',
    format: String,
    default: 'gpt-4',
    env: 'BOTS_{name}_OPENAI_MODEL'
  },

  OPENAI_BASE_URL: {
    doc: 'OpenAI API base URL',
    format: String,
    default: 'https://api.openai.com/v1',
    env: 'BOTS_{name}_OPENAI_BASE_URL'
  },

  OPENAI_SYSTEM_PROMPT: {
    doc: 'OpenAI system prompt for this bot',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENAI_SYSTEM_PROMPT'
  },

  // Flowise configuration
  FLOWISE_API_KEY: {
    doc: 'Flowise API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_FLOWISE_API_KEY'
  },

  FLOWISE_API_BASE_URL: {
    doc: 'Flowise API base URL',
    format: String,
    default: 'http://localhost:3000/api/v1',
    env: 'BOTS_{name}_FLOWISE_API_BASE_URL'
  },

  // OpenWebUI configuration
  OPENWEBUI_API_KEY: {
    doc: 'OpenWebUI API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENWEBUI_API_KEY'
  },

  OPENWEBUI_API_URL: {
    doc: 'OpenWebUI API URL',
    format: String,
    default: 'http://localhost:3000/api/',
    env: 'BOTS_{name}_OPENWEBUI_API_URL'
  },

  // OpenSwarm configuration
  OPENSWARM_BASE_URL: {
    doc: 'OpenSwarm API base URL',
    format: String,
    default: 'http://localhost:8000/v1',
    env: 'BOTS_{name}_OPENSWARM_BASE_URL'
  },

  OPENSWARM_API_KEY: {
    doc: 'OpenSwarm API key',
    format: String,
    default: 'dummy-key',
    env: 'BOTS_{name}_OPENSWARM_API_KEY'
  },

  OPENSWARM_TEAM: {
    doc: 'OpenSwarm team name (used as model)',
    format: String,
    default: 'default-team',
    env: 'BOTS_{name}_OPENSWARM_TEAM'
  }
};

// BotConfig interface is now imported from @src/types/config

export class BotConfigurationManager {
  private static instance: BotConfigurationManager;
  private bots: Map<string, BotConfig> = new Map();
  private legacyMode: boolean = false;
  private warnings: string[] = [];
  private userConfigStore = UserConfigStore.getInstance();

  public constructor() {
    this.loadConfiguration();
  }

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
    const discoveredBots = this.discoverBotNamesFromEnv();

    // Merge explicit list with discovered list
    const explicitBots = botsEnv ? botsEnv.split(',').map(n => n.trim()).filter(Boolean) : [];
    const canonical = (n: string) => String(n || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

    // Deduplicate bots while preferring explicitly listed names from BOTS.
    const byCanonical = new Map<string, string>();
    for (const name of discoveredBots) byCanonical.set(canonical(name), name);
    for (const name of explicitBots) byCanonical.set(canonical(name), name);
    const allBotNames = Array.from(byCanonical.values());

    if (allBotNames.length > 0) {
      debug(`Loading multi-bot configuration for: ${allBotNames.join(', ')}`);
      for (const botName of allBotNames) {
        const config = this.createBotConfig(botName);
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
   * Auto-discover bot names by scanning environment variables for BOTS_<NAME>_ prefix
   */
  private discoverBotNamesFromEnv(): string[] {
    const envVars = Object.keys(process.env);
    const botNames = new Set<string>();
    const schemaKeys = Object.keys(botSchema)
      .map((k) => String(k || '').toUpperCase())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const prefix = 'BOTS_';
    for (const rawKey of envVars) {
      const key = String(rawKey || '');
      const upper = key.toUpperCase();
      if (!upper.startsWith(prefix)) continue;

      for (const schemaKey of schemaKeys) {
        const suffix = `_${schemaKey}`;
        if (!upper.endsWith(suffix)) continue;
        const namePart = upper.slice(prefix.length, upper.length - suffix.length);
        if (!namePart) break;
        botNames.add(namePart.toLowerCase().replace(/_+/g, '-'));
        break;
      }
    }

    if (botNames.size > 0) {
      debug(`Auto-discovered potential bots from env: ${Array.from(botNames).join(', ')}`);
    }
    return Array.from(botNames);
  }

  /**
   * Load multi-bot configuration from BOTS environment variable
   * (Now deprecated/internal helper for explicit list if needed, but logic is merged above)
   */
  private loadMultiBotConfiguration(): void {
    // Deprecated implementation - logic moved to loadConfiguration
  }

  /**
   * Create individual bot configuration
   */
  private createBotConfig(botName: string): BotConfig | null {
    const upperName = botName.toUpperCase();
    const upperEnvName = upperName.replace(/[^A-Z0-9]/g, '_');

    // Create a convict instance for this bot
    const botConfig = convict(botSchema);

    // Replace {name} placeholders with actual bot name
    const envVars = Object.keys(process.env);
    const prefixA = `BOTS_${upperName}_`;
    const prefixB = `BOTS_${upperEnvName}_`;

    // Find all env vars that start with a bot prefix (case-insensitive check).
    // Supports env-safe bot names (e.g. "reload-bot" -> "RELOAD_BOT").
    const botEnvVars = envVars.filter(key => {
      const k = key.toUpperCase();
      return k.startsWith(prefixA.toUpperCase()) || k.startsWith(prefixB.toUpperCase());
    });

    for (const envVar of botEnvVars) {
      // Extract the config key by removing the prefix (case-insensitive substring)
      // and preserving the case of the config key itself (though convict keys are usually matched loosely or mapped)
      // Actually, standard keys are UPPERCASE e.g. DISCORD_BOT_TOKEN.
      // We'll rely on envVar's actual casing for the suffix part, or normalize it? 
      // Convict schema keys are defined. 
      // Let's just strip the length of the prefix.
      const envUpper = envVar.toUpperCase();
      const prefixToUse = envUpper.startsWith(prefixA.toUpperCase()) ? prefixA : prefixB;
      const suffix = envVar.slice(prefixToUse.length);
      const value = process.env[envVar];

      if (value !== undefined) {
        try {
          botConfig.set(suffix, value);
        } catch (error: unknown) {
          if (error instanceof Error) {
            debug(`Warning: Invalid value for ${envVar}:`, {
              error: error.message,
              envVar
            });
            this.warnings.push(`Invalid value for ${envVar}: ${error.message}`);
          } else {
            const configError = new ConfigurationError(
              `Invalid configuration value for ${envVar}`,
              envVar,
              'string',
              typeof error
            );
            debug(`Warning: Invalid value for ${envVar}:`, configError.toJSON());
            this.warnings.push(`Invalid value for ${envVar}: ${configError.message}`);
          }
        }
      }
    }

    // Load bot-specific config file if exists
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const botConfigPath = path.join(configDir, `bots/${botName}.json`);

    if (fs.existsSync(botConfigPath)) {
      debug(`Loading bot-specific config for ${botName} from ${botConfigPath}`);
      botConfig.loadFile(botConfigPath);
    }

    botConfig.validate({ allowed: 'warn' });

    const llmProvider = botConfig.get('LLM_PROVIDER') as LlmProvider;
    let llmModel: string | undefined;

    // Resolve model based on provider
    if (llmProvider === 'openai') {
      llmModel = botConfig.get('OPENAI_MODEL');
    } else if (llmProvider === 'openswarm') {
      llmModel = botConfig.get('OPENSWARM_TEAM');
    }

    // Build the bot configuration object
    const config: BotConfig = {
      name: botName,
      messageProvider: botConfig.get('MESSAGE_PROVIDER') as MessageProvider,
      llmProvider,
      llmModel,
      persona: botConfig.get('PERSONA') as string || 'default',
      systemInstruction: botConfig.get('SYSTEM_INSTRUCTION') as string,
      mcpServers: botConfig.get('MCP_SERVERS') as McpServerConfig[] || [],
      mcpGuard: botConfig.get('MCP_GUARD') as McpGuardConfig || { enabled: false, type: 'owner' }
    };


    // Add Discord configuration if token is provided
    const discordToken = botConfig.get('DISCORD_BOT_TOKEN');
    if (discordToken) {
      config.discord = {
        token: discordToken,
        clientId: botConfig.get('DISCORD_CLIENT_ID'),
        guildId: botConfig.get('DISCORD_GUILD_ID'),
        channelId: botConfig.get('DISCORD_CHANNEL_ID'),
        voiceChannelId: botConfig.get('DISCORD_VOICE_CHANNEL_ID'),
      };
    }

    // Add OpenAI configuration if API key is provided
    const openaiApiKey = botConfig.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      config.openai = {
        apiKey: openaiApiKey,
        model: botConfig.get('OPENAI_MODEL'),
        baseUrl: botConfig.get('OPENAI_BASE_URL'),
        systemPrompt: botConfig.get('OPENAI_SYSTEM_PROMPT'),
      };
    }

    // Add Flowise configuration if API key is provided
    const flowiseApiKey = botConfig.get('FLOWISE_API_KEY');
    if (flowiseApiKey) {
      config.flowise = {
        apiKey: flowiseApiKey,
        apiBaseUrl: botConfig.get('FLOWISE_API_BASE_URL'),
      };
    }

    // Add OpenWebUI configuration if API key is provided
    const openwebuiApiKey = botConfig.get('OPENWEBUI_API_KEY');
    if (openwebuiApiKey) {
      config.openwebui = {
        apiKey: openwebuiApiKey,
        apiUrl: botConfig.get('OPENWEBUI_API_URL'),
      };
    }

    // Add OpenSwarm configuration
    const openswarmBaseUrl = botConfig.get('OPENSWARM_BASE_URL');
    if (config.llmProvider === 'openswarm' || openswarmBaseUrl !== 'http://localhost:8001/v1') {
      config.openswarm = {
        baseUrl: openswarmBaseUrl,
        apiKey: botConfig.get('OPENSWARM_API_KEY'),
        team: botConfig.get('OPENSWARM_TEAM'),
      };
    }

    this.applyUserOverrides(botName, config);

    return config;
  }

  private getEnvVarName(botName: string, key: string): string {
    const envName = String(botName || '').toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return `BOTS_${envName}_${key}`;
  }

  private hasEnvOverride(botName: string, key: string): boolean {
    const envVar = this.getEnvVarName(botName, key);
    const value = process.env[envVar];
    return value !== undefined && value !== '';
  }

  private applyUserOverrides(botName: string, config: BotConfig): void {
    const overrides = this.userConfigStore.getBotOverride(botName);
    if (!overrides) {
      return;
    }

    const assignIfAllowed = (field: keyof BotOverride, envKey: string) => {
      const overrideValue = overrides[field];
      if (overrideValue === undefined) {
        return;
      }
      if (this.hasEnvOverride(botName, envKey)) {
        return;
      }

      const clonedValue = Array.isArray(overrideValue)
        ? [...overrideValue]
        : typeof overrideValue === 'object' && overrideValue !== null
          ? { ...(overrideValue as unknown as Record<string, unknown>) }
          : overrideValue;

      (config as any)[field] = clonedValue;
    };

    assignIfAllowed('messageProvider', 'MESSAGE_PROVIDER');
    assignIfAllowed('llmProvider', 'LLM_PROVIDER');
    assignIfAllowed('persona', 'PERSONA');
    assignIfAllowed('systemInstruction', 'SYSTEM_INSTRUCTION');
    assignIfAllowed('mcpServers', 'MCP_SERVERS');
    assignIfAllowed('mcpGuard', 'MCP_GUARD');

    if (!config.mcpGuard) {
      config.mcpGuard = { enabled: false, type: 'owner' };
    }
    if (!config.mcpServers) {
      config.mcpServers = [];
    }
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
          llmProvider: this.detectLegacyLlmProvider() as LlmProvider,
          discord: {
            token,
            clientId: process.env.DISCORD_CLIENT_ID,
            guildId: process.env.DISCORD_GUILD_ID,
            channelId: process.env.DISCORD_CHANNEL_ID,
            voiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID,
          },
        };

        // Populate LLM config from environment variables
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

  /**
   * Detect LLM provider from legacy environment variables
   */
  private detectLegacyLlmProvider(): string {
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.FLOWISE_API_KEY) return 'flowise';
    if (process.env.OPENWEBUI_API_KEY) return 'openwebui';
    if (process.env.OPENSWARM_BASE_URL) return 'openswarm';
    return 'flowise'; // Default fallback
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
   * Get all configured bots
   */
  public getAllBots(): BotConfig[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get Discord-specific bot configurations
   */
  public getDiscordBotConfigs(): BotConfig[] {
    return Array.from(this.bots.values()).filter(bot =>
      bot.messageProvider === 'discord' && bot.discord?.token
    );
  }

  /**
   * Get a specific bot by name
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
    const errors: string[] = [];

    const configObj = config as Record<string, unknown>;

    if (!configObj.name) {
      errors.push('Bot name is required');
    }

    if (!configObj.discord && !configObj.slack && !configObj.mattermost) {
      errors.push('At least one platform configuration is required');
    }

    const discordConfig = configObj.discord as Record<string, unknown>;
    if (discordConfig && !discordConfig.botToken) {
      errors.push('Discord bot token is required');
    }

    const slackConfig = configObj.slack as Record<string, unknown>;
    if (slackConfig && !slackConfig.botToken) {
      errors.push('Slack bot token is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
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
    const sanitized = { ...config };
    const discordConfig = sanitized.discord as Record<string, unknown>;
    if (discordConfig?.botToken) {
      discordConfig.botToken = 'secret-***';
    }
    const slackConfig = sanitized.slack as Record<string, unknown>;
    if (slackConfig?.botToken) {
      slackConfig.botToken = 'secret-***';
    }
    return sanitized;
  }

  /**
   * Update a bot configuration
   */
  public async updateBot(name: string, updates: Record<string, unknown>): Promise<void> {
    // For now, this is a stub that can be extended later
    // The actual implementation would persist changes to config files or database
    const bot = this.getBot(name);
    if (!bot) {
      throw new Error(`Bot "${name}" not found`);
    }
    // Updates would be applied here in a real implementation
    this.warnings.push(`Bot "${name}" update requested but not persisted (stub implementation)`);
  }

  /**
   * Add a new bot configuration
   */
  public async addBot(config: Record<string, unknown>): Promise<void> {
    // For now, this is a stub that can be extended later
    // The actual implementation would persist the new bot to config files or database
    const name = config.name as string;
    if (!name) {
      throw new Error('Bot name is required');
    }
    // Bot would be added here in a real implementation
    this.warnings.push(`Bot "${name}" add requested but not persisted (stub implementation)`);
  }
}

export default BotConfigurationManager;
