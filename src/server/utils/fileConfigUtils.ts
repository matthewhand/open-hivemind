import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { ErrorUtils } from '../../types/errors';

const debug = Debug('app:fileConfigUtils');

// Ensure data directory exists
export const ensureDataDir = async () => {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug('Error creating data directory:', hivemindError.message);
  }
};

// Load configurations
export const loadJsonConfig = async <T>(filePath: string, defaultValue: T, debugInstance = debug): Promise<T> => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debugInstance(`Config file ${filePath} not found, using defaults:`, hivemindError.message);
    return defaultValue;
  }
};

// Save configurations
export const saveJsonConfig = async <T>(filePath: string, data: T): Promise<void> => {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};
