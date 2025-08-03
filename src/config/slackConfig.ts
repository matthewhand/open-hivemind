import convict from 'convict';
import path from 'path';

/**
 * Slack Configuration Module
 *
 * @module slackConfig
 * @description Centralized configuration for Slack integration. Handles:
 * - Bot tokens and authentication
 * - Channel settings
 * - Welcome messages and templates
 * - Button mappings and action handlers
 *
 * Configuration can be set via:
 * - Environment variables
 * - JSON config file (config/providers/slack.json)
 * - Default values (fallback)
 *
 * @example
 * // Get configuration values
 * import slackConfig from './slackConfig';
 * const botToken = slackConfig.get('SLACK_BOT_TOKEN');
 * const mode = slackConfig.get('SLACK_MODE');
 */
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
    default: `# Welcome, {user}, to the {channel} channel! :wave:\n\nHere’s some quick info:\n- *Purpose*: Support student inquiries related to learning objectives...\n- *Resources*: [Learn More](${process.env.WELCOME_RESOURCE_URL || 'https://university.example.com/resources'})\n\n## Actions\n- [Learning Objectives](action:learn_objectives_{channel})\n- [How-To](action:how_to_{channel})\n- [Contact Support](action:contact_support_{channel})\n- [Report Issue](action:report_issue_{channel})`,
    env: 'SLACK_USER_JOIN_CHANNEL_MESSAGE'
  },
  SLACK_BOT_LEARN_MORE_MESSAGE: {
    doc: 'Message sent when "Learn More" button is clicked after bot joins a channel (use {channel} for dynamic channel ID)',
    format: String,
    default: 'Here’s more info about channel {channel}!',
    env: 'SLACK_BOT_LEARN_MORE_MESSAGE'
  },
  SLACK_BUTTON_MAPPINGS: {
    doc: 'JSON string mapping button action IDs to hardcoded user messages (e.g., {"action_id": "message"})',
    format: String,
    default: '{"learn_objectives_C08BC0X4DFD": "Learning Objectives", "how_to_C08BC0X4DFD": "How-To", "contact_support_C08BC0X4DFD": "Contact Support", "report_issue_C08BC0X4DFD": "Report Issue", "start_C08BC0X4DFD": "Get Started"}',
    env: 'SLACK_BUTTON_MAPPINGS'
  },
  WELCOME_RESOURCE_URL: {
    doc: 'URL for welcome resources linked in user join message',
    format: String,
    default: 'https://university.example.com/resources',
    env: 'WELCOME_RESOURCE_URL'
  },
  REPORT_ISSUE_URL: {
    doc: 'URL for reporting issues with the bot',
    format: String,
    default: 'https://university.example.com/report-issue',
    env: 'REPORT_ISSUE_URL'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/slack.json');

import Debug from 'debug';
const debug = Debug('app:slackConfig');

try {
  slackConfig.loadFile(configPath);
  slackConfig.validate({ allowed: 'strict' });
  debug(`Successfully loaded Slack config from ${configPath}`);
} catch (error) {
  // Fallback to defaults if config file is missing or invalid
  debug(`Warning: Could not load slack config from ${configPath}, using defaults`);
  debug('Configuration error details:', error as any);
}

export default slackConfig;
