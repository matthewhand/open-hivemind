import ConfigurationManager from '@src/common/config/ConfigurationManager';

/**
 * Determines whether a message should be processed based on configuration settings.
 * @param messageLength - The length of the message to process.
 * @returns Whether the message should be processed or not.
 */
export function shouldProcessMessage(messageLength: number): boolean {
    const minIntervalMs = ConfigurationManager.MESSAGE_MIN_INTERVAL_MS;
    const followUpEnabled = ConfigurationManager.MESSAGE_FOLLOW_UP_ENABLED;
    const limitPerHour = ConfigurationManager.LLM_MESSAGE_LIMIT_PER_HOUR;

    // Example logic: Only process messages if follow-up is enabled and the length exceeds a certain threshold.
    if (followUpEnabled && messageLength > minIntervalMs) {
        return true;
    }

    return false;
}

/**
 * Checks if the current message count exceeds the limit per hour.
 * @param messageCount - The current count of messages sent in the hour.
 * @returns True if the message count is within the limit, false otherwise.
 */
export function isWithinMessageLimit(messageCount: number): boolean {
    return messageCount < ConfigurationManager.LLM_MESSAGE_LIMIT_PER_HOUR;
}

/**
 * Adjusts the processing threshold based on dynamic conditions.
 * @param baseThreshold - The base threshold value.
 * @param factor - A multiplier to adjust the threshold.
 * @returns The adjusted threshold value.
 */
export function adjustProcessingThreshold(baseThreshold: number, factor: number): number {
    return baseThreshold * factor;
}
