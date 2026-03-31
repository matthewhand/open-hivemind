import convict from 'convict';
import Debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';
import { UserConfigStore } from './UserConfigStore';
import { getGuardrailProfileByKey } from './guardrailProfiles';
import { getLlmProfileByKey } from './llmProfiles';
import { getMcpServerProfileByKey } from './mcpServerProfiles';
import { ConfigurationError } from '../types/errorClasses';
import { botSchema } from './BotConfigValidator';
import type { BotConfigCache } from './BotConfigCache';

import type {
  BotConfig,
  MessageProvider,
  LlmProvider,
  McpServerConfig,
  McpGuardConfig,
  BotOverride,
  LettaSessionMode,
} from '@src/types/config';

const debug = Debug('app:BotConfigLoader');

export class BotConfigLoader {
  private userConfigStore = UserConfigStore.getInstance();

  constructor(private configCache: BotConfigCache) {}

  public discoverBotNamesFromFiles(): string[] {
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

  public discoverBotNamesFromEnv(): string[] {
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

  public createBotConfig(botName: string, warnings: string[]): BotConfig | null {
    if (!botName || typeof botName !== 'string' || botName.trim() === '') {
      debug(`Invalid bot name provided: ${botName}`);
      return null;
    }

    const upperName = botName.toUpperCase();
    const upperEnvName = upperName.replace(/[^A-Z0-9]/g, '_');

    const botConfig = convict(botSchema);

    const envVars = Object.keys(process.env);
    const prefixA = `BOTS_${upperName}_`;
    const prefixB = `BOTS_${upperEnvName}_`;

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

    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const botConfigPath = path.join(configDir, `bots/${botName}.json`);

    if (fs.existsSync(botConfigPath)) {
      debug(`Loading bot-specific config for ${botName} from ${botConfigPath}`);
      const cachedConfig = this.configCache.get(botConfigPath);
      if (cachedConfig) {
        botConfig.load(cachedConfig);
      } else {
        botConfig.loadFile(botConfigPath);
        try {
          const raw = JSON.parse(fs.readFileSync(botConfigPath, 'utf8'));
          this.configCache.set(botConfigPath, raw);
        } catch (e) {
          debug(`Failed to cache bot config ${botConfigPath}: ${e}`);
        }
      }
    }

    botConfig.validate({ allowed: 'warn' });

    const llmProvider = botConfig.get('LLM_PROVIDER') as LlmProvider;
    let llmModel: string | undefined;

    if (llmProvider === 'openai') {
      llmModel = botConfig.get('OPENAI_MODEL');
    } else if (llmProvider === 'openswarm') {
      llmModel = botConfig.get('OPENSWARM_TEAM');
    }

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

    const openaiApiKey = botConfig.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      config.openai = {
        apiKey: openaiApiKey,
        model: botConfig.get('OPENAI_MODEL'),
        baseUrl: botConfig.get('OPENAI_BASE_URL'),
        systemPrompt: botConfig.get('OPENAI_SYSTEM_PROMPT'),
      };
    }

    const flowiseApiKey = botConfig.get('FLOWISE_API_KEY');
    if (flowiseApiKey) {
      config.flowise = {
        apiKey: flowiseApiKey,
        apiBaseUrl: botConfig.get('FLOWISE_API_BASE_URL'),
      };
    }

    const openwebuiApiKey = botConfig.get('OPENWEBUI_API_KEY');
    if (openwebuiApiKey) {
      config.openwebui = {
        apiKey: openwebuiApiKey,
        apiUrl: botConfig.get('OPENWEBUI_API_URL'),
      };
    }

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
    assignIfAllowed('memoryProfile', 'MEMORY_PROFILE');

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

    const rateLimit = profile.guards?.rateLimit;
    if (rateLimit) {
      config.rateLimit = {
        enabled: Boolean(rateLimit.enabled),
        maxRequests: rateLimit.maxRequests,
        windowMs: rateLimit.windowMs,
      };
    }

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

    const profileServers = Array.isArray(profile.mcpServers) ? profile.mcpServers : [];
    const existingServers = Array.isArray(config.mcpServers) ? config.mcpServers : [];

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

  public detectLegacyLlmProvider(): string {
    if (process.env.OPENAI_API_KEY) { return 'openai'; }
    if (process.env.FLOWISE_API_KEY) { return 'flowise'; }
    if (process.env.OPENWEBUI_API_KEY) { return 'openwebui'; }
    if (process.env.OPENSWARM_BASE_URL) { return 'openswarm'; }
    return 'flowise';
  }
}
