import llmConfig from './llmConfig';
import { UserConfigStore } from './UserConfigStore';
import { loadProfiles, saveProfiles, buildProfileMap } from './profileUtils';

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

// ⚡ Bolt Optimization: O(1) Map-based profile lookups
let profilesCache: ProviderProfile[] | null = null;
let profileMapCache: Map<string, ProviderProfile> | null = null;

const invalidateProfileMap = (): void => {
  profilesCache = null;
  profileMapCache = null;
};

const ensureProfileMap = (): void => {
  if (profileMapCache && profilesCache) {
    return;
  }
  profilesCache = loadLlmProfiles().llm;
  profileMapCache = buildProfileMap(profilesCache);
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

export const loadLlmProfiles = (): LlmProfiles => {
  invalidateProfileMap();
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
          ? (parsed.llm as unknown[])
            .map(normalizeProfile)
            .filter((profile): profile is ProviderProfile => profile !== null)
          : [],
      };
    },
  });
};

export const saveLlmProfiles = (profiles: LlmProfiles): void => {
  saveProfiles('llm-profiles.json', profiles);
  invalidateProfileMap();
};

export const getLlmProfileByKey = (key: string): ProviderProfile | undefined => {
  ensureProfileMap();
  return profileMapCache!.get(key.trim().toLowerCase());
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
