import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DiscordSchema, type DiscordConfig } from './schemas/discordSchema';

export { DiscordConfig };
const debug = Debug('app:discordConfig');

/**
 * Loads and validates Discord configuration using Zod
 */
function loadDiscordConfig(): DiscordConfig {
  const configDir = process.env.NODE_CONFIG_DIR || './config/';
  const configPath = path.join(configDir, 'providers/discord.json');
  
  let fileConfig: Record<string, any> = {};
  
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(data);
    } else {
      debug(`Discord config file not found at ${configPath}, using environment variables and defaults`);
    }
  } catch (error) {
    debug(`Error reading discord config from ${configPath}:`, error);
  }

  // Map environment variables
  const envConfig: Record<string, any> = {};
  const mapEnv = (envKey: string, configKey: string, parser?: (val: string) => any): void => {
    const val = process.env[envKey];
    if (val !== undefined) {
      envConfig[configKey] = parser ? parser(val) : val;
    }
  };

  const parseIntBase10 = (v: string): number => parseInt(v, 10);
  const parseFloatBase10 = (v: string): number => parseFloat(v);
  const parseBool = (v: string): boolean => v.toLowerCase() === 'true';

  mapEnv('DISCORD_BOT_TOKEN', 'DISCORD_BOT_TOKEN');
  mapEnv('DISCORD_CLIENT_ID', 'DISCORD_CLIENT_ID');
  mapEnv('DISCORD_GUILD_ID', 'DISCORD_GUILD_ID');
  mapEnv('DISCORD_AUDIO_FILE_PATH', 'DISCORD_AUDIO_FILE_PATH');
  mapEnv('DISCORD_WELCOME_MESSAGE', 'DISCORD_WELCOME_MESSAGE');
  mapEnv('DISCORD_MESSAGE_HISTORY_LIMIT', 'DISCORD_MESSAGE_HISTORY_LIMIT', parseIntBase10);
  mapEnv('DISCORD_CHANNEL_ID', 'DISCORD_CHANNEL_ID');
  mapEnv('DISCORD_DEFAULT_CHANNEL_ID', 'DISCORD_DEFAULT_CHANNEL_ID');
  
  // Handle both JSON and comma-separated string formats for channel bonuses
  if (process.env.DISCORD_CHANNEL_BONUSES) {
    const val = process.env.DISCORD_CHANNEL_BONUSES;
    try {
      envConfig['DISCORD_CHANNEL_BONUSES'] = JSON.parse(val);
    } catch {
      // Not JSON, try comma-separated format: channel1:1.5,channel2:2.0
      const bonuses: Record<string, number> = {};
      val.split(',').forEach(pair => {
        const [id, weight] = pair.split(':');
        if (id && weight) {
          bonuses[id.trim()] = parseFloat(weight);
        }
      });
      if (Object.keys(bonuses).length > 0) {
        envConfig['DISCORD_CHANNEL_BONUSES'] = bonuses;
      }
    }
  }

  mapEnv('DISCORD_UNSOLICITED_CHANCE_MODIFIER', 'DISCORD_UNSOLICITED_CHANCE_MODIFIER', parseFloatBase10);
  mapEnv('DISCORD_VOICE_CHANNEL_ID', 'DISCORD_VOICE_CHANNEL_ID');
  mapEnv('DISCORD_MAX_MESSAGE_LENGTH', 'DISCORD_MAX_MESSAGE_LENGTH', parseIntBase10);
  mapEnv('DISCORD_INTER_PART_DELAY_MS', 'DISCORD_INTER_PART_DELAY_MS', parseIntBase10);
  mapEnv('DISCORD_TYPING_DELAY_MAX_MS', 'DISCORD_TYPING_DELAY_MAX_MS', parseIntBase10);
  mapEnv('DISCORD_PRIORITY_CHANNEL', 'DISCORD_PRIORITY_CHANNEL');
  mapEnv('DISCORD_PRIORITY_CHANNEL_BONUS', 'DISCORD_PRIORITY_CHANNEL_BONUS', parseFloatBase10);
  mapEnv('DISCORD_LOGGING_ENABLED', 'DISCORD_LOGGING_ENABLED', parseBool);
  mapEnv('DISCORD_MESSAGE_PROCESSING_DELAY_MS', 'DISCORD_MESSAGE_PROCESSING_DELAY_MS', parseIntBase10);
  mapEnv('DISCORD_USERNAME_OVERRIDE', 'DISCORD_USERNAME_OVERRIDE');

  const combinedConfig = {
    ...fileConfig,
    ...envConfig
  };

  const result = DiscordSchema.safeParse(combinedConfig);
  
  if (!result.success) {
    debug('Discord configuration validation failed:', result.error.format());
    if (process.env.NODE_ENV === 'test') {
      throw result.error;
    }
    return DiscordSchema.parse({});
  }

  return result.data;
}

const config = loadDiscordConfig();

const discordConfig = {
  get: (key: keyof DiscordConfig): any => config[key],
  getProperties: (): DiscordConfig => config,
  getSchema: (): any => zodToJsonSchema(DiscordSchema as any),
  validate: (options: { allowed: 'strict' | 'warn' }): void => {
    DiscordSchema.parse(config);
  }
};

export default discordConfig;
