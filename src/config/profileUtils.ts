import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:profileUtils');

export interface ProfileLoaderOptions<T> {
  filename: string;
  defaultData: T;
  validateAndMigrate: (parsed: any) => T;
  profileType: string;
}

export const getProfilesPath = (filename: string): string => {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  return path.join(configDir, filename);
};

export const loadProfiles = <T>(options: ProfileLoaderOptions<T>): T => {
  const { filename, defaultData, validateAndMigrate, profileType } = options;
  const filePath = getProfilesPath(filename);

  try {
    if (!fs.existsSync(filePath)) {
      // Create scaffolding if missing
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        debug(`Created scaffolding for ${profileType} profiles at`, filePath);
        return Array.isArray(defaultData) ? [ ...defaultData ] as unknown as T : { ...defaultData };
      } catch (err) {
        debug('Failed to create scaffolding:', err);
        return Array.isArray(defaultData) ? [ ...defaultData ] as unknown as T : { ...defaultData };
      }
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return validateAndMigrate(parsed);
  } catch (error) {
    debug(`Failed to load ${profileType} profiles, using defaults:`, error);
    return Array.isArray(defaultData) ? [ ...defaultData ] as unknown as T : { ...defaultData };
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
