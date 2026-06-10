/**
 * @hivemind/message-telegram
 *
 * Telegram adapter for Open Hivemind. Sends via the Bot API sendMessage
 * endpoint and receives via long-polling getUpdates (no webhook required).
 */
import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import { TelegramService } from './TelegramService';

export { TelegramService as default } from './TelegramService';
export { TelegramService } from './TelegramService';
export { schema } from './schema';
export { TelegramPoller, type TelegramPollerOptions, type FetchLike } from './TelegramPoller';
export {
  TelegramMessage,
  type TelegramApiMessage,
  type TelegramUpdate,
  type TelegramUser,
  type TelegramChat,
  type TelegramMessageEntity,
} from './TelegramMessage';

/** Standard factory — preferred entry point for PluginLoader */
export function create(_config?: any): any {
  return TelegramService.getInstance();
}

export const manifest: PluginManifest = {
  displayName: 'Telegram',
  description: 'Connect your bots to Telegram via the Bot API (long-polling)',
  type: 'message',
  minVersion: '1.0.0',
};
