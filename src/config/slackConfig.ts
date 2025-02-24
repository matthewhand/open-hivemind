import convict from 'convict';
import path from 'path';

const slackConfig = convict({
  SLACK_BOT_TOKEN: {
    doc: 'Comma-separated Slack bot tokens',
    format: String,
    default: '',
    env: 'SLACK_BOT_TOKEN'
  },
  SLACK_APP_TOKEN: {
    doc: 'Comma-separated Slack app tokens for Socket Mode',
    format: String,
    default: '',
    env: 'SLACK_APP_TOKEN'
  },
  SLACK_SIGNING_SECRET: {
    doc: 'Comma-separated Slack signing secrets',
    format: String,
    default: '',
    env: 'SLACK_SIGNING_SECRET'
  },
  SLACK_JOIN_CHANNELS: {
    doc: 'Comma-separated channel IDs to join',
    format: String,
    default: 'C08BC0X4DFD',
    env: 'SLACK_JOIN_CHANNELS'
  },
  SLACK_DEFAULT_CHANNEL_ID: {
    doc: 'Default channel ID for messages',
    format: String,
    default: 'C08BC0X4DFD',
    env: 'SLACK_DEFAULT_CHANNEL_ID'
  },
  SLACK_MODE: {
    doc: 'Slack connection mode (socket or rtm)',
    format: ['socket', 'rtm'],
    default: 'socket',
    env: 'SLACK_MODE'
  }
});

slackConfig.loadFile(path.join(__dirname, '../../config/providers/slack.json'));
slackConfig.validate({ allowed: 'strict' });

export default slackConfig;
