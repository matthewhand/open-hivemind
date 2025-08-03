import convict from 'convict';
import path from 'path';

const mattermostConfig = convict({
  MATTERMOST_SERVER_URL: {
    doc: 'Mattermost server endpoint',
    format: String,
    default: '',
    env: 'MATTERMOST_SERVER_URL'
  },
  MATTERMOST_TOKEN: {
    doc: 'Mattermost authentication token',
    format: String,
    default: '',
    env: 'MATTERMOST_TOKEN'
  },
  MATTERMOST_CHANNEL: {
    doc: 'Default Mattermost channel for messages',
    format: String,
    default: '',
    env: 'MATTERMOST_CHANNEL'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/mattermost.json');

import Debug from 'debug';
const debug = Debug('app:mattermostConfig');

try {
  mattermostConfig.loadFile(configPath);
  mattermostConfig.validate({allowed: 'strict'});
  debug(`Successfully loaded Mattermost config from ${configPath}`);
} catch (error) {
  // Fallback to defaults if config file is missing or invalid
  debug(`Warning: Could not load mattermost config from ${configPath}, using defaults`);
}

export default mattermostConfig;