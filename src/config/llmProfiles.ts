import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:llmProfiles');

export interface ProviderProfile {
  key: string;
  name: string;
  description?: string;
  provider: string;
  config: Record<string, unknown>;
}

export interface LlmProfiles {
  llm: ProviderProfile[];
}

const DEFAULT_LLM_PROFILES: LlmProfiles = {
  llm: []
};

const getProfilesPath = (): string => {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  return path.join(configDir, 'llm-profiles.json');
};

export const loadLlmProfiles = (): LlmProfiles => {
  const filePath = getProfilesPath();
  try {
    if (!fs.existsSync(filePath)) {
      // Create scaffolding if missing
      const scaffold = { ...DEFAULT_LLM_PROFILES };
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(scaffold, null, 2), 'utf8');
        debug('Created scaffolding for llm profiles at', filePath);
        return scaffold;
      } catch (err) {
        debug('Failed to create scaffolding:', err);
        return scaffold;
      }
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('llm profiles must be an object');
    }
    return {
      llm: Array.isArray(parsed.llm) ? parsed.llm : [],
    };
  } catch (error) {
    debug('Failed to load llm profiles, using defaults:', error);
    return { ...DEFAULT_LLM_PROFILES, llm: [] };
  }
};

export const saveLlmProfiles = (profiles: LlmProfiles): void => {
  const filePath = getProfilesPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
};

export const getLlmProfileByKey = (key: string): ProviderProfile | undefined => {
  const normalized = key.trim().toLowerCase();
  return loadLlmProfiles().llm.find(profile => profile.key.toLowerCase() === normalized);
};

export const getLlmProfiles = (): LlmProfiles => loadLlmProfiles();
