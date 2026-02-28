import convict from 'convict';
import path from 'path';

/**
 * Discord Configuration Module
 *
 * @module discordConfig
 * @description Centralized configuration for Discord integration. Handles:
 * - Bot tokens and authentication
 * - Guild and channel settings
 * - Voice and message configurations
 * - Channel-specific bonuses and priorities
 *
 * Features custom format validators for channel bonuses and supports:
 * - Environment variables
 * - JSON config file (config/providers/discord.json)
 * - Default values (fallback)
 *
 * @example
 * // Get configuration values
 * import discordConfig from './discordConfig';
 * const botToken = discordConfig.get('DISCORD_BOT_TOKEN');
 * const channelBonuses = discordConfig.get('DISCORD_CHANNEL_BONUSES');
 */

export interface DiscordConfig {
  DISCORD_BOT_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_GUILD_ID: string;
  DISCORD_AUDIO_DIR: string;
  DISCORD_WELCOME_MESSAGE: string;
  DISCORD_MESSAGE_HISTORY_LIMIT: number;
  DISCORD_CHANNEL_ID: string;
  DISCORD_DEFAULT_CHANNEL_ID: string;
  DISCORD_CHANNEL_BONUSES: Record<string, number>;
  DISCORD_UNSOLICITED_CHANCE_MODIFIER: number;
  DISCORD_VOICE_CHANNEL_ID: string;
  DISCORD_MAX_MESSAGE_LENGTH: number;
  DISCORD_INTER_PART_DELAY_MS: number;
  DISCORD_TYPING_DELAY_MAX_MS: number;
  DISCORD_PRIORITY_CHANNEL: string;
  DISCORD_PRIORITY_CHANNEL_BONUS: number;
  DISCORD_LOGGING_ENABLED: boolean;
  DISCORD_MESSAGE_PROCESSING_DELAY_MS: number;
}

convict.addFormat({
  name: 'channel-bonuses',
  validate: (val) => {
    if (typeof val !== 'string' && typeof val !== 'object' && val !== undefined) {
      throw new Error('Invalid bonuses: must be a string, object, or undefined.');
    }
    // Validate numeric range for object values
    if (typeof val === 'object' && val !== null) {
      for (const [channelId, bonus] of Object.entries(val)) {
        const numBonus = Number(bonus);
        if (isNaN(numBonus) || numBonus < 0.0 || numBonus > 2.0) {
          throw new Error(`Invalid bonus for channel ${channelId}: must be between 0.0 and 2.0`);
        }
      }
    }
  },
  coerce: (val) => {
    if (typeof val === 'object') {return val;}
    if (!val) {return {};}
    
    // Auto-detect JSON format
    if (typeof val === 'string' && val.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(val);
        const result: Record<string, number> = {};
        for (const [channelId, bonus] of Object.entries(parsed)) {
          const numBonus = Number(bonus);
          if (!isNaN(numBonus)) {
            result[channelId] = Math.max(0.0, Math.min(2.0, numBonus)); // Clamp to valid range
          }
        }
        return result;
      } catch {
        throw new Error('Invalid JSON format for channel bonuses');
      }
    }
    
    // Parse CSV format
    return val.split(',').reduce((acc: Record<string, number>, kvp: string) => {
      const [channelId, bonus] = kvp.split(':');
      if (channelId && bonus) {
        const numBonus = parseFloat(bonus);
        if (!isNaN(numBonus)) {
          acc[channelId] = Math.max(0.0, Math.min(2.0, numBonus)); // Clamp to valid range
        }
      }
      return acc;
    }, {});
  },
});

