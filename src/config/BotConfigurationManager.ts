import convict from 'convict';
import Debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';
import { UserConfigStore } from './UserConfigStore';
import { getGuardrailProfileByKey } from './guardrailProfiles';
import { getLlmProfileByKey } from './llmProfiles';
import { getMcpServerProfileByKey } from './mcpServerProfiles';

import type {
  BotConfig,
  MessageProvider,
  LlmProvider,
  McpServerConfig,
  McpGuardConfig,
  ConfigurationValidationResult,
  BotOverride,
} from '@src/types/config';
import { ConfigurationError } from '../types/errorClasses';

const debug = Debug('app:BotConfigurationManager');

// Define the schema for individual bot configuration
const botSchema = {
  // Message provider configuration
  MESSAGE_PROVIDER: {
    doc: 'Message provider type (discord, slack, etc.)',
    format: ['discord', 'slack', 'mattermost', 'webhook'],
    default: 'discord',
    env: 'BOTS_{name}_MESSAGE_PROVIDER',
  },

  // LLM provider configuration
  LLM_PROVIDER: {
    doc: 'LLM provider type (openai, flowise, etc.)',
    format: ['openai', 'flowise', 'openwebui', 'perplexity', 'replicate', 'n8n', 'openswarm'],
    default: 'flowise',
    env: 'BOTS_{name}_LLM_PROVIDER',
  },

  // LLM provider profile configuration
  LLM_PROFILE: {
    doc: 'LLM provider profile name',
    format: String,
    default: '',
    env: 'BOTS_{name}_LLM_PROFILE',
  },

  // Persona configuration
  PERSONA: {
    doc: 'Bot persona key',
    format: String,
    default: 'default',
    env: 'BOTS_{name}_PERSONA',
  },

  SYSTEM_INSTRUCTION: {
    doc: 'Bot system instruction/prompt',
    format: String,
    default: '',
    env: 'BOTS_{name}_SYSTEM_INSTRUCTION',
  },

  RESPONSE_PROFILE: {
    doc: 'Response profile name for engagement/delay overrides',
    format: String,
    default: '',
    env: 'BOTS_{name}_RESPONSE_PROFILE',
  },

  MCP_SERVERS: {
    doc: 'MCP servers configuration (JSON array)',
    format: Array,
    default: [],
    env: 'BOTS_{name}_MCP_SERVERS',
  },

  MCP_GUARD: {
    doc: 'MCP tool usage guard configuration (JSON)',
    format: Object,
    default: { enabled: false, type: 'owner' },
    env: 'BOTS_{name}_MCP_GUARD',
  },

  MCP_GUARD_PROFILE: {
    doc: 'MCP guardrail profile name',
    format: String,
    default: '',
    env: 'BOTS_{name}_MCP_GUARD_PROFILE',
  },

  MCP_SERVER_PROFILE: {
    doc: 'MCP server profile name for predefined server bundles',
    format: String,
    default: '',
    env: 'BOTS_{name}_MCP_SERVER_PROFILE',
  },

  DISABLE_DELAYS: {
    doc: 'When true, skips all artificial delays. Bot responds as fast as LLM can generate.',
    format: Boolean,
    default: false,
    env: 'BOTS_{name}_DISABLE_DELAYS',
  },

  // Discord-specific configuration
  DISCORD_BOT_TOKEN: {
    doc: 'Discord bot token',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_BOT_TOKEN',
  },

  DISCORD_CLIENT_ID: {
    doc: 'Discord client ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_CLIENT_ID',
  },

  DISCORD_GUILD_ID: {
    doc: 'Discord guild ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_GUILD_ID',
  },

  DISCORD_CHANNEL_ID: {
    doc: 'Default Discord channel ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_CHANNEL_ID',
  },

  DISCORD_VOICE_CHANNEL_ID: {
    doc: 'Discord voice channel ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_VOICE_CHANNEL_ID',
  },

  // Slack-specific configuration
  SLACK_BOT_TOKEN: {
    doc: 'Slack bot token',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_BOT_TOKEN',
  },

  SLACK_APP_TOKEN: {
    doc: 'Slack app token for Socket Mode',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_APP_TOKEN',
  },

  SLACK_SIGNING_SECRET: {
    doc: 'Slack signing secret for verifying requests',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_SIGNING_SECRET',
  },

  SLACK_JOIN_CHANNELS: {
    doc: 'Comma-separated Slack channel IDs to join',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_JOIN_CHANNELS',
  },

  SLACK_DEFAULT_CHANNEL_ID: {
    doc: 'Default Slack channel ID for messages',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_DEFAULT_CHANNEL_ID',
  },

  SLACK_MODE: {
    doc: 'Slack connection mode (socket or rtm)',
    format: ['socket', 'rtm'],
    default: 'socket',
    env: 'BOTS_{name}_SLACK_MODE',
  },

  // Mattermost-specific configuration
  MATTERMOST_SERVER_URL: {
    doc: 'Mattermost server endpoint',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_SERVER_URL',
  },

  MATTERMOST_TOKEN: {
    doc: 'Mattermost authentication token',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_TOKEN',
  },

  MATTERMOST_CHANNEL: {
    doc: 'Default Mattermost channel for messages',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_CHANNEL',
  },

  // OpenAI configuration
  OPENAI_API_KEY: {
    doc: 'OpenAI API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENAI_API_KEY',
  },

  OPENAI_MODEL: {
    doc: 'OpenAI model name',
    format: String,
    default: 'gpt-4',
    env: 'BOTS_{name}_OPENAI_MODEL',
  },

  OPENAI_BASE_URL: {
    doc: 'OpenAI API base URL',
    format: String,
    default: 'https://api.openai.com/v1',
    env: 'BOTS_{name}_OPENAI_BASE_URL',
  },

  OPENAI_SYSTEM_PROMPT: {
    doc: 'OpenAI system prompt for this bot',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENAI_SYSTEM_PROMPT',
  },

  // Flowise configuration
  FLOWISE_API_KEY: {
    doc: 'Flowise API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_FLOWISE_API_KEY',
  },

  FLOWISE_API_BASE_URL: {
    doc: 'Flowise API base URL',
    format: String,
    default: 'http://localhost:3000/api/v1',
    env: 'BOTS_{name}_FLOWISE_API_BASE_URL',
  },

  // OpenWebUI configuration
  OPENWEBUI_API_KEY: {
    doc: 'OpenWebUI API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENWEBUI_API_KEY',
  },

  OPENWEBUI_API_URL: {
    doc: 'OpenWebUI API URL',
    format: String,
    default: 'http://localhost:3000/api/',
    env: 'BOTS_{name}_OPENWEBUI_API_URL',
  },

  // OpenSwarm configuration
  OPENSWARM_BASE_URL: {
    doc: 'OpenSwarm API base URL',
    format: String,
    default: 'http://localhost:8000/v1',
    env: 'BOTS_{name}_OPENSWARM_BASE_URL',
  },

  OPENSWARM_API_KEY: {
    doc: 'OpenSwarm API key',
    format: String,
    default: 'dummy-key',
    env: 'BOTS_{name}_OPENSWARM_API_KEY',
  },

  OPENSWARM_TEAM: {
    doc: 'OpenSwarm team name (used as model)',
    format: String,
    default: 'default-team',
    env: 'BOTS_{name}_OPENSWARM_TEAM',
  },
};

