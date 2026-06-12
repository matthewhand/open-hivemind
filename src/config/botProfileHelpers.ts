/**
 * Profile application helpers — LLM profiles, guardrail profiles, and MCP server profiles.
 * Extracted from BotConfigurationManager for modularity.
 */

import Debug from 'debug';
import { getGuardrailProfileByKey } from './guardrailProfiles';
import { getLlmProfileByKey } from './llmProfiles';
import { getMcpServerProfileByKey } from './mcpServerProfiles';
import { getMessageProfileByKey } from './messageProfiles';

import type {
  BotConfig,
  MessageProvider,
  McpServerConfig,
  McpGuardConfig,
} from '@src/types/config';

const debug = Debug('app:BotConfigurationManager');

export function applyLlmProfile(config: BotConfig): void {
  const llmProfileName = (config as { llmProfile?: string }).llmProfile as string | undefined;
  if (llmProfileName) {
    const profile = getLlmProfileByKey(llmProfileName);
    if (!profile) {
      debug(`Unknown LLM provider profile "${llmProfileName}"`);
    } else if (profile.provider !== config.llmProvider) {
      debug(`LLM profile "${llmProfileName}" provider "${profile.provider}" does not match bot provider "${config.llmProvider}"`);
    } else {
      const profileConfig = ensureProfileConfig(profile.config);
      applyLlmProfileConfig(config, profileConfig);
    }
  }
}

function ensureProfileConfig(rawConfig: unknown): Record<string, unknown> {
  if (rawConfig && typeof rawConfig === 'object') {
    return rawConfig as Record<string, unknown>;
  }
  return {};
}

function applyLlmProfileConfig(config: BotConfig, profileConfig: Record<string, unknown>): void {
  if (config.llmProvider === 'openai') {
    const normalized = normalizeOpenAiProfile(profileConfig);
    if (!config.openai) {
      config.openai = {
        apiKey: '',
        model: undefined,
        baseUrl: undefined,
        systemPrompt: undefined,
      };
    }
    mergeMissing(config.openai as unknown as Record<string, unknown>, normalized);
    return;
  }

  if (config.llmProvider === 'flowise') {
    const normalized = normalizeFlowiseProfile(profileConfig);
    if (!config.flowise) {
      config.flowise = {
        apiKey: '',
        apiBaseUrl: undefined,
      };
    }
    mergeMissing(config.flowise as unknown as Record<string, unknown>, normalized);
    return;
  }

  if (config.llmProvider === 'openwebui') {
    const normalized = normalizeOpenWebuiProfile(profileConfig);
    if (!config.openwebui) {
      config.openwebui = {
        apiKey: '',
        apiUrl: undefined,
      };
    }
    mergeMissing(config.openwebui as unknown as Record<string, unknown>, normalized);
    return;
  }

  if (config.llmProvider === 'openswarm') {
    const normalized = normalizeOpenSwarmProfile(profileConfig);
    if (!config.openswarm) {
      config.openswarm = {
        baseUrl: undefined,
        apiKey: undefined,
        team: undefined,
      };
    }
    mergeMissing(config.openswarm as unknown as Record<string, unknown>, normalized);
  }
}

export function mergeMissing(target: Record<string, unknown>, incoming: Record<string, unknown>): void {
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

function readString(profileConfig: Record<string, unknown>, key: string): string | undefined {
  const value = profileConfig[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOpenAiProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
  return {
    apiKey: readString(profileConfig, 'apiKey'),
    model: readString(profileConfig, 'model'),
    baseUrl: readString(profileConfig, 'baseUrl'),
    systemPrompt: readString(profileConfig, 'systemPrompt'),
  };
}

function normalizeFlowiseProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
  return {
    apiKey: readString(profileConfig, 'apiKey'),
    apiBaseUrl: readString(profileConfig, 'apiBaseUrl'),
  };
}

function normalizeOpenWebuiProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
  return {
    apiKey: readString(profileConfig, 'apiKey'),
    apiUrl: readString(profileConfig, 'apiUrl'),
  };
}

function normalizeOpenSwarmProfile(profileConfig: Record<string, unknown>): Record<string, unknown> {
  return {
    baseUrl: readString(profileConfig, 'baseUrl'),
    apiKey: readString(profileConfig, 'apiKey'),
    team: readString(profileConfig, 'team'),
  };
}

