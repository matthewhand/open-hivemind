import convict from 'convict';
import path from 'path';

const slackConfig = convict({
  SLACK_BOT_TOKEN: {
    doc: 'Comma-separated Slack bot tokens for API access',
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
    doc: 'Comma-separated Slack signing secrets for verifying requests',
    format: String,
    default: '',
    env: 'SLACK_SIGNING_SECRET'
  },
  SLACK_JOIN_CHANNELS: {
    doc: 'Comma-separated channel IDs to join',
    format: String,
    default: '',
    env: 'SLACK_JOIN_CHANNELS'
  },
  SLACK_DEFAULT_CHANNEL_ID: {
    doc: 'Default channel ID for messages',
    format: String,
    default: '',
    env: 'SLACK_DEFAULT_CHANNEL_ID'
  },
  SLACK_MODE: {
    doc: 'Slack connection mode (socket or rtm)',
    format: ['socket', 'rtm'],
    default: 'socket',
    env: 'SLACK_MODE'
  },
  SLACK_BOT_JOIN_CHANNEL_MESSAGE: {
    doc: 'Markdown welcome message for bot joining a channel (use {channel} for dynamic channel ID)',
    format: String,
    default: '# Bot joined the {channel} channel! :robot_face:\n\nWelcome! I\'m here to assist. [Get Started](action:start_{channel})',
    env: 'SLACK_BOT_JOIN_CHANNEL_MESSAGE'
  },
  SLACK_USER_JOIN_CHANNEL_MESSAGE: {
    doc: 'Markdown welcome message for a user joining a channel (use {user} and {channel} for dynamic values)',
    format: String,
    default: '# Welcome, {user}, to the {channel} channel! :wave:\n\n',
    env: 'SLACK_USER_JOIN_CHANNEL_MESSAGE'
  },
  SLACK_BUTTON_MAPPINGS: {
    doc: 'JSON string mapping button action IDs to hardcoded user messages (e.g., {"action_id": "message"})',
    format: String,
    default: '{}',
    env: 'SLACK_BUTTON_MAPPINGS'
  }
});

slackConfig.loadFile(path.join(__dirname, '../../config/providers/slack.json'));
slackConfig.validate({ allowed: 'strict' });

export default slackConfig;
