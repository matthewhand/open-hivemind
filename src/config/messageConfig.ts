import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { MessageSchema, type MessageConfig } from './schemas/messageSchema';

const debug = Debug('app:messageConfig');

// The internal config object that holds all message-related settings
let config: MessageConfig;

/**
 * Loads the message configuration from environment variables and config files.
 * Uses Zod for validation and normalization.
 */
function loadMessageConfig(): MessageConfig {
  /**
   * Helper to parse JSON string safely
   */
  const parseJSON = (v: string) => {
    try {
      return JSON.parse(v);
    } catch (e) {
      debug('Error parsing JSON config:', e);
      return {};
    }
  };

  /**
   * Parse either a JSON object or a CSV list of key:value pairs
   */
  const parseCSVOrJSON = (v: string) => {
    if (!v) return undefined;
    const trimmed = v.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return parseJSON(trimmed);
    }

    // Fallback to key:value CSV parsing
    const result: Record<string, number> = {};
    const parts = v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      const [key, val] = part.split(':').map((s) => s.trim());
      if (key && val !== undefined) {
        result[key] = parseFloat(val);
      }
    }
    return result;
  };

  const parseNum = (v: string | undefined) => (v !== undefined ? Number(v) : undefined);
  const parseBool = (v: string | undefined) =>
    v !== undefined ? v === 'true' || v === '1' : undefined;

  // 1. Start with default values from the Zod schema
  const defaultValues = MessageSchema.parse({});

  // 2. Load from environment variables (overrides defaults)
  const envValues: Partial<MessageConfig> = {
    MESSAGE_PROVIDER: process.env.MESSAGE_PROVIDER,
    MESSAGE_IGNORE_BOTS: parseBool(process.env.MESSAGE_IGNORE_BOTS),
    MESSAGE_BOT_REPLIES_ONLY: parseBool(process.env.MESSAGE_BOT_REPLIES_ONLY),
    CHANNEL_BONUSES: process.env.CHANNEL_BONUSES
      ? parseCSVOrJSON(process.env.CHANNEL_BONUSES)
      : undefined,
    CHANNEL_PRIORITIES: process.env.CHANNEL_PRIORITIES
      ? parseCSVOrJSON(process.env.CHANNEL_PRIORITIES)
      : undefined,
    MESSAGE_ONLY_WHEN_SPOKEN_TO: parseBool(process.env.MESSAGE_ONLY_WHEN_SPOKEN_TO),
    MESSAGE_MIN_DELAY: parseNum(process.env.MESSAGE_MIN_DELAY),
    MESSAGE_MAX_DELAY: parseNum(process.env.MESSAGE_MAX_DELAY),
    MESSAGE_RATE_LIMIT_PER_CHANNEL: parseNum(process.env.MESSAGE_RATE_LIMIT_PER_CHANNEL),
    MESSAGE_HISTORY_LIMIT: parseNum(process.env.MESSAGE_HISTORY_LIMIT),
    BOT_ID: process.env.BOT_ID,
    NAME: process.env.NAME,
    PLATFORM: process.env.PLATFORM,
  } as any;

  // 3. Load from configuration file (overrides env values)
  const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
  const configPath = path.join(configDir, 'message.json');

  let fileValues = {};
  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      fileValues = JSON.parse(fileContent);
      debug(`Loaded message config from ${configPath}`);
    } catch (e) {
      debug(`Error loading message config from ${configPath}:`, e);
    }
  }

  // 4. Merge all sources and validate
  const merged = {
    ...defaultValues,
    ...Object.fromEntries(Object.entries(envValues).filter(([_, v]) => v !== undefined)),
    ...fileValues,
  };

  try {
    return MessageSchema.parse(merged);
  } catch (e) {
    debug('Message configuration validation failed:', e);
    return defaultValues;
  }
}

// Initial load
config = loadMessageConfig();

/**
 * Reloads the configuration (useful for tests or hot-reloading).
 */
export function reloadMessageConfig(): MessageConfig {
  config = loadMessageConfig();
  return config;
}

/**
 * Public API for accessing message configuration.
 */
const messageConfig = {
  get: <K extends keyof MessageConfig>(key: K): MessageConfig[K] => {
    return config[key];
  },
  getProperties: (): MessageConfig => {
    return { ...config };
  },
  getSchema: () => {
    return {
      properties: Object.keys(MessageSchema.shape).reduce((acc: any, key) => {
        acc[key] = { type: 'string' }; // Simplified for now
        return acc;
      }, {}),
    };
  },
  validate: (overrides?: Partial<MessageConfig>) => {
    return true;
  },
};

export { reloadMessageConfig as reload };
export default messageConfig;
