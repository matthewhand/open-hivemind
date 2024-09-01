import ConfigurationManager from '@src/config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const messageConfig = configManager.getConfig("message");
const llmConfig = configManager.getConfig("llm");

/**
 * Determines whether a message should be processed based on configuration settings.
 * @param messageLength - The length of the message to process.
 * @returns Whether the message should be processed or not.
 */
export function shouldProcessMessage(messageLength: number): boolean {
    if (!messageConfig || !llmConfig) {
        throw new Error('Message or LLM configuration is not loaded.');
    }

    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const minIntervalMs = messageConfig.get<number>('MESSAGE_MIN_INTERVAL_MS');
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const followUpEnabled = messageConfig.get<boolean>('MESSAGE_FOLLOW_UP_ENABLED');
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const limitPerHour = llmConfig.get<number>('LLM_MESSAGE_LIMIT_PER_HOUR');

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
    if (!llmConfig) {
        throw new Error('LLM configuration is not loaded.');
    }
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    return messageCount < llmConfig.get<number>('LLM_MESSAGE_LIMIT_PER_HOUR');
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
