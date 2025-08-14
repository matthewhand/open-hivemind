import convict from 'convict';
import path from 'path';
import debug from 'debug';
import type { ConfigModuleMeta } from './ConfigSpec';

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

const dbg = debug('app:config:discord');

convict.addFormat({
  name: 'channel-bonuses',
  validate: (val) => {
    if (val === undefined || val === null || val === '') return; // allow empty
    if (typeof val !== 'string' && typeof val !== 'object') {
      throw new Error('Invalid bonuses: must be a string, object, or undefined.');
    }
    // Additional validation occurs post-coerce
  },
  coerce: (val) => {
    if (val === undefined || val === null || val === '') return {};
    let out: Record<string, number> = {};
    try {
      if (typeof val === 'object') {
        out = { ...val } as Record<string, number>;
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          // JSON object expected
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            // Support array of {channelId, bonus}
            parsed.forEach((item) => {
              if (item && item.channelId && typeof item.bonus !== 'undefined') {
                out[item.channelId] = Number(item.bonus);
              }
            });
          } else {
            out = parsed as Record<string, number>;
          }
        } else {
          out = trimmed.split(',').reduce((acc: Record<string, number>, kvp: string) => {
            const [channelId, bonus] = kvp.split(':');
            if (channelId && bonus) acc[channelId.trim()] = parseFloat(bonus);
            return acc;
          }, {});
        }
      }
    } catch (e) {
      // On parse error, keep empty and allow validation to fail later if needed
      dbg(`Failed to parse DISCORD_CHANNEL_BONUSES: ${String(e)}`);
      out = {};
    }

    // Normalize/clamp values into [0, 2]
    const normalized: Record<string, number> = {};
    Object.entries(out).forEach(([k, v]) => {
      const num = Number(v);
      if (!Number.isFinite(num)) return;
      const clamped = Math.max(0, Math.min(2, num));
      normalized[k] = clamped;
    });

    return normalized;
  }
});

