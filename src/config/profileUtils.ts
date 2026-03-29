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

export const loadProfiles = async <T>(options: ProfileLoaderOptions<T>): Promise<T> => {
  const { filename, defaultData, validateAndMigrate, profileType } = options;
  const filePath = getProfilesPath(filename);

  try {
    try {
      await fs.promises.access(filePath);
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return validateAndMigrate(parsed);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;

      // Create scaffolding if missing
      try {
        const dir = path.dirname(filePath);
        try {
          await fs.promises.access(dir);
        } catch {
          await fs.promises.mkdir(dir, { recursive: true });
        }
        await fs.promises.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
        debug(`Created scaffolding for ${profileType} profiles at`, filePath);
        return Array.isArray(defaultData) ? [ ...defaultData ] as unknown as T : { ...defaultData };
      } catch (err) {
        debug('Failed to create scaffolding:', err);
        return Array.isArray(defaultData) ? [ ...defaultData ] as unknown as T : { ...defaultData };
      }
    }
  } catch (error) {
    debug(`Failed to load ${profileType} profiles, using defaults:`, error);
    return Array.isArray(defaultData) ? [ ...defaultData ] as unknown as T : { ...defaultData };
  }
};

export const saveProfiles = async <T>(filename: string, profiles: T): Promise<void> => {
  const filePath = getProfilesPath(filename);
  const dir = path.dirname(filePath);
  try {
    await fs.promises.access(dir);
  } catch {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(filePath, JSON.stringify(profiles, null, 2));
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
