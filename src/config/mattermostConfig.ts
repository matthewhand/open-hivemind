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

mattermostConfig.loadFile(path.join(__dirname, '../../config/providers/mattermost.json'));
mattermostConfig.validate({allowed: 'strict'});

export default mattermostConfig;