import convict from 'convict';
import Debug from 'debug';
import path from 'path';
import fs from 'fs';

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

export interface BotConfig {
  name: string;
  messageProvider: string;
  llmProvider: string;
  discord?: {
    token: string;
    clientId?: string;
    guildId?: string;
    channelId?: string;
    voiceChannelId?: string;
  };
  slack?: {
    botToken: string;
    appToken?: string;
    signingSecret: string;
    joinChannels?: string;
    defaultChannelId?: string;
    mode?: 'socket' | 'rtm';
  };
  mattermost?: {
    serverUrl: string;
    token: string;
    channel?: string;
  };
  openai?: {
    apiKey: string;
    model?: string;
    baseUrl?: string;
  };
  flowise?: {
    apiKey: string;
    apiBaseUrl?: string;
  };
  openwebui?: {
    apiKey: string;
    apiUrl?: string;
  };
  openswarm?: {
    baseUrl?: string;
    apiKey?: string;
    team?: string;
  };
}

export class BotConfigurationManager {
  private static instance: BotConfigurationManager;
  private bots: Map<string, BotConfig> = new Map();
  private legacyMode: boolean = false;
  private warnings: string[] = [];

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

    // Check for new BOTS configuration
    const botsEnv = process.env.BOTS;
    
    if (botsEnv) {
      debug('Loading multi-bot configuration from BOTS environment variable');
      this.loadMultiBotConfiguration(botsEnv);
    } else {
      debug('Checking for legacy configuration');
      this.loadLegacyConfiguration();
    }

    // Validate configuration
    this.validateConfigurationInternal();
  }

  /**
   * Load multi-bot configuration from BOTS environment variable
   */
  private loadMultiBotConfiguration(botsEnv: string): void {
    const botNames = botsEnv.split(',').map(name => name.trim()).filter(name => name);
    
    for (const botName of botNames) {
      const config = this.createBotConfig(botName);
      if (config) {
        this.bots.set(botName, config);
      }
    }
  }

  /**
   * Create individual bot configuration
   */
  private createBotConfig(botName: string): BotConfig | null {
    const upperName = botName.toUpperCase();
    
    // Create a convict instance for this bot
    const botConfig = convict(botSchema);
    
    // Replace {name} placeholders with actual bot name
    const envVars = Object.keys(process.env);
    const botEnvVars = envVars.filter(key => key.startsWith(`BOTS_${upperName}_`));
    
    for (const envVar of botEnvVars) {
      const configKey = envVar.replace(`BOTS_${upperName}_`, '');
      const value = process.env[envVar];
      
      if (value !== undefined) {
        try {
          botConfig.set(configKey, value);
        } catch (error) {
          debug(`Warning: Invalid value for ${envVar}: ${error}`);
          this.warnings.push(`Invalid value for ${envVar}: ${error}`);
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
    
    // Build the bot configuration object
    const config: BotConfig = {
      name: botName,
      messageProvider: botConfig.get('MESSAGE_PROVIDER'),
      llmProvider: botConfig.get('LLM_PROVIDER'),
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
    
    return config;
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
          llmProvider: this.detectLegacyLlmProvider(),
          discord: {
            token,
            clientId: process.env.DISCORD_CLIENT_ID,
            guildId: process.env.DISCORD_GUILD_ID,
            channelId: process.env.DISCORD_CHANNEL_ID,
            voiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID,
          },
        };
        
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
      const warning = 'WARNING: Both BOTS and DISCORD_BOT_TOKEN environment variables are set. Using BOTS configuration.';
      console.warn(warning);
      this.warnings.push(warning);
    }
    
    if (this.bots.size === 0) {
      debug('No bot configuration found');
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
  public validateConfiguration(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.name) {
      errors.push('Bot name is required');
    }
    
    if (!config.discord && !config.slack && !config.mattermost) {
      errors.push('At least one platform configuration is required');
    }
    
    if (config.discord && !config.discord.botToken) {
      errors.push('Discord bot token is required');
    }
    
    if (config.slack && !config.slack.botToken) {
      errors.push('Slack bot token is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge configurations
   */
  public mergeConfigurations(base: any, override: any): any {
    return { ...base, ...override };
  }

  /**
   * Sanitize configuration
   */
  public sanitizeConfiguration(config: any): any {
    const sanitized = { ...config };
    if (sanitized.discord?.botToken) {
      sanitized.discord.botToken = 'secret-***';
    }
    if (sanitized.slack?.botToken) {
      sanitized.slack.botToken = 'secret-***';
    }
    return sanitized;
  }
}

export default BotConfigurationManager;