const discordConfig = convict({
  DISCORD_BOT_TOKEN: {
    doc: 'Comma-separated Discord bot tokens',
    format: String,
    default: '',
    env: 'DISCORD_BOT_TOKEN',
    level: 'basic',
    group: 'discord'
  },
  DISCORD_CLIENT_ID: {
    doc: 'Discord client ID',
    format: String,
    default: '',
    env: 'DISCORD_CLIENT_ID',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_GUILD_ID: {
    doc: 'Discord guild ID',
    format: String,
    default: '',
    env: 'DISCORD_GUILD_ID',
    level: 'advanced',
    group: 'discord'
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
    env: 'DISCORD_MESSAGE_HISTORY_LIMIT',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_CHANNEL_ID: {
    doc: 'Default channel ID',
    format: String,
    default: '',
    env: 'DISCORD_CHANNEL_ID',
    level: 'basic',
    group: 'discord'
  },
  DISCORD_DEFAULT_CHANNEL_ID: {
    doc: 'Default channel ID for outgoing messages',
    format: String,
    default: '',
    env: 'DISCORD_DEFAULT_CHANNEL_ID',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_CHANNEL_BONUSES: {
    doc: 'Channel-specific bonuses (e.g., "channelId:bonus")',
    format: 'channel-bonuses',
    default: {},
    env: 'DISCORD_CHANNEL_BONUSES',
    level: 'advanced',
    group: 'discord'
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
    env: 'DISCORD_VOICE_CHANNEL_ID',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_MAX_MESSAGE_LENGTH: {
    doc: 'Max message length',
    format: 'int',
    default: 2000,
    env: 'DISCORD_MAX_MESSAGE_LENGTH',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_INTER_PART_DELAY_MS: {
    doc: 'Delay between multipart messages (ms)',
    format: 'int',
    default: 1000,
    env: 'DISCORD_INTER_PART_DELAY_MS',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_TYPING_DELAY_MAX_MS: {
    doc: 'Max typing delay (ms)',
    format: 'int',
    default: 5000,
    env: 'DISCORD_TYPING_DELAY_MAX_MS',
    level: 'advanced',
    group: 'discord'
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
    env: 'DISCORD_PRIORITY_CHANNEL_BONUS',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_LOGGING_ENABLED: {
    doc: 'Enable logging to files',
    format: Boolean,
    default: false,
    env: 'DISCORD_LOGGING_ENABLED',
    level: 'advanced',
    group: 'discord'
  },
  DISCORD_MESSAGE_PROCESSING_DELAY_MS: {
    doc: 'Delay for processing messages (ms)',
    format: 'int',
    default: 0,
    env: 'DISCORD_MESSAGE_PROCESSING_DELAY_MS',
    level: 'advanced',
    group: 'discord'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/discord.json');

try {
  discordConfig.loadFile(configPath);
  discordConfig.validate({ allowed: 'strict' });
  const bonuses = discordConfig.get('DISCORD_CHANNEL_BONUSES') as Record<string, number>;
  if (bonuses && Object.keys(bonuses).length > 0) {
    dbg(`Loaded DISCORD_CHANNEL_BONUSES: ${JSON.stringify(bonuses)}`);
  }
  dbg('Discord config loaded and validated successfully');
} catch {
  // Fallback to defaults if config file is missing or invalid
  console.warn(`Warning: Could not load discord config from ${configPath}, using defaults`);
}

export default discordConfig;

export const configMeta: ConfigModuleMeta = {
  module: 'discordConfig',
  keys: [
    { key: 'DISCORD_BOT_TOKEN', group: 'discord', level: 'basic', env: 'DISCORD_BOT_TOKEN', doc: 'Bot token(s)' },
    { key: 'DISCORD_CHANNEL_ID', group: 'discord', level: 'basic', env: 'DISCORD_CHANNEL_ID', doc: 'Default channel id' },
    { key: 'DISCORD_DEFAULT_CHANNEL_ID', group: 'discord', level: 'advanced', env: 'DISCORD_DEFAULT_CHANNEL_ID', doc: 'Default outbound channel id' },
    { key: 'DISCORD_MESSAGE_HISTORY_LIMIT', group: 'discord', level: 'advanced', env: 'DISCORD_MESSAGE_HISTORY_LIMIT', doc: 'History fetch cap', default: 10 },
    { key: 'DISCORD_CLIENT_ID', group: 'discord', level: 'advanced', env: 'DISCORD_CLIENT_ID' },
    { key: 'DISCORD_GUILD_ID', group: 'discord', level: 'advanced', env: 'DISCORD_GUILD_ID' },
    { key: 'DISCORD_AUDIO_FILE_PATH', group: 'discord', level: 'advanced', env: 'DISCORD_AUDIO_FILE_PATH', default: 'audio.wav' },
    { key: 'DISCORD_WELCOME_MESSAGE', group: 'discord', level: 'advanced', env: 'DISCORD_WELCOME_MESSAGE', default: 'Welcome to the server!' },
    { key: 'DISCORD_CHANNEL_BONUSES', group: 'discord', level: 'advanced', env: 'DISCORD_CHANNEL_BONUSES', doc: 'Per-channel bonuses' },
    { key: 'DISCORD_UNSOLICITED_CHANCE_MODIFIER', group: 'discord', level: 'advanced', env: 'DISCORD_UNSOLICITED_CHANCE_MODIFIER', default: 1.0 },
    { key: 'DISCORD_VOICE_CHANNEL_ID', group: 'discord', level: 'advanced', env: 'DISCORD_VOICE_CHANNEL_ID' },
    { key: 'DISCORD_MAX_MESSAGE_LENGTH', group: 'discord', level: 'advanced', env: 'DISCORD_MAX_MESSAGE_LENGTH', default: 2000 },
    { key: 'DISCORD_INTER_PART_DELAY_MS', group: 'discord', level: 'advanced', env: 'DISCORD_INTER_PART_DELAY_MS', default: 1000 },
    { key: 'DISCORD_TYPING_DELAY_MAX_MS', group: 'discord', level: 'advanced', env: 'DISCORD_TYPING_DELAY_MAX_MS', default: 5000 },
    { key: 'DISCORD_PRIORITY_CHANNEL', group: 'discord', level: 'advanced', env: 'DISCORD_PRIORITY_CHANNEL' },
    { key: 'DISCORD_PRIORITY_CHANNEL_BONUS', group: 'discord', level: 'advanced', env: 'DISCORD_PRIORITY_CHANNEL_BONUS', default: 1.1 },
    { key: 'DISCORD_LOGGING_ENABLED', group: 'discord', level: 'advanced', env: 'DISCORD_LOGGING_ENABLED', default: false },
    { key: 'DISCORD_MESSAGE_PROCESSING_DELAY_MS', group: 'discord', level: 'advanced', env: 'DISCORD_MESSAGE_PROCESSING_DELAY_MS', default: 0 }
  ]
};
