import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const messageConfig = configManager?.message || {}; // Fix: Access message config safely

// Ensure llmConfig is properly initialized
const llmConfig = configManager?.LLM_PROVIDER ? { LLM_PROVIDER: configManager.LLM_PROVIDER } : {};

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

  // Improvement: Add default value and guard for message interval
  const minIntervalMs = messageConfig['MESSAGE_MIN_INTERVAL_MS'] || 1000; // Default to 1000ms
  const limitPerHour = llmConfig.LLM_PROVIDER ? 100 : 50;  // Default to 100 or fallback to 50
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;

  // Improvement: Add debug logging for decision-making process
  console.debug(`Time since last message: ${timeSinceLastMessage}ms, Min interval: ${minIntervalMs}ms, Limit per hour: ${limitPerHour}`);

  if (timeSinceLastMessage < minIntervalMs) {
    console.debug('Message too soon. Not processing.');
    return false;
  }

  // Additional checks for message limits
  const allowed = timeSinceLastMessage >= (60 * 60 * 1000) / limitPerHour;
  console.debug(`Message processing allowed: ${allowed}`);
  return allowed;
}
