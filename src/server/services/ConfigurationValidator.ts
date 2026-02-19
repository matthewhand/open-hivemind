import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import convict from 'convict';
import { getLlmDefaultStatus } from '../../config/llmDefaultStatus';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface BotConfig {
  name: string;
  messageProvider: string;
  llmProvider: string;
  llmProfile?: string;
  discord?: {
    token: string;
    clientId?: string;
    guildId?: string;
    channelId?: string;
    voiceChannelId?: string;
  } | string;
  slack?: {
    botToken: string;
    appToken?: string;
    signingSecret: string;
    joinChannels?: string;
    defaultChannelId?: string;
    mode?: 'socket' | 'rtm';
  } | string;
  mattermost?: {
    serverUrl: string;
    token: string;
    teamId?: string;
    channelId?: string;
  } | string;
  openai?: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } | string;
  flowise?: {
    apiKey: string;
    endpoint: string;
    chatflowId?: string;
  } | string;
  openwebui?: {
    apiKey: string;
    endpoint: string;
    model?: string;
  } | string;
  openswarm?: {
    apiKey: string;
    endpoint: string;
    agentId?: string;
  } | string;
  persona?: string;
  mcpGuardProfile?: string;
  responseProfile?: string;
  systemInstruction?: string;
  mcpServers?: string | string[] | { name: string; serverUrl?: string }[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  } | string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export class ConfigurationValidator {
  private botConfigManager: typeof BotConfigurationManager;
  private botSchema: convict.Schema<any>;

  constructor() {
    this.botConfigManager = BotConfigurationManager;
    this.botSchema = this.createBotSchema();
  }

  /**
   * Create bot configuration schema using convict
   */
  private createBotSchema(): convict.Schema<any> {
    return {
      name: {
        doc: 'Bot name',
        format: String,
        default: '',
      },
      messageProvider: {
        doc: 'Message provider type',
        format: ['discord', 'slack', 'mattermost', 'webhook'],
        default: 'discord',
      },
      llmProvider: {
        doc: 'LLM provider type',
        format: ['openai', 'flowise', 'openwebui', 'openswarm'],
        default: 'openai',
      },
      llmProfile: {
        doc: 'LLM provider profile',
        format: String,
        default: '',
      },
      persona: {
        doc: 'Bot persona',
        format: String,
        default: 'default',
      },
      mcpGuardProfile: {
        doc: 'MCP guardrail profile name',
        format: String,
        default: '',
      },
      responseProfile: {
        doc: 'Response profile name',
        format: String,
        default: '',
      },
      systemInstruction: {
        doc: 'System instruction',
        format: String,
        default: '',
      },
      mcpServers: {
        doc: 'MCP servers',
        format: Array,
        default: [],
      },
      mcpGuard: {
        doc: 'MCP guard configuration',
        format: Object,
        default: { enabled: false, type: 'owner' },
      },
      discord: {
        doc: 'Discord configuration',
        format: Object,
        default: null,
        nullable: true,
      },
      slack: {
        doc: 'Slack configuration',
        format: Object,
        default: null,
        nullable: true,
      },
      mattermost: {
        doc: 'Mattermost configuration',
        format: Object,
        default: null,
        nullable: true,
      },
      openai: {
        doc: 'OpenAI configuration',
        format: Object,
        default: null,
        nullable: true,
      },
      flowise: {
        doc: 'Flowise configuration',
        format: Object,
        default: null,
        nullable: true,
      },
      openwebui: {
        doc: 'OpenWebUI configuration',
        format: Object,
        default: null,
        nullable: true,
      },
      openswarm: {
        doc: 'OpenSwarm configuration',
        format: Object,
        default: null,
        nullable: true,
      },
    };
  }

  /**
   * Validate a bot configuration using convict schema
   */
  validateBotConfigWithSchema(config: BotConfig): ValidationResult {
    try {
      const configSchema = convict(this.botSchema);
      configSchema.load(config);
      configSchema.validate({ allowed: 'strict' });

      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        suggestions: [],
      };
    }
  }

  /**
   * Validate a bot configuration
   */
  validateBotConfig(config: BotConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Bot name is required');
    } else if (config.name.length < 2) {
      errors.push('Bot name must be at least 2 characters long');
    } else if (config.name.length > 50) {
      errors.push('Bot name must be less than 50 characters long');
    }

    if (!config.messageProvider) {
      errors.push('Message provider is required');
    } else {
      const validProviders = ['discord', 'slack', 'mattermost'];
      if (!validProviders.includes(config.messageProvider)) {
        errors.push(`Invalid message provider. Must be one of: ${validProviders.join(', ')}`);
      }
    }

    const normalizedLlmProvider = typeof config.llmProvider === 'string' ? config.llmProvider.trim() : '';
    const llmDefaults = getLlmDefaultStatus();
    const normalizedConfig: BotConfig = { ...config, llmProvider: normalizedLlmProvider };

    if (!normalizedLlmProvider) {
      if (!llmDefaults.configured) {
        errors.push('LLM provider is required when no default LLM provider is configured');
      } else {
        suggestions.push('No LLM provider selected; the default LLM provider will be used');
      }
    } else {
      this.validateLLMProvider(normalizedConfig, errors, warnings, suggestions);
    }

    // Provider-specific validation
    this.validateMessageProvider(config, errors, warnings, suggestions);
    this.validateLLMProvider(config, errors, warnings, suggestions);

    // Advanced configuration validation
    this.validateAdvancedConfig(config, errors, warnings, suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate message provider configuration
   */
  private validateMessageProvider(
    config: BotConfig,
    errors: string[],
    warnings: string[],
    suggestions: string[],
  ): void {
    switch (config.messageProvider) {
    case 'discord': {
      const discord = typeof config.discord === 'string' ? undefined : config.discord;
      if (!discord?.token) {
        errors.push('Discord bot token is required');
      } else if (!discord.token.startsWith('M') && !discord.token.startsWith('Bot ')) {
        warnings.push('Discord token should start with "Bot " prefix or be a valid bot token');
      }
      break;
    }

    case 'slack': {
      const slack = typeof config.slack === 'string' ? undefined : config.slack;
      if (!slack?.botToken) {
        errors.push('Slack bot token is required');
      }
      if (!slack?.signingSecret) {
        errors.push('Slack signing secret is required');
      }
      if (slack?.mode === 'socket' && !slack?.appToken) {
        warnings.push('Slack app token is recommended when using socket mode');
      }
      break;
    }

    case 'mattermost': {
      const mattermost = typeof config.mattermost === 'string' ? undefined : config.mattermost;
      if (!mattermost?.serverUrl) {
        errors.push('Mattermost server URL is required');
      } else {
        try {
          new URL(mattermost.serverUrl);
        } catch {
          errors.push('Mattermost server URL must be a valid URL');
        }
      }
      if (!mattermost?.token) {
        errors.push('Mattermost token is required');
      }
      break;
    }
    }
  }

  /**
   * Validate LLM provider configuration
   */
  private validateLLMProvider(
    config: BotConfig,
    errors: string[],
    warnings: string[],
    suggestions: string[],
  ): void {
    const provider = typeof config.llmProvider === 'string' ? config.llmProvider.trim() : '';
    if (!provider) {
      return;
    }

    switch (provider) {
    case 'openai': {
      const openai = typeof config.openai === 'string' ? undefined : config.openai;
      if (!openai?.apiKey) {
        errors.push('OpenAI API key is required');
      } else if (!openai.apiKey.startsWith('sk-')) {
        warnings.push('OpenAI API key should start with "sk-" prefix');
      }
      if (!openai?.model) {
        suggestions.push('Consider specifying an OpenAI model (e.g., gpt-3.5-turbo, gpt-4)');
      }
      break;
    }

    case 'flowise': {
      const flowise = typeof config.flowise === 'string' ? undefined : config.flowise;
      if (!flowise?.apiKey) {
        errors.push('Flowise API key is required');
      }
      if (!flowise?.endpoint) {
        errors.push('Flowise endpoint is required');
      } else {
        try {
          new URL(flowise.endpoint);
        } catch {
          errors.push('Flowise endpoint must be a valid URL');
        }
      }
      break;
    }

    case 'openwebui': {
      const openwebui = typeof config.openwebui === 'string' ? undefined : config.openwebui;
      if (!openwebui?.apiKey) {
        errors.push('OpenWebUI API key is required');
      }
      if (!openwebui?.endpoint) {
        errors.push('OpenWebUI endpoint is required');
      } else {
        try {
          new URL(openwebui.endpoint);
        } catch {
          errors.push('OpenWebUI endpoint must be a valid URL');
        }
      }
      break;
    }

    case 'openswarm': {
      const openswarm = typeof config.openswarm === 'string' ? undefined : config.openswarm;
      if (!openswarm?.apiKey) {
        errors.push('OpenSwarm API key is required');
      }
      if (!openswarm?.endpoint) {
        errors.push('OpenSwarm endpoint is required');
      } else {
        try {
          new URL(openswarm.endpoint);
        } catch {
          errors.push('OpenSwarm endpoint must be a valid URL');
        }
      }
      break;
    }
    }
  }

  /**
   * Validate advanced configuration
   */
  private validateAdvancedConfig(
    config: BotConfig,
    errors: string[],
    warnings: string[],
    suggestions: string[],
  ): void {
    // System instruction validation
    if (config.systemInstruction) {
      if (config.systemInstruction.length > 2000) {
        warnings.push('System instruction is very long and may affect response times');
      }
      if (config.systemInstruction.length < 10) {
        suggestions.push('System instruction is very short. Consider adding more detailed instructions');
      }
    }

    // MCP Server validation
    if (config.mcpServers) {
      const servers = Array.isArray(config.mcpServers) ? config.mcpServers : [config.mcpServers];
      servers.forEach((server, index) => {
        if (typeof server === 'string') {
          try {
            new URL(server);
          } catch {
            errors.push(`MCP server ${index + 1} has invalid URL format`);
          }
        }
      });
    }

    // MCP Guard validation
    const mcpGuard = typeof config.mcpGuard === 'string' ? undefined : config.mcpGuard;
    if (mcpGuard?.enabled) {
      if (mcpGuard.type === 'custom' && !mcpGuard.allowedUserIds?.length) {
        warnings.push('MCP Guard is enabled but no allowed users specified');
        suggestions.push('Add user IDs to the allowed list or consider using owner-only mode');
      }
    }

    // Persona validation
    if (config.persona) {
      const validPersonas = ['dev-assistant', 'friendly-helper', 'teacher', 'custom'];
      if (!validPersonas.includes(config.persona)) {
        warnings.push('Custom persona detected. Ensure it follows expected behavior patterns');
      }
    }
  }

  /**
   * Test bot configuration connectivity
   */
  async testBotConfig(config: BotConfig): Promise<TestResult> {
    try {
      // Test message provider connectivity
      const messageProviderTest = await this.testMessageProvider(config);

      // Test LLM provider connectivity
      const llmProviderTest = await this.testLLMProvider(config);

      const allTestsPassed = messageProviderTest.success && llmProviderTest.success;

      return {
        success: allTestsPassed,
        message: allTestsPassed
          ? 'All configuration tests passed'
          : 'Some configuration tests failed',
        details: {
          messageProvider: messageProviderTest,
          llmProvider: llmProviderTest,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Configuration test failed: ${error.message}`,
        details: error,
      };
    }
  }

  /**
   * Test message provider connectivity
   */
  private async testMessageProvider(config: BotConfig): Promise<TestResult> {
    // This would implement actual connectivity tests
    // For now, return a mock result
    return {
      success: true,
      message: 'Message provider test completed (mock)',
      details: {
        provider: config.messageProvider,
        status: 'mock_success',
      },
    };
  }

  /**
   * Test LLM provider connectivity
   */
  private async testLLMProvider(config: BotConfig): Promise<TestResult> {
    // This would implement actual connectivity tests
    // For now, return a mock result
    return {
      success: true,
      message: 'LLM provider test completed (mock)',
      details: {
        provider: config.llmProvider,
        status: 'mock_success',
      },
    };
  }

  /**
   * Validate configuration against environment variables
   */
  validateAgainstEnvironment(config: BotConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for environment variable overrides
    const envPrefix = `BOTS_${config.name.toUpperCase().replace(/[^A_Z0-9]/g, '_')}_`;

    const envMappings = {
      'MESSAGE_PROVIDER': 'messageProvider',
      'LLM_PROVIDER': 'llmProvider',
      'PERSONA': 'persona',
      'SYSTEM_INSTRUCTION': 'systemInstruction',
    };

    Object.entries(envMappings).forEach(([envKey, configKey]) => {
      const envVar = `${envPrefix}${envKey}`;
      if (process.env[envVar]) {
        warnings.push(`Configuration field '${configKey}' will be overridden by environment variable ${envVar}`);
      }
    });

    // Provider-specific environment checks
    if (config.messageProvider === 'discord') {
      if (process.env.DISCORD_BOT_TOKEN) {
        warnings.push('Discord token will be overridden by DISCORD_BOT_TOKEN environment variable');
      }
    }

    if (config.llmProvider === 'openai') {
      if (process.env.OPENAI_API_KEY) {
        warnings.push('OpenAI API key will be overridden by OPENAI_API_KEY environment variable');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }
}
