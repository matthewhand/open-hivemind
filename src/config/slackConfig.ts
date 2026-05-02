import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SlackSchema, type SlackConfig } from './schemas/slackSchema';

export { SlackConfig };
const debug = Debug('app:slackConfig');

/**
 * Loads and validates Slack configuration using Zod
 */
function loadSlackConfig(): SlackConfig {
  const configDir = process.env.NODE_CONFIG_DIR || './config/';
  const configPath = path.join(configDir, 'providers/slack.json');
  
  let fileConfig: Record<string, unknown> = {};
  
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
  const envConfig: Record<string, unknown> = {};
  
   
  const mapEnv = (envKey: string, configKey: string, parser?: (val: string) => unknown) => {
    if (process.env[envKey] !== undefined) {
   
      const val = process.env[envKey]!;
      envConfig[configKey] = parser ? parser(val) : val;
    }
  };

  const parseIntBase10 = (v: string): number => parseInt(v, 10);
  const parseBool = (v: string): boolean => v.toLowerCase() === 'true';

  mapEnv('SLACK_BOT_TOKEN', 'SLACK_BOT_TOKEN');
  mapEnv('SLACK_APP_TOKEN', 'SLACK_APP_TOKEN');
  mapEnv('SLACK_SIGNING_SECRET', 'SLACK_SIGNING_SECRET');
  mapEnv('SLACK_JOIN_CHANNELS', 'SLACK_JOIN_CHANNELS');
  mapEnv('SLACK_DEFAULT_CHANNEL_ID', 'SLACK_DEFAULT_CHANNEL_ID');
  mapEnv('SLACK_MODE', 'SLACK_MODE');
  mapEnv('SLACK_BOT_JOIN_CHANNEL_MESSAGE', 'SLACK_BOT_JOIN_CHANNEL_MESSAGE');
  mapEnv('SLACK_USER_JOIN_CHANNEL_MESSAGE', 'SLACK_USER_JOIN_CHANNEL_MESSAGE');
  mapEnv('SLACK_BOT_LEARN_MORE_MESSAGE', 'SLACK_BOT_LEARN_MORE_MESSAGE');
  mapEnv('SLACK_BUTTON_MAPPINGS', 'SLACK_BUTTON_MAPPINGS');
  mapEnv('WELCOME_RESOURCE_URL', 'WELCOME_RESOURCE_URL');
  mapEnv('REPORT_ISSUE_URL', 'REPORT_ISSUE_URL');
  mapEnv('SLACK_HELP_COMMAND_TOKEN', 'SLACK_HELP_COMMAND_TOKEN');
  mapEnv('SLACK_MAX_MESSAGE_LENGTH', 'SLACK_MAX_MESSAGE_LENGTH', parseIntBase10);
  mapEnv('SLACK_SOCKET_MODE', 'SLACK_SOCKET_MODE', parseBool);

  const combinedConfig = {
    ...fileConfig,
    ...envConfig
  };

  const result = SlackSchema.safeParse(combinedConfig);
  
  if (!result.success) {
    debug('Slack configuration validation failed:', result.error.format());
    if (process.env.NODE_ENV === 'test') {
      const err = new Error(JSON.stringify(result.error.issues));
      (err as Error & { issues: unknown }).issues = result.error.issues;
      throw err;
    }
    return SlackSchema.parse({});
  }

  return result.data;
}

const config = loadSlackConfig();

const slackConfig = {
   
   
   
   
  get: (key: keyof SlackConfig) => config[key],
   
   
   
   
  getProperties: () => config,
   
   
   
   
   
   
   
  getSchema: () => zodToJsonSchema(SlackSchema as any),
   
   
   
   
  validate: (_options: { allowed: 'strict' | 'warn' }) => {
    SlackSchema.parse(config);
  }
};

export default slackConfig;
