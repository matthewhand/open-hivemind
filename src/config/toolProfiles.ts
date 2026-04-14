import { loadProfiles, saveProfiles, buildProfileMap } from './profileUtils';

export interface ToolProfile {
  key: string;
  name: string;
  description?: string;
  provider: string;
  config: Record<string, unknown>;
}

export interface ToolProfiles {
  tool: ToolProfile[];
}

const DEFAULT_TOOL_PROFILES: ToolProfiles = {
  tool: [],
};

// ⚡ Bolt Optimization: O(1) Map-based profile lookups
let profilesCache: ToolProfile[] | null = null;
let profileMapCache: Map<string, ToolProfile> | null = null;

const invalidateProfileMap = (): void => {
  profilesCache = null;
  profileMapCache = null;
};

const ensureProfileMap = (): void => {
  if (profileMapCache && profilesCache) {
    return;
  }
  profilesCache = loadToolProfiles().tool;
  profileMapCache = buildProfileMap(profilesCache);
};

export const loadToolProfiles = (): ToolProfiles => {
  invalidateProfileMap();
  return loadProfiles<ToolProfiles>({
    filename: 'tool-profiles.json',
    defaultData: DEFAULT_TOOL_PROFILES,
    profileType: 'tool',
    validateAndMigrate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('tool profiles must be an object');
      }
      return {
        tool: Array.isArray(parsed.tool) ? parsed.tool : [],
      };
    },
  });
};

export const saveToolProfiles = (profiles: ToolProfiles): void => {
  saveProfiles('tool-profiles.json', profiles);
  invalidateProfileMap();
};

export const getToolProfileByKey = (key: string): ToolProfile | undefined => {
  ensureProfileMap();
  return profileMapCache!.get(key.trim().toLowerCase());
};

export const getToolProfiles = (): ToolProfiles => loadToolProfiles();
