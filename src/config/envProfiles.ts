/**
 * Environment-variable-defined provider profiles.
 *
 * Allows defining LLM / message / memory provider profiles entirely via env
 * vars so deployments with ephemeral filesystems (e.g. Fly.io) can configure
 * "providers → bots" without relying on config/*.json files:
 *
 *   MESSAGE_PROFILE_DISCOMAIN_PROVIDER=discord
 *   MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN=...
 *   LLM_PROFILE_GPT4MAIN_PROVIDER=openai
 *   LLM_PROFILE_GPT4MAIN_API_KEY=sk-...
 *   BOTS_HIVE1_MESSAGE_PROFILE=discomain
 *   BOTS_HIVE1_LLM_PROFILE=gpt4main
 *
 * Grammar: (LLM|MESSAGE|MEMORY)_PROFILE_<KEY>_<FIELD>
 *   - <KEY> is alphanumeric (no underscores) and becomes the lowercase
 *     profile key.
 *   - Reserved fields: PROVIDER (required), NAME, DESCRIPTION, and (LLM only)
 *     MODEL_TYPE. All other fields are snake→camelCased into the profile
 *     config (BOT_TOKEN → botToken, API_KEY → apiKey).
 *   - Values 'true'/'false' (case-insensitive) are coerced to booleans;
 *     empty values are ignored.
 *
 * Env-defined profiles are merged over file profiles at read time (see
 * llmProfiles.ts / messageProfiles.ts / memoryProfiles.ts) and are never
 * written back to disk.
 */

import Debug from 'debug';

const debug = Debug('app:envProfiles');

export type EnvProfileType = 'llm' | 'message' | 'memory';

export interface EnvProfile {
  key: string;
  name: string;
  description?: string;
  provider: string;
  /** Raw MODEL_TYPE value (LLM profiles only); normalized by the consumer. */
  modelType?: string;
  config: Record<string, unknown>;
  source: 'env';
}

const ENV_PROFILE_RE = /^(LLM|MESSAGE|MEMORY)_PROFILE_([A-Z0-9]+)_([A-Z0-9_]+)$/;

const TYPE_MAP: Record<string, EnvProfileType> = {
  LLM: 'llm',
  MESSAGE: 'message',
  MEMORY: 'memory',
};

let cache: Record<EnvProfileType, EnvProfile[]> | null = null;

/** Convert SCREAMING_SNAKE field names to camelCase (BOT_TOKEN → botToken). */
export function envFieldToCamel(field: string): string {
  const parts = field.toLowerCase().split('_').filter(Boolean);
  return parts
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function coerceValue(raw: string): unknown {
  const lowered = raw.trim().toLowerCase();
  if (lowered === 'true') return true;
  if (lowered === 'false') return false;
  return raw;
}

function buildCache(): Record<EnvProfileType, EnvProfile[]> {
  // type → key → partial profile
  const groups = new Map<string, { type: EnvProfileType; key: string; fields: Map<string, string> }>();

  for (const envKey of Object.keys(process.env)) {
    const match = ENV_PROFILE_RE.exec(envKey);
    if (!match) continue;
    const value = process.env[envKey];
    if (value === undefined || value.trim() === '') continue;

    const type = TYPE_MAP[match[1]];
    const profileKey = match[2].toLowerCase();
    const field = match[3];

    const groupId = `${type}:${profileKey}`;
    let group = groups.get(groupId);
    if (!group) {
      group = { type, key: profileKey, fields: new Map() };
      groups.set(groupId, group);
    }
    group.fields.set(field, value);
  }

  const result: Record<EnvProfileType, EnvProfile[]> = { llm: [], message: [], memory: [] };

  for (const group of groups.values()) {
    const provider = group.fields.get('PROVIDER');
    if (!provider || !provider.trim()) {
      debug(
        `Ignoring env profile "${group.type}:${group.key}": missing ` +
          `${group.type.toUpperCase()}_PROFILE_${group.key.toUpperCase()}_PROVIDER`
      );
      continue;
    }

    const profile: EnvProfile = {
      key: group.key,
      name: group.fields.get('NAME') || group.key,
      description: group.fields.get('DESCRIPTION') || undefined,
      provider: provider.trim().toLowerCase(),
      config: {},
      source: 'env',
    };

    for (const [field, raw] of group.fields.entries()) {
      if (field === 'PROVIDER' || field === 'NAME' || field === 'DESCRIPTION') continue;
      if (group.type === 'llm' && field === 'MODEL_TYPE') {
        profile.modelType = raw.trim().toLowerCase();
        continue;
      }
      profile.config[envFieldToCamel(field)] = coerceValue(raw);
    }

    result[group.type].push(profile);
    debug(`Loaded env-defined ${group.type} profile "${profile.key}" (provider: ${profile.provider})`);
  }

  return result;
}

/** Returns env-defined profiles of the given type (cached after first call). */
export function getEnvProfiles(type: EnvProfileType): EnvProfile[] {
  if (!cache) {
    cache = buildCache();
  }
  return cache[type];
}

/** Test helper: clear the parsed-profile cache so process.env changes apply. */
export function resetEnvProfilesCache(): void {
  cache = null;
}
