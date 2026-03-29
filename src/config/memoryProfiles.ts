import { loadProfiles, saveProfiles, findProfileByKey } from './profileUtils';

export interface MemoryProfile {
  key: string;
  name: string;
  description?: string;
  provider: string;
  config: Record<string, unknown>;
}

export interface MemoryProfiles {
  memory: MemoryProfile[];
}

const DEFAULT_MEMORY_PROFILES: MemoryProfiles = {
  memory: [],
};

const loadMemoryProfiles = (): MemoryProfiles => {
  return loadProfiles<MemoryProfiles>({
    filename: 'memory-profiles.json',
    defaultData: DEFAULT_MEMORY_PROFILES,
    profileType: 'memory',
    validateAndMigrate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('memory profiles must be an object');
      }
      return {
        memory: Array.isArray(parsed.memory) ? parsed.memory : [],
      };
    },
  });
};

const saveMemoryProfiles = (profiles: MemoryProfiles): void => {
  saveProfiles('memory-profiles.json', profiles);
};

const getMemoryProfileByKey = (key: string): MemoryProfile | undefined => {
  const profiles = loadMemoryProfiles().memory;
  return findProfileByKey(profiles, 'key', key);
};

const getMemoryProfiles = (): MemoryProfiles => loadMemoryProfiles();
