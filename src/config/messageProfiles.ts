import { loadProfiles, saveProfiles, findProfileByKey } from './profileUtils';
import { getEnvProfiles } from './envProfiles';

export interface MessageProfile {
  key: string;
  name: string;
  description?: string;
  provider: string; // Corresponds to MessageProviderType (e.g., 'discord', 'slack')
  config: Record<string, unknown>;
  /** 'env' profiles come from environment variables and are read-only. */
  source?: 'env' | 'file';
}

export interface MessageProfiles {
  message: MessageProfile[];
}

const DEFAULT_MESSAGE_PROFILES: MessageProfiles = {
  message: [],
};

export const loadMessageProfiles = (): MessageProfiles => {
  const fromFile = loadProfiles<MessageProfiles>({
    filename: 'message-profiles.json',
    defaultData: DEFAULT_MESSAGE_PROFILES,
    profileType: 'message',
    validateAndMigrate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('message profiles must be an object');
      }
      return {
        message: Array.isArray(parsed.message) ? parsed.message : [],
      };
    },
  });

  // Env-defined profiles overlay file profiles (env wins on key collision)
  // and are never persisted to disk.
  const envProfiles: MessageProfile[] = getEnvProfiles('message').map((profile) => ({
    key: profile.key,
    name: profile.name,
    description: profile.description,
    provider: profile.provider,
    config: profile.config,
    source: 'env',
  }));
  if (envProfiles.length === 0) {
    return fromFile;
  }
  const envKeys = new Set(envProfiles.map((p) => p.key));
  return {
    message: [
      ...envProfiles,
      ...fromFile.message.filter((p) => !envKeys.has(String(p.key || '').toLowerCase())),
    ],
  };
};

export const saveMessageProfiles = (profiles: MessageProfiles): void => {
  // Never persist env-defined profiles (they carry secrets sourced from env).
  saveProfiles('message-profiles.json', {
    message: profiles.message.filter((p) => p.source !== 'env'),
  });
};

export const getMessageProfileByKey = (key: string): MessageProfile | undefined => {
  const profiles = loadMessageProfiles().message;
  return findProfileByKey(profiles, 'key', key);
};

export const getMessageProfiles = (): MessageProfiles => loadMessageProfiles();
