import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { SlackSchema, type SlackConfig } from './schemas/slackSchema';

const debug = Debug('app:slackConfig');

/**
 * Loads and validates Slack configuration using Zod
 */
function loadSlackConfig(): SlackConfig {
  const configDir = process.env.NODE_CONFIG_DIR || './config/';
  const configPath = path.join(configDir, 'providers/slack.json');
  
  let fileConfig: Record<string, any> = {};
  
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(data);
    } else {
      debug(`Slack config file not found at ${configPath}, using environment variables and defaults`);
    }
  } catch (error) {
    debug(`Error reading slack config from ${configPath}:`, error);
  }

  // Map environment variables
  const envConfig: Record<string, any> = {};
  const mapEnv = (key: string) => {
    if (process.env[key]) envConfig[key] = process.env[key];
  };

  const keys: (keyof SlackConfig)[] = [
    'SLACK_BOT_TOKEN',
    'SLACK_APP_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_JOIN_CHANNELS',
    'SLACK_DEFAULT_CHANNEL_ID',
    'SLACK_MODE',
    'SLACK_BOT_JOIN_CHANNEL_MESSAGE',
    'SLACK_USER_JOIN_CHANNEL_MESSAGE',
    'SLACK_BOT_LEARN_MORE_MESSAGE',
    'SLACK_BUTTON_MAPPINGS',
    'WELCOME_RESOURCE_URL',
    'REPORT_ISSUE_URL'
  ];

  keys.forEach(mapEnv);

  const combinedConfig = {
    ...fileConfig,
    ...envConfig
  };

  const result = SlackSchema.safeParse(combinedConfig);
  
  if (!result.success) {
    debug('Slack configuration validation failed:', result.error.format());
    return SlackSchema.parse({});
  }

  return result.data;
}

const config = loadSlackConfig();

const slackConfig = {
  get: (key: keyof SlackConfig) => config[key],
  getProperties: () => config,
  validate: (options: { allowed: 'strict' | 'warn' }) => {
    SlackSchema.parse(config);
  }
};

export default slackConfig;
