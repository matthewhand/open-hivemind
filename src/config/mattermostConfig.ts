import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { MattermostSchema, type MattermostConfig } from './schemas/mattermostSchema';

const debug = Debug('app:mattermostConfig');

/**
 * Loads and validates Mattermost configuration using Zod
 */
function loadMattermostConfig(): MattermostConfig {
  const configDir = process.env.NODE_CONFIG_DIR || './config/';
  const configPath = path.join(configDir, 'providers/mattermost.json');
  
  let fileConfig: Record<string, any> = {};
  
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(data);
    } else {
      debug(`Mattermost config file not found at ${configPath}, using environment variables and defaults`);
    }
  } catch (error) {
    debug(`Error reading Mattermost config from ${configPath}:`, error);
  }

  // Map environment variables
  const envConfig: Record<string, any> = {};
  if (process.env.MATTERMOST_SERVER_URL) envConfig.MATTERMOST_SERVER_URL = process.env.MATTERMOST_SERVER_URL;
  if (process.env.MATTERMOST_TOKEN) envConfig.MATTERMOST_TOKEN = process.env.MATTERMOST_TOKEN;
  if (process.env.MATTERMOST_CHANNEL) envConfig.MATTERMOST_CHANNEL = process.env.MATTERMOST_CHANNEL;

  const combinedConfig = {
    ...fileConfig,
    ...envConfig
  };

  const result = MattermostSchema.safeParse(combinedConfig);
  
  if (!result.success) {
    debug('Mattermost configuration validation failed:', result.error.format());
    return MattermostSchema.parse({});
  }

  return result.data;
}

const config = loadMattermostConfig();

const mattermostConfig = {
  get: (key: keyof MattermostConfig) => config[key],
  getProperties: () => config,
  validate: (options: { allowed: 'strict' | 'warn' }) => {
    MattermostSchema.parse(config);
  }
};

export default mattermostConfig;
