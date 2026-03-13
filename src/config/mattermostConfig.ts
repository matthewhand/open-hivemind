import convict from 'convict';
import path from 'path';

export interface MattermostConfig {
  MATTERMOST_SERVER_URL: string;
  MATTERMOST_TOKEN: string;
  MATTERMOST_CHANNEL: string;
}

const mattermostConfig = convict<MattermostConfig>({
  MATTERMOST_SERVER_URL: {
    doc: 'Mattermost server endpoint',
    format: String,
    default: '',
    env: 'MATTERMOST_SERVER_URL',
  },
  MATTERMOST_TOKEN: {
    doc: 'Mattermost authentication token',
    format: String,
    default: '',
    env: 'MATTERMOST_TOKEN',
  },
  MATTERMOST_CHANNEL: {
    doc: 'Default Mattermost channel for messages',
    format: String,
    default: '',
    env: 'MATTERMOST_CHANNEL',
  },
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/mattermost.json');

import Debug from 'debug';
const debug = Debug('app:mattermostConfig');

try {
  mattermostConfig.loadFile(configPath);
  debug(`Successfully loaded Mattermost config from ${configPath}`);
} catch (error: any) {
  if (error.code !== 'ENOENT') {
    debug(`Error reading mattermost config from ${configPath}:`, error.message);
  } else {
    debug(`Mattermost config file not found at ${configPath}, using environment variables and defaults`);
  }
}

// Validation must happen outside the generic try-catch to fail fast if config is malformed
mattermostConfig.validate({ allowed: 'strict' });

export default mattermostConfig;