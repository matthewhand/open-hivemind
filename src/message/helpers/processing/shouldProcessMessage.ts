import messageConfig from '@config/messageConfig';
import { IMessage } from '@message/interfaces/IMessage';

/**
 * Returns the minimum interval in milliseconds for processing messages.
 * If the configuration key MESSAGE_MIN_INTERVAL_MS is not set, defaults to 1000.
 */
export function getMinIntervalMs(): number {
  try {
    const value = messageConfig.get('MESSAGE_MIN_INTERVAL_MS');
    const numValue = typeof value === 'number' ? value : Number(value) || 1000;
    return isNaN(numValue) ? 1000 : numValue;
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // If config access fails, return default
    return 1000;
  }
}

/**
 * Determines if a message should be processed based on its content and sender.
 *
 * @param message - The message to evaluate.
 * @returns `true` if the message should be processed, `false` otherwise.
 */
export function shouldProcessMessage(message: IMessage): boolean {
  try {
    // Handle null/undefined messages
    if (!message) {
      return false;
    }

    const text = message.getText();
    if (!text || text.trim().length === 0) {
      return false;
    }

    let ignoreBots;
    try {
      ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS');
    } catch (_configError) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // If config access fails, default to ignoring bots
      ignoreBots = true;
    }

    // Default to ignoring bots if config is undefined or truthy (matches default.json setting)
    const shouldIgnoreBots = ignoreBots === undefined || Boolean(ignoreBots);
    if (shouldIgnoreBots && message.isFromBot()) {
      return false;
    }

    return true;
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // If message methods throw, don't process the message
    return false;
  }
}
