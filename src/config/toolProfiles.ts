import { loadProfiles, saveProfiles, findProfileByKey } from './profileUtils';

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

export const loadToolProfiles = (): ToolProfiles => {
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
};

export const getToolProfileByKey = (key: string): ToolProfile | undefined => {
  const profiles = loadToolProfiles().tool;
  return findProfileByKey(profiles, 'key', key);
};

export const getToolProfiles = (): ToolProfiles => loadToolProfiles();
