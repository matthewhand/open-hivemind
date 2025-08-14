import convict from 'convict';
import path from 'path';

const mattermostConfig = convict({
  MATTERMOST_SERVER_URL: {
    doc: 'Mattermost server endpoint',
    format: String,
    default: '',
    env: 'MATTERMOST_SERVER_URL',
    level: 'basic',
    group: 'mattermost'
  },
  MATTERMOST_TOKEN: {
    doc: 'Mattermost authentication token',
    format: String,
    default: '',
    env: 'MATTERMOST_TOKEN',
    level: 'basic',
    group: 'mattermost'
  },
  MATTERMOST_CHANNEL: {
    doc: 'Default Mattermost channel for messages',
    format: String,
    default: '',
    env: 'MATTERMOST_CHANNEL',
    level: 'basic',
    group: 'mattermost'
  },
  MATTERMOST_WS_ENABLED: {
    doc: 'Enable Mattermost WebSocket for realtime events',
    format: Boolean,
    default: true,
    env: 'MATTERMOST_WS_ENABLED',
    level: 'advanced',
    group: 'mattermost'
  },
  MATTERMOST_TYPING_ENABLED: {
    doc: 'Emit typing indicators over WS',
    format: Boolean,
    default: false,
    env: 'MATTERMOST_TYPING_ENABLED',
    level: 'advanced',
    group: 'mattermost'
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
} catch {
  // Fallback to defaults if config file is missing or invalid
  debug(`Warning: Could not load mattermost config from ${configPath}, using defaults`);
}

export default mattermostConfig;
