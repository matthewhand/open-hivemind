/**
 * Profile application helpers — LLM profiles, guardrail profiles, and MCP server profiles.
 * Extracted from BotConfigurationManager for modularity.
 */

import Debug from 'debug';
import { getGuardrailProfileByKey } from './guardrailProfiles';
import { getLlmProfileByKey } from './llmProfiles';
import { getMcpServerProfileByKey } from './mcpServerProfiles';

import type {
  BotConfig,
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
