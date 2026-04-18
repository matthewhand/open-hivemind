import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { MessageSchema, type MessageConfig } from './schemas/messageSchema';

const debug = Debug('app:messageConfig');

/**
 * Loads and validates message configuration using Zod
 */
function loadMessageConfig(): MessageConfig {
  const configDir = process.env.NODE_CONFIG_DIR || './config/';
  const configPath = path.join(configDir, 'providers/message.json');

  let fileConfig: Record<string, any> = {};

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(data);
    } else {
      debug(`Message config file not found at ${configPath}, using environment variables and defaults`);
    }
  } catch (error) {
    debug(`Error reading message config from ${configPath}:`, error);
  }

  // Map environment variables
  const envConfig: Record<string, any> = {};

  // Basic mapping helper
  const mapEnv = (envKey: string, configKey: string, parser?: (val: string) => any) => {
    if (process.env[envKey] !== undefined) {
      const val = process.env[envKey]!;
      envConfig[configKey] = parser ? parser(val) : val;
    }
  };

  const parseBool = (v: string) => v.toLowerCase() === 'true';
  const parseIntBase10 = (v: string) => parseInt(v, 10);
  const parseFloatBase10 = (v: string) => parseFloat(v);
  const parseCSV = (v: string) => v.split(',').map(s => s.trim()).filter(Boolean);
  const parseJSONOrCSV = (v: string) => {
    try {
      if (v.trim().startsWith('{')) {
        return JSON.parse(v);
      }
      // Simple CSV parser for "Key: Value, Key2: Value2"
      const result: Record<string, number> = {};
      v.split(',').forEach(part => {
        const [key, val] = part.split(':').map(s => s.trim());
        if (key && val !== undefined) {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            result[key] = num;
          }
        }
      });
      return Object.keys(result).length > 0 ? result : undefined;
    } catch {
      return undefined;
    }
  };
  const parseJSON = (v: string) => {
    try {
      return JSON.parse(v);
    } catch {
      return undefined;
    }
  };

  // Map all known env vars
  mapEnv('MESSAGE_PROVIDER', 'MESSAGE_PROVIDER');
  mapEnv('MESSAGE_IGNORE_BOTS', 'MESSAGE_IGNORE_BOTS', parseBool);
  mapEnv('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL', 'MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL', parseBool);
  mapEnv('MESSAGE_SEMANTIC_RELEVANCE_ENABLED', 'MESSAGE_SEMANTIC_RELEVANCE_ENABLED', parseBool);
  mapEnv('MESSAGE_SEMANTIC_RELEVANCE_BONUS', 'MESSAGE_SEMANTIC_RELEVANCE_BONUS', parseFloatBase10);
  mapEnv('MESSAGE_ALLOW_SELF_MENTION', 'MESSAGE_ALLOW_SELF_MENTION', parseBool);
  mapEnv('MESSAGE_SUPPRESS_DUPLICATES', 'MESSAGE_SUPPRESS_DUPLICATES', parseBool);
  mapEnv('MESSAGE_DUPLICATE_WINDOW_MS', 'MESSAGE_DUPLICATE_WINDOW_MS', parseIntBase10);
  mapEnv('MESSAGE_DUPLICATE_HISTORY_SIZE', 'MESSAGE_DUPLICATE_HISTORY_SIZE', parseIntBase10);
  mapEnv('MESSAGE_ADD_USER_HINT', 'MESSAGE_ADD_USER_HINT', parseBool);
  mapEnv('DISABLE_DELAYS', 'DISABLE_DELAYS', parseBool);
  mapEnv('MESSAGE_RATE_LIMIT_PER_CHANNEL', 'MESSAGE_RATE_LIMIT_PER_CHANNEL', parseIntBase10);
  mapEnv('MESSAGE_MIN_DELAY', 'MESSAGE_MIN_DELAY', parseIntBase10);
  mapEnv('MESSAGE_READING_DELAY_BASE_MS', 'MESSAGE_READING_DELAY_BASE_MS', parseIntBase10);
  mapEnv('MESSAGE_READING_DELAY_PER_CHAR_MS', 'MESSAGE_READING_DELAY_PER_CHAR_MS', parseFloatBase10);
  mapEnv('MESSAGE_READING_DELAY_MIN_MS', 'MESSAGE_READING_DELAY_MIN_MS', parseIntBase10);
  mapEnv('MESSAGE_READING_DELAY_MAX_MS', 'MESSAGE_READING_DELAY_MAX_MS', parseIntBase10);
  mapEnv('MESSAGE_MAX_DELAY', 'MESSAGE_MAX_DELAY', parseIntBase10);
  mapEnv('MESSAGE_COMPOUNDING_DELAY_BASE_MS', 'MESSAGE_COMPOUNDING_DELAY_BASE_MS', parseIntBase10);
  mapEnv('MESSAGE_SHORT_LENGTH_PENALTY', 'MESSAGE_SHORT_LENGTH_PENALTY', parseFloatBase10);
  mapEnv('MESSAGE_COMPOUNDING_DELAY_MAX_MS', 'MESSAGE_COMPOUNDING_DELAY_MAX_MS', parseIntBase10);
  mapEnv('MESSAGE_DELAY_MULTIPLIER', 'MESSAGE_DELAY_MULTIPLIER', parseFloatBase10);
  mapEnv('MESSAGE_UNSOLICITED_BASE_CHANCE', 'MESSAGE_UNSOLICITED_BASE_CHANCE', parseFloatBase10);
  mapEnv('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS', 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS', parseIntBase10);
  mapEnv('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE', 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE', parseIntBase10);
  mapEnv('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR', 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR', parseFloatBase10);
  mapEnv('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR', 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR', parseFloatBase10);
  mapEnv('MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST', 'MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST', parseFloatBase10);
  mapEnv('MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY', 'MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY', parseIntBase10);
  mapEnv('MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD', 'MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD', parseFloatBase10);
  mapEnv('MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ', 'MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ', parseIntBase10);
  mapEnv('MESSAGE_OTHERS_TYPING_WINDOW_MS', 'MESSAGE_OTHERS_TYPING_WINDOW_MS', parseIntBase10);
  mapEnv('MESSAGE_OTHERS_TYPING_MAX_WAIT_MS', 'MESSAGE_OTHERS_TYPING_MAX_WAIT_MS', parseIntBase10);
  mapEnv('MESSAGE_ACTIVITY_TIME_WINDOW', 'MESSAGE_ACTIVITY_TIME_WINDOW', parseIntBase10);
  mapEnv('MESSAGE_WAKEWORDS', 'MESSAGE_WAKEWORDS', parseCSV);
  mapEnv('MESSAGE_ONLY_WHEN_SPOKEN_TO', 'MESSAGE_ONLY_WHEN_SPOKEN_TO', parseBool);
  mapEnv('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS', 'MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS', parseIntBase10);
  mapEnv('MESSAGE_INTERACTIVE_FOLLOWUPS', 'MESSAGE_INTERACTIVE_FOLLOWUPS', parseBool);
  mapEnv('MESSAGE_UNSOLICITED_ADDRESSED', 'MESSAGE_UNSOLICITED_ADDRESSED', parseBool);
  mapEnv('MESSAGE_UNSOLICITED_UNADDRESSED', 'MESSAGE_UNSOLICITED_UNADDRESSED', parseBool);
  mapEnv('MESSAGE_RESPOND_IN_THREAD', 'MESSAGE_RESPOND_IN_THREAD', parseBool);
  mapEnv('MESSAGE_THREAD_RELATION_WINDOW', 'MESSAGE_THREAD_RELATION_WINDOW', parseIntBase10);
  mapEnv('MESSAGE_RECENT_ACTIVITY_DECAY_RATE', 'MESSAGE_RECENT_ACTIVITY_DECAY_RATE', parseFloatBase10);
  mapEnv('MESSAGE_INTERROBANG_BONUS', 'MESSAGE_INTERROBANG_BONUS', parseFloatBase10);
  mapEnv('MESSAGE_BOT_RESPONSE_MODIFIER', 'MESSAGE_BOT_RESPONSE_MODIFIER', parseFloatBase10);
  mapEnv('MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION', 'MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION', parseBool);
  mapEnv('MESSAGE_MAX_GENERATION_RETRIES', 'MESSAGE_MAX_GENERATION_RETRIES', parseIntBase10);
  mapEnv('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED', 'MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED', parseBool);
  mapEnv('MESSAGE_COMMAND_INLINE', 'MESSAGE_COMMAND_INLINE', parseBool);
  mapEnv('MESSAGE_COMMAND_AUTHORISED_USERS', 'MESSAGE_COMMAND_AUTHORISED_USERS');
  mapEnv('MESSAGE_LLM_FOLLOW_UP', 'MESSAGE_LLM_FOLLOW_UP', parseBool);
  mapEnv('MESSAGE_FOLLOW_UP_ENABLED', 'MESSAGE_FOLLOW_UP_ENABLED', parseBool);
  mapEnv('MESSAGE_LLM_CHAT', 'MESSAGE_LLM_CHAT', parseBool);
  mapEnv('MESSAGE_LLM_COMPLETE_SENTENCE', 'MESSAGE_LLM_COMPLETE_SENTENCE', parseBool);
  mapEnv('MESSAGE_LLM_SUMMARISE', 'MESSAGE_LLM_SUMMARISE', parseBool);
  mapEnv('MESSAGE_COMMAND_SLASH', 'MESSAGE_COMMAND_SLASH', parseBool);
  mapEnv('MESSAGE_WEBHOOK_ENABLED', 'MESSAGE_WEBHOOK_ENABLED', parseBool);
  mapEnv('MESSAGE_MENTION_BONUS', 'MESSAGE_MENTION_BONUS', parseFloatBase10);
  mapEnv('MESSAGE_FILTER_BY_USER', 'MESSAGE_FILTER_BY_USER');
  mapEnv('MESSAGE_HISTORY_LIMIT', 'MESSAGE_HISTORY_LIMIT', parseIntBase10);
  mapEnv('MESSAGE_HISTORY_ADAPTIVE_ENABLED', 'MESSAGE_HISTORY_ADAPTIVE_ENABLED', parseBool);
  mapEnv('MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT', 'MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT', parseIntBase10);
  mapEnv('MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT', 'MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT', parseIntBase10);
  mapEnv('MESSAGE_HISTORY_ADAPTIVE_STEP', 'MESSAGE_HISTORY_ADAPTIVE_STEP', parseIntBase10);
  mapEnv('MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION', 'MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION', parseFloatBase10);
  mapEnv('MESSAGE_LLM_CONTEXT_WINDOW_TOKENS', 'MESSAGE_LLM_CONTEXT_WINDOW_TOKENS', parseIntBase10);
  mapEnv('MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS', 'MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS', parseIntBase10);
  mapEnv('MESSAGE_DECAY_RATE', 'MESSAGE_DECAY_RATE', parseFloatBase10);
  mapEnv('MESSAGE_CALM_WINDOW', 'MESSAGE_CALM_WINDOW', parseIntBase10);
  mapEnv('PLATFORM', 'PLATFORM');
  mapEnv('NAME', 'NAME');
  mapEnv('BOT_ID', 'BOT_ID');
  mapEnv('MESSAGE_MIN_INTERVAL_MS', 'MESSAGE_MIN_INTERVAL_MS', parseIntBase10);
  mapEnv('MESSAGE_STRIP_BOT_ID', 'MESSAGE_STRIP_BOT_ID', parseBool);
  mapEnv('MESSAGE_USERNAME_OVERRIDE', 'MESSAGE_USERNAME_OVERRIDE');
  mapEnv('MESSAGE_CHANNEL_ROUTER_ENABLED', 'MESSAGE_CHANNEL_ROUTER_ENABLED', parseBool);
  mapEnv('CHANNEL_BONUSES', 'CHANNEL_BONUSES', parseJSONOrCSV);
  mapEnv('CHANNEL_PRIORITIES', 'CHANNEL_PRIORITIES', parseJSONOrCSV);
  mapEnv('MESSAGE_RESPONSE_PROFILES', 'MESSAGE_RESPONSE_PROFILES', parseJSON);
  mapEnv('GREETING', 'greeting', parseJSON);
  
  // Specific handling for DISCORD_MESSAGE_TEMPLATES which must throw on invalid JSON
  if (process.env.DISCORD_MESSAGE_TEMPLATES !== undefined) {
    try {
      envConfig.DISCORD_MESSAGE_TEMPLATES = JSON.parse(process.env.DISCORD_MESSAGE_TEMPLATES!);
    } catch (e: any) {
      throw new Error(`Invalid JSON: ${process.env.DISCORD_MESSAGE_TEMPLATES}`);
    }
  }

  // Merge: Defaults < File < Env
  const combinedConfig = {
    ...fileConfig,
    ...envConfig
  };

  const result = MessageSchema.safeParse(combinedConfig);

  if (!result.success) {
    debug('Configuration validation failed:', result.error.format());
    // Fallback to defaults by parsing empty object
    return MessageSchema.parse({});
  }

  return result.data;
}

const config = loadMessageConfig();

// Bridge back to convict-like getter if needed, though direct access is preferred
const messageConfig = {
  get: (key: string) => (config as any)[key],
  getProperties: () => config,
  getSchema: () => require('zod-to-json-schema').zodToJsonSchema(MessageSchema as any),
  validate: (options: { allowed: 'strict' | 'warn' }) => {
    MessageSchema.parse(config);
  }
};

export default messageConfig;
