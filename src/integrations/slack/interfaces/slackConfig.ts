import convict from 'convict';

const slackConfig = convict({
  SLACK_BOT_TOKEN: {
    doc: 'Slack bot token for API access',
    format: String,
    default: '',
    env: 'SLACK_BOT_TOKEN',
  },
  SLACK_SIGNING_SECRET: {
    doc: 'Slack signing secret for verifying requests',
    format: String,
    default: '',
    env: 'SLACK_SIGNING_SECRET',
  },
  SLACK_CHANNEL_ID: {
    doc: 'Default Slack channel ID for messages',
    format: String,
    default: '',
    env: 'SLACK_CHANNEL_ID',
  },
  SLACK_DEFAULT_CHANNEL_ID: {
    doc: 'Default channel for Slack messages',
    format: String,
    default: '',
    env: 'SLACK_DEFAULT_CHANNEL_ID',
  }
});

export default slackConfig;