/**
 * Apply a message provider profile (config.messageProfile) to the bot config.
 *
 * Profile config keys follow the WebUI camelCase convention (botToken,
 * appToken, signingSecret, …); a few alias spellings are accepted. Values are
 * merged with mergeMissing(), so explicit BOTS_<NAME>_* env values always win.
 *
 * If the bot's messageProvider was never explicitly set (convict default is
 * 'discord'), the profile's provider is adopted; if it was explicit and
 * mismatches, the profile is skipped.
 */
export function applyMessageProfile(
  config: BotConfig,
  opts: { providerExplicit?: boolean } = {}
): void {
  const profileName = config.messageProfile;
  if (!profileName) {
    return;
  }

  const profile = getMessageProfileByKey(profileName);
  if (!profile) {
    debug(`Unknown message provider profile "${profileName}"`);
    return;
  }

  if (profile.provider !== config.messageProvider) {
    if (opts.providerExplicit) {
      debug(
        `Message profile "${profileName}" provider "${profile.provider}" does not match ` +
          `bot provider "${config.messageProvider}" — skipping`
      );
      return;
    }
    config.messageProvider = profile.provider as MessageProvider;
  }

  const profileConfig = ensureProfileConfig(profile.config);
  applyMessageProfileConfig(config, profileName, profileConfig);
}

function applyMessageProfileConfig(
  config: BotConfig,
  profileName: string,
  profileConfig: Record<string, unknown>
): void {
  const str = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = readString(profileConfig, key);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  };

  if (config.messageProvider === 'discord') {
    const token = str('botToken', 'token');
    if (!config.discord && !token) {
      debug(`Message profile "${profileName}" has no discord botToken — skipping`);
      return;
    }
    if (!config.discord) {
      config.discord = { token: '' };
    }
    mergeMissing(config.discord as unknown as Record<string, unknown>, {
      token,
      clientId: str('clientId'),
      guildId: str('guildId'),
      channelId: str('channelId'),
      voiceChannelId: str('voiceChannelId'),
    });
    return;
  }

  if (config.messageProvider === 'slack') {
    const botToken = str('botToken', 'token');
    if (!config.slack && !botToken) {
      debug(`Message profile "${profileName}" has no slack botToken — skipping`);
      return;
    }
    if (!config.slack) {
      config.slack = { botToken: '', signingSecret: '' };
    }
    // Literal mode wins over the WebUI's socketMode boolean.
    let mode = str('mode') as 'socket' | 'rtm' | undefined;
    if (mode !== 'socket' && mode !== 'rtm') {
      mode = undefined;
    }
    if (mode === undefined && typeof profileConfig.socketMode === 'boolean') {
      mode = profileConfig.socketMode ? 'socket' : 'rtm';
    }
    mergeMissing(config.slack as unknown as Record<string, unknown>, {
      botToken,
      appToken: str('appToken'),
      signingSecret: str('signingSecret'),
      joinChannels: str('joinChannels'),
      defaultChannelId: str('defaultChannelId', 'channelId'),
      mode,
    });
    return;
  }

  if (config.messageProvider === 'mattermost') {
    const token = str('token', 'botToken');
    if (!config.mattermost && !token) {
      debug(`Message profile "${profileName}" has no mattermost token — skipping`);
      return;
    }
    if (!config.mattermost) {
      config.mattermost = { serverUrl: '', token: '' };
    }
    mergeMissing(config.mattermost as unknown as Record<string, unknown>, {
      serverUrl: str('serverUrl'),
      token,
      channel: str('channel', 'channelId'),
    });
    return;
  }

  if (config.messageProvider === 'telegram') {
    const botToken = str('botToken', 'token');
    if (!config.telegram && !botToken) {
      debug(`Message profile "${profileName}" has no telegram botToken — skipping`);
      return;
    }
    if (!config.telegram) {
      config.telegram = { botToken: '' };
    }
    mergeMissing(config.telegram as unknown as Record<string, unknown>, {
      botToken,
      chatId: str('chatId', 'channelId'),
    });
  }
}

export function applyGuardrailProfile(config: BotConfig): void {
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

export function applyMcpServerProfile(config: BotConfig): void {
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
