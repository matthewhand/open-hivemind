import convict from 'convict';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:discordConfig');

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

convict.addFormat({
  name: 'channel-bonuses',
  validate: (val) => {
    if (typeof val !== 'string' && typeof val !== 'object' && val !== undefined) {
      throw new Error('Invalid bonuses: must be a string, object, or undefined.');
    }
  },
  coerce: (val) => {
    if (typeof val === 'object') {
      // Validate numeric range for object values
      for (const [channelId, bonus] of Object.entries(val)) {
        const numericBonus = Number(bonus);
        if (isNaN(numericBonus) || numericBonus < 0.0 || numericBonus > 2.0) {
          throw new Error(`Invalid bonus value for channel ${channelId}: ${bonus}. Must be a number between 0.0 and 2.0.`);
        }
      }
      return val;
    }
    if (!val) return {};
    return val.split(',').reduce((acc: Record<string, number>, kvp: string) => {
      const [channelId, bonus] = kvp.split(':');
      if (channelId && bonus) {
        const numericBonus = parseFloat(bonus);
        if (isNaN(numericBonus) || numericBonus < 0.0 || numericBonus > 2.0) {
          throw new Error(`Invalid bonus value for channel ${channelId}: ${bonus}. Must be a number between 0.0 and 2.0.`);
        }
        acc[channelId] = numericBonus;
      }
      return acc;
    }, {});
  }
});

const discordConfig = convict({
  DISCORD_BOT_TOKEN: {
    doc: 'Comma-separated Discord bot tokens',
    format: String,
    default: '',
    env: 'DISCORD_BOT_TOKEN'
  },
  DISCORD_CLIENT_ID: {
    doc: 'Discord client ID',
    format: String,
    default: '',
    env: 'DISCORD_CLIENT_ID'
  },
  DISCORD_GUILD_ID: {
    doc: 'Discord guild ID',
    format: String,
    default: '',
    env: 'DISCORD_GUILD_ID'
  },
  DISCORD_AUDIO_FILE_PATH: {
    doc: 'Path to audio files for Discord commands',
    format: String,
    default: 'audio.wav',
    env: 'DISCORD_AUDIO_FILE_PATH'
  },
  DISCORD_WELCOME_MESSAGE: {
    doc: 'Welcome message for new users',
    format: String,
    default: 'Welcome to the server!',
    env: 'DISCORD_WELCOME_MESSAGE'
  },
  DISCORD_MESSAGE_HISTORY_LIMIT: {
    doc: 'Number of messages to keep in history',
    format: 'int',
    default: 10,
    env: 'DISCORD_MESSAGE_HISTORY_LIMIT'
  },
  DISCORD_CHANNEL_ID: {
    doc: 'Default channel ID',
    format: String,
    default: '',
    env: 'DISCORD_CHANNEL_ID'
  },
  DISCORD_DEFAULT_CHANNEL_ID: {
    doc: 'Default channel ID for outgoing messages',
    format: String,
    default: '',
    env: 'DISCORD_DEFAULT_CHANNEL_ID'
  },
  DISCORD_CHANNEL_BONUSES: {
    doc: 'Channel-specific bonuses (e.g., "channelId:bonus"). Supports comma-separated string format ("123456:1.5,789012:0.8") or JSON object format. Bonus values must be between 0.0 and 2.0.',
    format: 'channel-bonuses',
    default: {},
    env: 'DISCORD_CHANNEL_BONUSES'
  },
  DISCORD_UNSOLICITED_CHANCE_MODIFIER: {
    doc: 'Global unsolicited chance modifier',
    format: Number,
    default: 1.0,
    env: 'DISCORD_UNSOLICITED_CHANCE_MODIFIER'
  },
  DISCORD_VOICE_CHANNEL_ID: {
    doc: 'Voice channel ID for interactions',
    format: String,
    default: '',
    env: 'DISCORD_VOICE_CHANNEL_ID'
  },
  DISCORD_MAX_MESSAGE_LENGTH: {
    doc: 'Max message length',
    format: 'int',
    default: 2000,
    env: 'DISCORD_MAX_MESSAGE_LENGTH'
  },
  DISCORD_INTER_PART_DELAY_MS: {
    doc: 'Delay between multipart messages (ms)',
    format: 'int',
    default: 1000,
    env: 'DISCORD_INTER_PART_DELAY_MS'
  },
  DISCORD_TYPING_DELAY_MAX_MS: {
    doc: 'Max typing delay (ms)',
    format: 'int',
    default: 5000,
    env: 'DISCORD_TYPING_DELAY_MAX_MS'
  },
  DISCORD_PRIORITY_CHANNEL: {
    doc: 'Priority channel ID',
    format: String,
    default: '',
    env: 'DISCORD_PRIORITY_CHANNEL'
  },
  DISCORD_PRIORITY_CHANNEL_BONUS: {
    doc: 'Bonus chance for priority channel',
    format: Number,
    default: 1.1,
    env: 'DISCORD_PRIORITY_CHANNEL_BONUS'
  },
  DISCORD_LOGGING_ENABLED: {
    doc: 'Enable logging to files',
    format: Boolean,
    default: false,
    env: 'DISCORD_LOGGING_ENABLED'
  },
  DISCORD_MESSAGE_PROCESSING_DELAY_MS: {
    doc: 'Delay for processing messages (ms)',
    format: 'int',
    default: 0,
    env: 'DISCORD_MESSAGE_PROCESSING_DELAY_MS'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/discord.json');

try {
  discordConfig.loadFile(configPath);
  discordConfig.validate({ allowed: 'strict' });
  debug('Discord configuration loaded and validated successfully');
  debug('Channel bonuses:', discordConfig.get('DISCORD_CHANNEL_BONUSES'));
} catch (error) {
  // Fallback to defaults if config file is missing or invalid
  console.warn(`Warning: Could not load discord config from ${configPath}, using defaults`);
  debug('Using default discord configuration due to error:', error);
}

export default discordConfig;