const discordConfig = convict<DiscordConfig>({
  DISCORD_BOT_TOKEN: {
    doc: 'Comma-separated Discord bot tokens',
    format: String,
    default: '',
    env: 'DISCORD_BOT_TOKEN',
  },
  DISCORD_CLIENT_ID: {
    doc: 'Discord client ID',
    format: String,
    default: '',
    env: 'DISCORD_CLIENT_ID',
  },
  DISCORD_GUILD_ID: {
    doc: 'Discord guild ID',
    format: String,
    default: '',
    env: 'DISCORD_GUILD_ID',
  },
  DISCORD_AUDIO_DIR: {
    doc: 'Directory for audio files for Discord commands',
    format: String,
    default: './data/audio',
    env: 'DISCORD_AUDIO_DIR',
  },
  DISCORD_WELCOME_MESSAGE: {
    doc: 'Welcome message for new users',
    format: String,
    default: 'Welcome to the server!',
    env: 'DISCORD_WELCOME_MESSAGE',
  },
  DISCORD_MESSAGE_HISTORY_LIMIT: {
    doc: 'Number of messages to keep in history',
    format: 'int',
    default: 10,
    env: 'DISCORD_MESSAGE_HISTORY_LIMIT',
  },
  DISCORD_CHANNEL_ID: {
    doc: 'Default channel ID',
    format: String,
    default: '',
    env: 'DISCORD_CHANNEL_ID',
  },
  DISCORD_DEFAULT_CHANNEL_ID: {
    doc: 'Default channel ID for outgoing messages',
    format: String,
    default: '',
    env: 'DISCORD_DEFAULT_CHANNEL_ID',
  },
  DISCORD_CHANNEL_BONUSES: {
    doc: 'Channel-specific bonuses. Supports CSV ("ch1:1.5,ch2:0.8") or JSON ({"ch1":1.5,"ch2":0.8}). Range: 0.0-2.0',
    format: 'channel-bonuses',
    default: {},
    env: 'DISCORD_CHANNEL_BONUSES',
  },
  DISCORD_UNSOLICITED_CHANCE_MODIFIER: {
    doc: 'Global unsolicited chance modifier',
    format: Number,
    default: 1.0,
    env: 'DISCORD_UNSOLICITED_CHANCE_MODIFIER',
  },
  DISCORD_VOICE_CHANNEL_ID: {
    doc: 'Voice channel ID for interactions',
    format: String,
    default: '',
    env: 'DISCORD_VOICE_CHANNEL_ID',
  },
  DISCORD_MAX_MESSAGE_LENGTH: {
    doc: 'Max message length',
    format: 'int',
    default: 2000,
    env: 'DISCORD_MAX_MESSAGE_LENGTH',
  },
  DISCORD_INTER_PART_DELAY_MS: {
    doc: 'Delay between multipart messages (ms)',
    format: 'int',
    default: 1000,
    env: 'DISCORD_INTER_PART_DELAY_MS',
  },
  DISCORD_TYPING_DELAY_MAX_MS: {
    doc: 'Max typing delay (ms)',
    format: 'int',
    default: 5000,
    env: 'DISCORD_TYPING_DELAY_MAX_MS',
  },
  DISCORD_PRIORITY_CHANNEL: {
    doc: 'Priority channel ID',
    format: String,
    default: '',
    env: 'DISCORD_PRIORITY_CHANNEL',
  },
  DISCORD_PRIORITY_CHANNEL_BONUS: {
    doc: 'Bonus chance for priority channel',
    format: Number,
    default: 1.1,
    env: 'DISCORD_PRIORITY_CHANNEL_BONUS',
  },
  DISCORD_LOGGING_ENABLED: {
    doc: 'Enable logging to files',
    format: Boolean,
    default: false,
    env: 'DISCORD_LOGGING_ENABLED',
  },
  DISCORD_MESSAGE_PROCESSING_DELAY_MS: {
    doc: 'Delay for processing messages (ms)',
    format: 'int',
    default: 0,
    env: 'DISCORD_MESSAGE_PROCESSING_DELAY_MS',
  },
});

import Debug from 'debug';
const debug = Debug('app:discordConfig');

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/discord.json');

try {
  discordConfig.loadFile(configPath);
  discordConfig.validate({ allowed: 'strict' });
  debug(`Successfully loaded Discord config from ${configPath}`);
} catch {
  // Fallback to defaults if config file is missing or invalid
  debug(`Warning: Could not load discord config from ${configPath}, using defaults`);
}

export default discordConfig;
