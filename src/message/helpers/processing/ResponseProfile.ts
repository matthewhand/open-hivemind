import Debug from 'debug';
import messageConfig from '@config/messageConfig';
import {
  isResponseProfileOverrideKey,
  type RESPONSE_PROFILE_OVERRIDE_KEYS,
} from '@config/responseProfiles';

const debug = Debug('app:responseProfile');

export type ResponseProfileOverrides = Partial<
  Record<(typeof RESPONSE_PROFILE_OVERRIDE_KEYS)[number], number | boolean>
>;

function normalizeProfileName(name: string): string {
  return name.trim().toLowerCase();
}

export function getResponseProfileName(botConfig?: Record<string, any>): string | undefined {
  const raw =
    botConfig?.responseProfile ?? botConfig?.RESPONSE_PROFILE ?? botConfig?.response_profile;

  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getResponseProfileOverrides(
  botConfig?: Record<string, any>
): ResponseProfileOverrides | undefined {
  const profileName = getResponseProfileName(botConfig);
  if (!profileName) {
    return undefined;
  }

  const profilesRaw = messageConfig.get('MESSAGE_RESPONSE_PROFILES');
  if (!profilesRaw || typeof profilesRaw !== 'object') {
    return undefined;
  }

  const normalizedTarget = normalizeProfileName(profileName);
  const profiles = profilesRaw as Record<string, unknown>;

  for (const [name, overrides] of Object.entries(profiles)) {
    if (normalizeProfileName(name) !== normalizedTarget) {
      continue;
    }
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      return undefined;
    }

    const filtered: ResponseProfileOverrides = {};
    for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
      if (!isResponseProfileOverrideKey(key)) {
        continue;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  debug('Response profile "%s" not found', profileName);
  return undefined;
}

export function getMessageSetting<T = unknown>(key: string, botConfig?: Record<string, any>): T {
  if (isResponseProfileOverrideKey(key)) {
    const overrides = getResponseProfileOverrides(botConfig);
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
      return overrides[key as keyof ResponseProfileOverrides] as T;
    }
  }

  return messageConfig.get(key as any) as T;
}
