import convict from 'convict';
import * as path from 'path';

/**
 * Telegram Configuration Module
 *
 * @module telegramConfig
 * @description Centralized configuration for Telegram integration. Handles:
 * - Bot tokens and authentication
 * - Webhook settings
 * - Message parsing modes
 * - Chat permissions and blocking
 *
 * Features:
 * - Environment variables
 * - JSON config file (config/providers/telegram.json)
 * - Default values (fallback)
 */

export interface TelegramConfig {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_URL: string;
  TELEGRAM_PARSE_MODE: string;
  TELEGRAM_ALLOWED_CHATS: string;
  TELEGRAM_BLOCKED_USERS: string;
  TELEGRAM_ENABLE_COMMANDS: boolean;
}

const telegramConfig = convict<TelegramConfig>({
  TELEGRAM_BOT_TOKEN: {
    doc: 'Telegram bot token from BotFather',
    format: String,
    default: '',
    env: 'TELEGRAM_BOT_TOKEN',
    sensitive: true,
  },
  TELEGRAM_WEBHOOK_URL: {
    doc: 'URL for receiving updates (leave empty for polling)',
    format: String,
    default: '',
    env: 'TELEGRAM_WEBHOOK_URL',
  },
  TELEGRAM_PARSE_MODE: {
    doc: 'Format for message parsing (HTML, Markdown, None)',
    format: ['HTML', 'Markdown', 'None', ''],
    default: 'HTML',
    env: 'TELEGRAM_PARSE_MODE',
  },
  TELEGRAM_ALLOWED_CHATS: {
    doc: 'Comma-separated list of chat IDs the bot can respond in (leave empty for all)',
    format: String,
    default: '',
    env: 'TELEGRAM_ALLOWED_CHATS',
  },
  TELEGRAM_BLOCKED_USERS: {
    doc: 'Comma-separated list of user IDs the bot cannot respond to',
    format: String,
    default: '',
    env: 'TELEGRAM_BLOCKED_USERS',
  },
  TELEGRAM_ENABLE_COMMANDS: {
    doc: 'Enable bot commands (/start, /help, etc.)',
    format: Boolean,
    default: true,
    env: 'TELEGRAM_ENABLE_COMMANDS',
  },
});

import Debug from 'debug';
const debug = Debug('app:telegramConfig');

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/telegram.json');

try {
  telegramConfig.loadFile(configPath);
  telegramConfig.validate({ allowed: 'strict' });
  debug(`Successfully loaded Telegram config from ${configPath}`);
} catch (err: unknown) {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    // File doesn't exist yet — use defaults, this is fine
    debug('telegramConfig: config file not found, using defaults');
  } else {
    // JSON parse error or other unexpected error — re-throw
    throw new Error(`Failed to parse Telegram config file: ${(err as Error).message}`);
  }
}

export default telegramConfig;
