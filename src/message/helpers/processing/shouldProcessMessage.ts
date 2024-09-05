import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const messageConfig = configManager.getConfig('message');

// Ensure llmConfig is properly initialized
const llmConfig = configManager.get('LLM_PROVIDER') || {};

/**
 * Determines whether the message should be processed based on the last message time
 * and rate-limiting settings.
 *
 * @param {number} lastMessageTime - Timestamp of the last processed message.
 * @returns {boolean} - True if the message can be processed, false otherwise.
 */
export function shouldProcessMessage(lastMessageTime: number): boolean {
  if (!messageConfig || !llmConfig) {
    throw new Error('Message or LLM configuration is missing.');
  }

  const minIntervalMs = messageConfig.get<number>('MESSAGE_MIN_INTERVAL_MS');
  const limitPerHour = llmConfig.get<number>('LLM_MESSAGE_LIMIT_PER_HOUR', 100);  // Default to 100
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;

  if (timeSinceLastMessage < minIntervalMs) {
    return false;
  }

  // Additional checks for message limits
  return timeSinceLastMessage >= (60 * 60 * 1000) / limitPerHour;
}
