import { loadProfiles, saveProfiles, findProfileByKey } from './profileUtils';

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

const loadMessageProfiles = (): MessageProfiles => {
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
};

const getMessageProfileByKey = (key: string): MessageProfile | undefined => {
  const profiles = loadMessageProfiles().message;
  return findProfileByKey(profiles, 'key', key);
};

export const getMessageProfiles = (): MessageProfiles => loadMessageProfiles();
