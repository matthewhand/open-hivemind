import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import messageConfig from './messageConfig';
import type { ResponseProfileOverrideKey } from './responseProfiles';
import { RESPONSE_PROFILE_OVERRIDE_KEYS, RESPONSE_PROFILE_KEY_TYPES } from './responseProfiles';

const debug = Debug('app:responseProfileManager');

export interface ResponseProfile {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  isBuiltIn?: boolean;
  settings: Partial<Record<ResponseProfileOverrideKey, number | boolean>>;
}

// Built-in profiles that cannot be deleted
const BUILT_IN_PROFILES: ResponseProfile[] = [
  {
    key: 'eager',
    name: 'Eager',
    description: 'Faster responses with lower delays and higher engagement',
    enabled: true,
    isBuiltIn: true,
    settings: {
      MESSAGE_DELAY_MULTIPLIER: 0.5,
      MESSAGE_READING_DELAY_MAX_MS: 1000,
      MESSAGE_UNSOLICITED_BASE_CHANCE: 0.3,
      MESSAGE_ONLY_WHEN_SPOKEN_TO: false,
    },
  },
  {
    key: 'cautious',
    name: 'Cautious',
    description: 'Slower, more deliberate responses with longer delays',
    enabled: true,
    isBuiltIn: true,
    settings: {
      MESSAGE_DELAY_MULTIPLIER: 3.5,
      MESSAGE_READING_DELAY_MAX_MS: 8000,
      MESSAGE_UNSOLICITED_BASE_CHANCE: 0.05,
      MESSAGE_ONLY_WHEN_SPOKEN_TO: true,
    },
  },
];

const getProfilesPath = (): string => {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  return path.join(configDir, 'response-profiles.json');
};

export const loadResponseProfiles = (): ResponseProfile[] => {
  const filePath = getProfilesPath();
  try {
    if (!fs.existsSync(filePath)) {
      // Return built-in profiles as defaults
      return BUILT_IN_PROFILES.map(p => ({ ...p, settings: { ...p.settings } }));
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('response profiles must be an array');
    }

    // Merge with built-ins, ensuring built-ins always exist
    const userProfiles = parsed as ResponseProfile[];
    const result: ResponseProfile[] = [];

    const builtInKeys = new Set(BUILT_IN_PROFILES.map(b => b.key));

    const builtInUserVersions: Record<string, ResponseProfile> = {};
    const otherUserProfiles: ResponseProfile[] = [];

    // Single pass through user profiles to separate customized built-ins and custom profiles
    for (const profile of userProfiles) {
      if (builtInKeys.has(profile.key)) {
        builtInUserVersions[profile.key] = profile;
      } else {
        otherUserProfiles.push(profile);
      }
    }

    // Add built-ins first
    for (const builtIn of BUILT_IN_PROFILES) {
      const userVersion = builtInUserVersions[builtIn.key];
      if (userVersion) {
        // Allow customization of built-in but mark it
        result.push({ ...userVersion, isBuiltIn: true });
      } else {
        result.push({ ...builtIn, settings: { ...builtIn.settings } });
      }
    }

    // Add user profiles (non-built-in)
    for (const profile of otherUserProfiles) {
      result.push({ ...profile, isBuiltIn: false });
    }

    return result;
  } catch (error) {
    debug('Failed to load response profiles, using defaults:', error);
    return BUILT_IN_PROFILES.map(p => ({ ...p, settings: { ...p.settings } }));
  }
};

export const saveResponseProfiles = (profiles: ResponseProfile[]): void => {
  const filePath = getProfilesPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Save all profiles, including built-ins (in case they were customized)
  fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
};

/**
 * Finds a response profile by key, performing a case-insensitive, trimmed comparison.
 *
 * @param key The key to search for.
 * @returns The matching `ResponseProfile`, or `undefined` if not found.
 */
export const getResponseProfileByKey = (key: string): ResponseProfile | undefined => {
  const normalized = key.trim().toLowerCase();
  return loadResponseProfiles().find(profile => profile.key.toLowerCase() === normalized);
};

export const getResponseProfiles = (): ResponseProfile[] => loadResponseProfiles();

export const createResponseProfile = (profile: ResponseProfile): ResponseProfile => {
  const profiles = loadResponseProfiles();

  if (profiles.some(p => p.key === profile.key)) {
    throw new Error(`Profile with key '${profile.key}' already exists`);
  }

  const newProfile: ResponseProfile = {
    ...profile,
    isBuiltIn: false,
    enabled: profile.enabled !== false,
  };

  profiles.push(newProfile);
  saveResponseProfiles(profiles);
  return newProfile;
};

export const updateResponseProfile = (key: string, updates: Partial<ResponseProfile>): ResponseProfile => {
  const profiles = loadResponseProfiles();
  const index = profiles.findIndex(p => p.key === key);

  if (index === -1) {
    throw new Error(`Profile with key '${key}' not found`);
  }

  const existing = profiles[index];
  const updated: ResponseProfile = {
    ...existing,
    ...updates,
    key: existing.key, // Don't allow key changes
    isBuiltIn: existing.isBuiltIn, // Preserve built-in status
  };

  profiles[index] = updated;
  saveResponseProfiles(profiles);
  return updated;
};

export const deleteResponseProfile = (key: string): boolean => {
  const profiles = loadResponseProfiles();
  const profile = profiles.find(p => p.key === key);

  if (!profile) {
    throw new Error(`Profile with key '${key}' not found`);
  }

  if (profile.isBuiltIn) {
    throw new Error(`Cannot delete built-in profile '${key}'`);
  }

  const filtered = profiles.filter(p => p.key !== key);
  saveResponseProfiles(filtered);
  return true;
};

// Helper to get settings from a response profile for use in message processing
export const getResponseProfileSettings = (profileKey: string): Partial<Record<string, unknown>> | undefined => {
  const profile = getResponseProfileByKey(profileKey);
  if (!profile || profile.enabled === false) {
    return undefined;
  }
  return profile.settings;
};