// BotConfig interface is now imported from @src/types/config

export class BotConfigurationManager {
  private static instance: BotConfigurationManager;
  private bots = new Map<string, BotConfig>();
  private legacyMode = false;
  private warnings: string[] = [];
  private userConfigStore = UserConfigStore.getInstance();

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
    const discoveredBots = this.discoverBotNamesFromEnv();
    const fileBots = this.discoverBotNamesFromFiles();

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
   * Auto-discover bot names by scanning config/bots directory
   */
  private discoverBotNamesFromFiles(): string[] {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const botsDir = path.join(configDir, 'bots');

    if (!fs.existsSync(botsDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(botsDir);
      return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
    } catch (e) {
      debug(`Error reading bots directory: ${e}`);
      return [];
    }
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
      if (!upper.startsWith(prefix)) { continue; }

      for (const schemaKey of schemaKeys) {
        const suffix = `_${schemaKey}`;
        if (!upper.endsWith(suffix)) { continue; }
        const namePart = upper.slice(prefix.length, upper.length - suffix.length);
        if (!namePart) { break; }
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
    // Validate botName parameter
    if (!botName || typeof botName !== 'string' || botName.trim() === '') {
      debug(`Invalid bot name provided: ${botName}`);
      return null;
    }

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
              envVar,
            });
            this.warnings.push(`Invalid value for ${envVar}: ${error.message}`);
          } else {
            const configError = new ConfigurationError(
              `Invalid configuration value for ${envVar}`,
              envVar,
              'string',
              typeof error,
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
      llmProfile: (botConfig.get('LLM_PROFILE') as string) || undefined,
      responseProfile: (botConfig.get('RESPONSE_PROFILE') as string) || undefined,
      persona: botConfig.get('PERSONA') as string || 'default',
      systemInstruction: botConfig.get('SYSTEM_INSTRUCTION') as string,
      mcpServers: botConfig.get('MCP_SERVERS') as McpServerConfig[] || [],
      mcpGuard: botConfig.get('MCP_GUARD') as McpGuardConfig || { enabled: false, type: 'owner' },
      mcpGuardProfile: (botConfig.get('MCP_GUARD_PROFILE') as string) || undefined,
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

    const assignIfAllowed = (field: keyof BotOverride, envKey: string): void => {
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

      (config as Record<string, unknown>)[field] = clonedValue;
    };

    assignIfAllowed('messageProvider', 'MESSAGE_PROVIDER');
    assignIfAllowed('llmProvider', 'LLM_PROVIDER');
    assignIfAllowed('llmProfile', 'LLM_PROFILE');
    assignIfAllowed('responseProfile', 'RESPONSE_PROFILE');
    assignIfAllowed('persona', 'PERSONA');
    assignIfAllowed('systemInstruction', 'SYSTEM_INSTRUCTION');
    assignIfAllowed('mcpServers', 'MCP_SERVERS');
    assignIfAllowed('mcpGuard', 'MCP_GUARD');
    assignIfAllowed('mcpGuardProfile', 'MCP_GUARD_PROFILE');
    assignIfAllowed('mcpServerProfile', 'MCP_SERVER_PROFILE');

    if (!config.mcpGuard) {
      config.mcpGuard = { enabled: false, type: 'owner' };
    }
    if (!config.mcpServers) {
      config.mcpServers = [];
    }

    this.applyLlmProfile(config);
    this.applyGuardrailProfile(config);
    this.applyMcpServerProfile(config);
  }

  private applyLlmProfile(config: BotConfig): void {
    const llmProfileName = (config as { llmProfile?: string }).llmProfile as string | undefined;
    if (llmProfileName) {
      const profile = getLlmProfileByKey(llmProfileName);
      if (!profile) {
        debug(`Unknown LLM provider profile "${llmProfileName}"`);
      } else if (profile.provider !== config.llmProvider) {
        debug(`LLM profile "${llmProfileName}" provider "${profile.provider}" does not match bot provider "${config.llmProvider}"`);
      } else {
        const profileConfig = this.ensureProfileConfig(profile.config);
        this.applyLlmProfileConfig(config, profileConfig);
      }
    }
  }

  private ensureProfileConfig(rawConfig: unknown): Record<string, unknown> {
    if (rawConfig && typeof rawConfig === 'object') {
      return rawConfig as Record<string, unknown>;
    }
    return {};
  }

  private applyLlmProfileConfig(config: BotConfig, profileConfig: Record<string, unknown>): void {
    if (config.llmProvider === 'openai') {
      const normalized = this.normalizeOpenAiProfile(profileConfig);
      if (!config.openai) {
        config.openai = {
          apiKey: '',
          model: undefined,
          baseUrl: undefined,
          systemPrompt: undefined,
        };
      }
      this.mergeMissing(config.openai as unknown as Record<string, unknown>, normalized);
      return;
    }

    if (config.llmProvider === 'flowise') {
      const normalized = this.normalizeFlowiseProfile(profileConfig);
      if (!config.flowise) {
        config.flowise = {
          apiKey: '',
          apiBaseUrl: undefined,
        };
      }
      this.mergeMissing(config.flowise as unknown as Record<string, unknown>, normalized);
      return;
    }

    if (config.llmProvider === 'openwebui') {
      const normalized = this.normalizeOpenWebuiProfile(profileConfig);
      if (!config.openwebui) {
        config.openwebui = {
          apiKey: '',
          apiUrl: undefined,
        };
      }
      this.mergeMissing(config.openwebui as unknown as Record<string, unknown>, normalized);
      return;
    }

    if (config.llmProvider === 'openswarm') {
      const normalized = this.normalizeOpenSwarmProfile(profileConfig);
      if (!config.openswarm) {
        config.openswarm = {
          baseUrl: undefined,
          apiKey: undefined,
          team: undefined,
        };
      }
      this.mergeMissing(config.openswarm as unknown as Record<string, unknown>, normalized);
    }
  }

  private mergeMissing(target: Record<string, unknown>, incoming: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(incoming)) {
      if (value === undefined || value === null) {
        continue;
      }
      const current = target[key];
      if (current === undefined || current === null || (typeof current === 'string' && current.trim() === '')) {
        target[key] = value;
      }
    }
  }

