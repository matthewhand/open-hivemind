/**
 * Bot configuration factory — creates BotConfig objects from convict schemas,
 * environment variables, and config files. Extracted from BotConfigurationManager.
 */

import convict from 'convict';
import Debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';
import { botSchema } from './botSchema';
import { UserConfigStore } from './UserConfigStore';
import { applyLlmProfile, applyGuardrailProfile, applyMcpServerProfile } from './botProfileHelpers';
import { ConfigurationError } from '../types/errorClasses';
import { TTLCache } from '../utils/TTLCache';

import type {
  BotConfig,
  MessageProvider,
  LlmProvider,
  McpServerConfig,
  McpGuardConfig,
  BotOverride,
  LettaSessionMode,
} from '@src/types/config';

const debug = Debug('app:BotConfigurationManager');

/**
 * Create individual bot configuration from env vars and config files.
 */
export function createBotConfig(
  botName: string,
  warnings: string[],
  configCache: TTLCache<string, Record<string, unknown>>,
  userConfigStore: UserConfigStore,
): BotConfig | null {
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
          warnings.push(`Invalid value for ${envVar}: ${error.message}`);
        } else {
          const configError = new ConfigurationError(
            `Invalid configuration value for ${envVar}`,
            envVar,
            'string',
            typeof error,
          );
          debug(`Warning: Invalid value for ${envVar}:`, configError.toJSON());
          warnings.push(`Invalid value for ${envVar}: ${configError.message}`);
        }
      }
    }
  }

  // Load bot-specific config file if exists
  const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
  const botConfigPath = path.join(configDir, `bots/${botName}.json`);

  if (fs.existsSync(botConfigPath)) {
    debug(`Loading bot-specific config for ${botName} from ${botConfigPath}`);
    const cachedConfig = configCache.get(botConfigPath);
    if (cachedConfig) {
      botConfig.load(cachedConfig);
    } else {
      botConfig.loadFile(botConfigPath);
      // Cache the raw JSON disk content to speed up subsequent loads
      try {
        const raw = JSON.parse(fs.readFileSync(botConfigPath, 'utf8'));
        configCache.set(botConfigPath, raw);
      } catch (e) {
        debug(`Failed to cache bot config ${botConfigPath}: ${e}`);
      }
    }
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
    memoryProfile: (botConfig.get('MEMORY_PROFILE') as string) || undefined,
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
  if (config.llmProvider === 'openswarm') {
    config.openswarm = {
      baseUrl: botConfig.get('OPENSWARM_BASE_URL'),
      apiKey: botConfig.get('OPENSWARM_API_KEY'),
      team: botConfig.get('OPENSWARM_TEAM'),
    };
  }

  if (config.llmProvider === 'letta') {
    config.letta = {
      agentId: botConfig.get('LETTA_AGENT_ID') || undefined,
      systemPrompt: botConfig.get('LETTA_SYSTEM_PROMPT') || undefined,
      sessionMode: (botConfig.get('LETTA_SESSION_MODE') || 'default') as LettaSessionMode,
      conversationId: botConfig.get('LETTA_CONVERSATION_ID') || undefined,
    };
  }

  applyUserOverrides(botName, config, userConfigStore);

  return config;
}

function getEnvVarName(botName: string, key: string): string {
  const envName = String(botName || '').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `BOTS_${envName}_${key}`;
}

function hasEnvOverride(botName: string, key: string): boolean {
  const envVar = getEnvVarName(botName, key);
  const value = process.env[envVar];
  return value !== undefined && value !== '';
}

function applyUserOverrides(botName: string, config: BotConfig, userConfigStore: UserConfigStore): void {
  const overrides = userConfigStore.getBotOverride(botName);
  if (!overrides) {
    return;
  }

  const assignIfAllowed = (field: keyof BotOverride, envKey: string): void => {
    const overrideValue = overrides[field];
    if (overrideValue === undefined) {
      return;
    }
    if (hasEnvOverride(botName, envKey)) {
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
  assignIfAllowed('memoryProfile', 'MEMORY_PROFILE');

  if (!config.mcpGuard) {
    config.mcpGuard = { enabled: false, type: 'owner' };
  }
  if (!config.mcpServers) {
    config.mcpServers = [];
  }

  applyLlmProfile(config);
  applyGuardrailProfile(config);
  applyMcpServerProfile(config);
}
