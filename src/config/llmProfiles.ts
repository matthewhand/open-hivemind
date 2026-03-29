import llmConfig from './llmConfig';
import { UserConfigStore } from './UserConfigStore';
import { loadProfiles, saveProfiles, findProfileByKey } from './profileUtils';

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

const normalizeModelType = (value: unknown): LlmModelType => {
  if (value === 'embedding' || value === 'both') {
    return value;
  }
  return 'chat';
};

const isEmbeddingCapableProfile = (
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

const loadLlmProfiles = (): LlmProfiles => {
  return loadProfiles<LlmProfiles>({
    filename: 'llm-profiles.json',
    defaultData: DEFAULT_LLM_PROFILES,
    profileType: 'llm',
    validateAndMigrate: (parsed) => {
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
    },
  });
};

export const saveLlmProfiles = (profiles: LlmProfiles): void => {
  saveProfiles('llm-profiles.json', profiles);
};

export const getLlmProfileByKey = (key: string): ProviderProfile | undefined => {
  const profiles = loadLlmProfiles().llm;
  return findProfileByKey(profiles, 'key', key);
};

const getDefaultEmbeddingProfileKey = (): string | undefined => {
  const generalSettings = UserConfigStore.getInstance().getGeneralSettings();
  const configuredDefault = llmConfig.get('DEFAULT_EMBEDDING_PROVIDER');
  const profileKey =
    (typeof configuredDefault === 'string' && configuredDefault.trim() !== ''
      ? configuredDefault
      : undefined) || generalSettings.defaultEmbeddingProfile;

  return typeof profileKey === 'string' && profileKey.trim() !== '' ? profileKey.trim() : undefined;
};

const getEmbeddingProfileByKey = (key: string): ProviderProfile | undefined => {
  const profile = getLlmProfileByKey(key);
  return isEmbeddingCapableProfile(profile) ? profile : undefined;
};

const resolveEmbeddingProfileKey = (profileKey?: string): string | undefined => {
  const resolvedKey = profileKey?.trim() || getDefaultEmbeddingProfileKey();
  if (!resolvedKey) {
    return undefined;
  }

  return getEmbeddingProfileByKey(resolvedKey)?.key;
};

export const getLlmProfiles = (): LlmProfiles => loadLlmProfiles();