  private normalizeOpenAiProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
    return {
      apiKey: this.readString(profileConfig, 'apiKey'),
      model: this.readString(profileConfig, 'model'),
      baseUrl: this.readString(profileConfig, 'baseUrl'),
      systemPrompt: this.readString(profileConfig, 'systemPrompt'),
    };
  }

  private normalizeFlowiseProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
    return {
      apiKey: this.readString(profileConfig, 'apiKey'),
      apiBaseUrl: this.readString(profileConfig, 'apiBaseUrl'),
    };
  }

  private normalizeOpenWebuiProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
    return {
      apiKey: this.readString(profileConfig, 'apiKey'),
      apiUrl: this.readString(profileConfig, 'apiUrl'),
    };
  }

  private normalizeOpenSwarmProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
    return {
      baseUrl: this.readString(profileConfig, 'baseUrl'),
      apiKey: this.readString(profileConfig, 'apiKey'),
      team: this.readString(profileConfig, 'team'),
    };
  }

  private readString(profileConfig: Record<string, unknown>, key: string): string | undefined {
    const value = profileConfig[key];
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private applyGuardrailProfile(config: BotConfig): void {
    const profileName = (config as { mcpGuardProfile?: string }).mcpGuardProfile as string | undefined;
    if (!profileName) {
      return;
    }

    const profile = getGuardrailProfileByKey(profileName);
    if (!profile) {
      debug(`Unknown MCP guard profile "${profileName}"`);
      return;
    }

    // Access mcpGuard from profile.guards.mcpGuard
    const mcpGuard = profile.guards?.mcpGuard || { enabled: false, type: 'owner' };

    const allowed = Array.isArray(mcpGuard.allowedUsers)
      ? mcpGuard.allowedUsers.filter(Boolean)
      : undefined;

    const allowedTools = Array.isArray(mcpGuard.allowedTools)
      ? mcpGuard.allowedTools.filter(Boolean)
      : undefined;

    config.mcpGuard = {
      enabled: Boolean(mcpGuard.enabled),
      type: mcpGuard.type === 'custom' ? 'custom' : 'owner',
      allowedUsers: allowed,
      allowedUserIds: allowed,
      allowedTools: allowedTools,
    } as McpGuardConfig;

    // Access rateLimit from profile.guards.rateLimit
    const rateLimit = profile.guards?.rateLimit;
    if (rateLimit) {
      config.rateLimit = {
        enabled: Boolean(rateLimit.enabled),
        maxRequests: rateLimit.maxRequests,
        windowMs: rateLimit.windowMs,
      };
    }

    // Access contentFilter from profile.guards.contentFilter
    const contentFilter = profile.guards?.contentFilter;
    if (contentFilter) {
      config.contentFilter = {
        enabled: Boolean(contentFilter.enabled),
        strictness: contentFilter.strictness,
        blockedTerms: contentFilter.blockedTerms,
      };
    }
  }

  private applyMcpServerProfile(config: BotConfig): void {
    const profileName = (config as { mcpServerProfile?: string }).mcpServerProfile as string | undefined;
    if (!profileName) {
      return;
    }

    const profile = getMcpServerProfileByKey(profileName);
    if (!profile) {
      debug(`Unknown MCP server profile "${profileName}"`);
      return;
    }

    // Merge profile's mcpServers with existing ones (profile servers first, then explicit)
    const profileServers = Array.isArray(profile.mcpServers) ? profile.mcpServers : [];
    const existingServers = Array.isArray(config.mcpServers) ? config.mcpServers : [];

    // Combine: profile servers + existing servers (dedup by name)
    const seenNames = new Set<string>();
    const merged: McpServerConfig[] = [];

    for (const server of profileServers) {
      if (server.name && !seenNames.has(server.name)) {
        seenNames.add(server.name);
        merged.push(server);
      }
    }
    for (const server of existingServers) {
      const name = (server as { name?: string }).name;
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        merged.push(server);
      }
    }

    config.mcpServers = merged;
    debug(`Applied MCP server profile "${profileName}": ${merged.length} servers`);
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
    if (process.env.OPENAI_API_KEY) { return 'openai'; }
    if (process.env.FLOWISE_API_KEY) { return 'flowise'; }
    if (process.env.OPENWEBUI_API_KEY) { return 'openwebui'; }
    if (process.env.OPENSWARM_BASE_URL) { return 'openswarm'; }
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
   * Get a specific bot by name
   */
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
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const botsDir = path.join(configDir, 'bots'); // Or wherever bots are stored

    // Ensure unique name/ID
    const safeName = config.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filePath = path.join(botsDir, `${safeName}.json`);

    if (fs.existsSync(filePath)) {
      throw new Error(`Bot with defined filename ${safeName}.json already exists`);
    }

    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
    }

    // Write config
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));

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
    delete (config as any)._updatedAt;

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

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const botsDir = path.join(configDir, 'bots');
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filePath = path.join(botsDir, `${safeName}.json`);

    // For env-var configured bots, we store overrides in a JSON file
    // These overrides take precedence over env vars
    let currentConfig: Record<string, unknown> = {};

    if (fs.existsSync(filePath)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        debug(`Failed to read existing bot config ${filePath}: ${e}`);
      }
    }

    // Merge updates
    const mergedConfig = {
      ...currentConfig,
      ...updates,
      name, // Ensure name is preserved
      _updatedAt: new Date().toISOString(),
    };

    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(mergedConfig, null, 2));
    debug(`Updated bot config for ${name} at ${filePath}`);

    // Reload to apply changes
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

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      debug(`Deleted bot config for ${name} at ${filePath}`);
    } else {
      // Check if it's an environment variable bot
      const envBotNames = this.discoverBotNamesFromEnv();
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
      warnings: [],
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
}

export default BotConfigurationManager;
