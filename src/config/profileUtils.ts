import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:profileUtils');

export const getProfilesPath = (filename: string): string => {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  return path.join(configDir, filename);
};

export interface ProfileLoaderOptions<T> {
  filename: string;
  defaultData: T;
  validateAndMigrate: (parsed: any) => T;
  profileType: string;
}

export const loadProfiles = <T>(options: ProfileLoaderOptions<T>): T => {
  const { filename, defaultData, validateAndMigrate, profileType } = options;
  const filePath = getProfilesPath(filename);

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return validateAndMigrate(parsed);
    }

    // Create scaffolding if missing
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
      debug(`Created scaffolding for ${profileType} profiles at`, filePath);
      return Array.isArray(defaultData)
        ? ([...defaultData] as unknown as T)
        : { ...defaultData };
    } catch (err) {
      debug('Failed to create scaffolding:', err);
      return Array.isArray(defaultData)
        ? ([...defaultData] as unknown as T)
        : { ...defaultData };
    }
  } catch (error) {
    debug(`Failed to load ${profileType} profiles, using defaults:`, error);
    return Array.isArray(defaultData)
      ? ([...defaultData] as unknown as T)
      : { ...defaultData };
  }
};

export const saveProfiles = <T>(filename: string, profiles: T): void => {
  const filePath = getProfilesPath(filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
};

export const findProfileByKey = <T, K extends keyof T>(
  profiles: T[],
  keyField: K,
  keyValue: string
): T | undefined => {
  const normalized = keyValue.trim().toLowerCase();
  return profiles.find((profile) => {
    const pVal = profile[keyField];
    return typeof pVal === 'string' && pVal.toLowerCase() === normalized;
  });
};

/**
 * Build a Map from an array of profiles for O(1) lookups.
 * Keys are normalized to lowercase for case-insensitive matching.
 */
export const buildProfileMap = <T extends Record<string, any>>(
  profiles: T[],
  keyField: keyof T = 'key'
): Map<string, T> => {
  const map = new Map<string, T>();
  for (const profile of profiles) {
    const key = String(profile[keyField]).toLowerCase();
    map.set(key, profile);
  }
  return map;
};

/**
 * O(1) lookup using a pre-built profile Map.
 * Falls back to O(n) scan if map is not provided.
 */
export const getProfileByKey = <T extends Record<string, any>>(
  profiles: T[],
  key: string,
  keyField: keyof T = 'key',
  profileMap?: Map<string, T>
): T | undefined => {
  const normalized = key.trim().toLowerCase();
  if (profileMap) {
    return profileMap.get(normalized);
  }
  // Fallback to O(n) scan for backwards compatibility
  return findProfileByKey(profiles, keyField, key);
};
