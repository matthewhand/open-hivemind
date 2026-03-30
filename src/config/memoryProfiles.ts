import { z } from 'zod';
import { loadProfiles, saveProfiles, findProfileByKey } from './profileUtils';
import { Logger } from '@common/logger';

const logger = Logger.withContext('memoryProfiles');

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

/** Known optional config fields across all memory providers. */
const knownConfigKeys = new Set([
  'apiKey',
  'baseUrl',
  'apiUrl',
  'userId',
  'agentId',
  'orgId',
  'organizationId',
  'timeoutMs',
  'timeout',
  'maxRetries',
  'llmProvider',
  'llmModel',
  'embedderModel',
  'vectorStoreProvider',
  'historyDbPath',
  'embeddingProviderId',
  'limit',
  'endpoint',
]);

/**
 * Schema for a single memory profile's `config` bag.
 * Uses `passthrough()` so unknown keys are preserved (forward compat)
 * but we log a warning about them.
 */
const MemoryProfileConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  apiUrl: z.string().optional(),
  userId: z.string().optional(),
  agentId: z.string().optional(),
  orgId: z.string().optional(),
  organizationId: z.string().optional(),
  timeoutMs: z.number().optional(),
  timeout: z.number().optional(),
  maxRetries: z.number().optional(),
  llmProvider: z.string().optional(),
  llmModel: z.string().optional(),
  embedderModel: z.string().optional(),
  vectorStoreProvider: z.string().optional(),
  historyDbPath: z.string().optional(),
  embeddingProviderId: z.string().optional(),
  limit: z.number().optional(),
  endpoint: z.string().optional(),
}).passthrough();

/**
 * Schema for a single memory profile entry.
 *  - `provider` is required
 *  - `key`, `name` are required (used by the internal profile array)
 *  - `description` is optional
 *  - `config` holds provider-specific settings
 */
export const MemoryProfileSchema = z.object({
  key: z.string().min(1, 'Profile key is required'),
  name: z.string().min(1, 'Profile name is required'),
  description: z.string().optional(),
  provider: z.string().min(1, 'Provider is required'),
  config: MemoryProfileConfigSchema.default({}),
});

export type MemoryProfile = z.infer<typeof MemoryProfileSchema>;

export interface MemoryProfiles {
  memory: MemoryProfile[];
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Validate a single profile candidate with Zod.
 * Returns the parsed profile on success, or `undefined` on failure (with a
 * structured warning logged).
 */
export function validateMemoryProfile(
  raw: unknown,
  index: number
): MemoryProfile | undefined {
  const result = MemoryProfileSchema.safeParse(raw);

  if (!result.success) {
    logger.warn('Skipping invalid memory profile', {
      index,
      raw,
      errors: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
    return undefined;
  }

  // Warn about unknown config fields (but still keep them)
  const config = result.data.config;
  const unknownKeys = Object.keys(config).filter((k) => !knownConfigKeys.has(k));
  if (unknownKeys.length > 0) {
    logger.warn('Memory profile contains unknown config fields (kept for forward compat)', {
      key: result.data.key,
      unknownFields: unknownKeys,
    });
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// Loaders / writers
// ---------------------------------------------------------------------------

const DEFAULT_MEMORY_PROFILES: MemoryProfiles = {
  memory: [],
};

export const loadMemoryProfiles = (): MemoryProfiles => {
  return loadProfiles<MemoryProfiles>({
    filename: 'memory-profiles.json',
    defaultData: DEFAULT_MEMORY_PROFILES,
    profileType: 'memory',
    validateAndMigrate: (parsed) => {
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('memory profiles must be an object');
      }

      const rawArray: unknown[] = Array.isArray(parsed.memory) ? parsed.memory : [];

      const validated: MemoryProfile[] = [];
      for (let i = 0; i < rawArray.length; i++) {
        const profile = validateMemoryProfile(rawArray[i], i);
        if (profile) {
          validated.push(profile);
        }
      }

      return { memory: validated };
    },
  });
};

export const saveMemoryProfiles = (profiles: MemoryProfiles): void => {
  saveProfiles('memory-profiles.json', profiles);
};

export const getMemoryProfileByKey = (key: string): MemoryProfile | undefined => {
  const profiles = loadMemoryProfiles().memory;
  return findProfileByKey(profiles, 'key', key);
};

export const getMemoryProfiles = (): MemoryProfiles => loadMemoryProfiles();
