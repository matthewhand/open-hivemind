import messageConfig from '@config/messageConfig';

/**
 * Returns the minimum interval in milliseconds for processing messages.
 * If the configuration key MESSAGE_MIN_INTERVAL_MS is not set, defaults to 1000.
 */
export function getMinIntervalMs(): number {
  const value = messageConfig.get('MESSAGE_MIN_INTERVAL_MS');
  return typeof value === 'number' ? value : Number(value) || 1000;
}
