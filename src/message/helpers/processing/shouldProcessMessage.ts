import messageConfig from '@config/messageConfig';

/**
 * Returns the minimum interval in milliseconds for processing messages.
 * If the configuration key MESSAGE_MIN_INTERVAL_MS is not set, defaults to 1000.
 */
export function getMinIntervalMs(): number {
  const value = messageConfig.get('MESSAGE_MIN_INTERVAL_MS');
  return typeof value === 'number' ? value : Number(value) || 1000;
}

/**
 * Determines if a message should be processed based on its content and sender.
 *
 * @param message - The message to evaluate.
 * @returns `true` if the message should be processed, `false` otherwise.
 */
export function shouldProcessMessage(message: IMessage): boolean {
  const text = message.getText();
  if (!text || text.trim().length === 0) {
    return false;
  }

  const ignoreBots = messageConfig.get('MESSAGE_IGNORE_BOTS');
  if (ignoreBots && message.isFromBot()) {
    return false;
  }

  return true;
}
