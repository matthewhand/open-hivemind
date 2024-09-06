import llmConfig from '@llm/interfaces/llmConfig';
import messageConfig from '@src/message/config/messageConfig';

/**
 * Determines whether the message should be processed based on the last message time
 * and rate-limiting settings.
 *
 * @param {number} lastMessageTime - Timestamp of the last processed message.
 * @returns {boolean} - True if the message can be processed, false otherwise.
 */
export function shouldProcessMessage(lastMessageTime: number): boolean {
  // Guard: Ensure messageConfig and llmConfig are loaded properly
  if (!messageConfig || !llmConfig) {
    throw new Error('Message or LLM configuration is missing.');
  }

  // Add default value and guard for message interval
  const minIntervalMs = messageConfig.get('MESSAGE_MIN_INTERVAL_MS') || 1000; // Default to 1000ms
  const limitPerHour = llmConfig.get('LLM_RESPONSE_MAX_TOKENS') || 100;  // Default to 100
  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;

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
