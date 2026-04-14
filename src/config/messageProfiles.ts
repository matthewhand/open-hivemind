import { loadProfiles, saveProfiles, buildProfileMap } from './profileUtils';

export interface MessageProfile {
  key: string;
  name: string;
  description?: string;
  provider: string; // Corresponds to MessageProviderType (e.g., 'discord', 'slack')
  config: Record<string, unknown>;
}

export interface MessageProfiles {
  message: MessageProfile[];
}

const DEFAULT_MESSAGE_PROFILES: MessageProfiles = {
  message: [],
};

// ⚡ Bolt Optimization: O(1) Map-based profile lookups
let profilesCache: MessageProfile[] | null = null;
let profileMapCache: Map<string, MessageProfile> | null = null;

const invalidateProfileMap = (): void => {
  profilesCache = null;
  profileMapCache = null;
};

const ensureProfileMap = (): void => {
  if (profileMapCache && profilesCache) {
    return;
  }
  profilesCache = loadMessageProfiles().message;
  profileMapCache = buildProfileMap(profilesCache);
};

export const loadMessageProfiles = (): MessageProfiles => {
  invalidateProfileMap();
  return loadProfiles<MessageProfiles>({
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
};

export const saveMessageProfiles = (profiles: MessageProfiles): void => {
  saveProfiles('message-profiles.json', profiles);
  invalidateProfileMap();
};

export const getMessageProfileByKey = (key: string): MessageProfile | undefined => {
  ensureProfileMap();
  return profileMapCache!.get(key.trim().toLowerCase());
};

export const getMessageProfiles = (): MessageProfiles => loadMessageProfiles();
