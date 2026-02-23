import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:messageProfiles');

export interface MessageProviderProfile {
  key: string;
  name: string;
  description?: string;
  provider: string; // 'slack', 'discord', 'telegram', 'webhook', 'mattermost'
  config: Record<string, unknown>;
}

export interface MessageProfiles {
  message: MessageProviderProfile[];
}

const DEFAULT_MESSAGE_PROFILES: MessageProfiles = {
  message: [],
};

const getProfilesPath = (): string => {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  return path.join(configDir, 'message-profiles.json');
};

export const loadMessageProfiles = (): MessageProfiles => {
  const filePath = getProfilesPath();
  try {
    if (!fs.existsSync(filePath)) {
      // Create scaffolding if missing
      const scaffold = { ...DEFAULT_MESSAGE_PROFILES };
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(scaffold, null, 2), 'utf8');
        debug('Created scaffolding for message profiles at', filePath);
        return scaffold;
      } catch (err) {
        debug('Failed to create scaffolding:', err);
        return scaffold;
      }
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('message profiles must be an object');
    }
    return {
      message: Array.isArray(parsed.message) ? parsed.message : [],
    };
  } catch (error) {
    debug('Failed to load message profiles, using defaults:', error);
    return { ...DEFAULT_MESSAGE_PROFILES, message: [] };
  }
};

export const saveMessageProfiles = (profiles: MessageProfiles): void => {
  const filePath = getProfilesPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
};

export const getMessageProfileByKey = (key: string): MessageProviderProfile | undefined => {
  const normalized = key.trim().toLowerCase();
  return loadMessageProfiles().message.find(profile => profile.key.toLowerCase() === normalized);
};

export const getMessageProfiles = (): MessageProfiles => loadMessageProfiles();
