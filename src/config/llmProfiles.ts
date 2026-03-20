import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import llmConfig from './llmConfig';
import { UserConfigStore } from './UserConfigStore';

const debug = Debug('app:llmProfiles');

export type LlmModelType = 'chat' | 'embedding' | 'both';

export interface ProviderProfile {
  key: string;
  name: string;
  description?: string;
  provider: string;
  modelType?: LlmModelType;
  config: Record<string, unknown>;
}

export interface LlmProfiles {
  llm: ProviderProfile[];
}

const DEFAULT_LLM_PROFILES: LlmProfiles = {
  llm: [],
};

export const normalizeModelType = (value: unknown): LlmModelType => {
  if (value === 'embedding' || value === 'both') {
    return value;
  }
  return 'chat';
};

export const isEmbeddingCapableProfile = (
  profile: Pick<ProviderProfile, 'modelType'> | null | undefined
): boolean => {
  const modelType = normalizeModelType(profile?.modelType);
  return modelType === 'embedding' || modelType === 'both';
};

const normalizeProfile = (profile: unknown): ProviderProfile | null => {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const candidate = profile as Partial<ProviderProfile> & { config?: Record<string, unknown> };
  if (!candidate.key || !candidate.name || !candidate.provider) {
    return null;
  }

  const config = candidate.config && typeof candidate.config === 'object' ? candidate.config : {};

  return {
    key: candidate.key,
    name: candidate.name,
    description: candidate.description,
    provider: candidate.provider,
    modelType: normalizeModelType(candidate.modelType ?? config.modelType),
    config,
  };
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
      llm: Array.isArray(parsed.llm)
        ? parsed.llm
          .map(normalizeProfile)
          .filter((profile): profile is ProviderProfile => profile !== null)
        : [],
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

export const getDefaultEmbeddingProfileKey = (): string | undefined => {
  const generalSettings = UserConfigStore.getInstance().getGeneralSettings();
  const configuredDefault = llmConfig.get('DEFAULT_EMBEDDING_PROVIDER');
  const profileKey =
    (typeof configuredDefault === 'string' && configuredDefault.trim() !== ''
      ? configuredDefault
      : undefined) || generalSettings.defaultEmbeddingProfile;

  return typeof profileKey === 'string' && profileKey.trim() !== '' ? profileKey.trim() : undefined;
};

export const getEmbeddingProfileByKey = (key: string): ProviderProfile | undefined => {
  const profile = getLlmProfileByKey(key);
  return isEmbeddingCapableProfile(profile) ? profile : undefined;
};

export const resolveEmbeddingProfileKey = (profileKey?: string): string | undefined => {
  const resolvedKey = profileKey?.trim() || getDefaultEmbeddingProfileKey();
  if (!resolvedKey) {
    return undefined;
  }

  return getEmbeddingProfileByKey(resolvedKey)?.key;
};

export const getLlmProfiles = (): LlmProfiles => loadLlmProfiles();
