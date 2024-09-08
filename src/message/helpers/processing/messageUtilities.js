"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldProcessMessage = shouldProcessMessage;
exports.isWithinMessageLimit = isWithinMessageLimit;
exports.adjustProcessingThreshold = adjustProcessingThreshold;
const ConfigurationManager_1 = __importDefault(require("@config/ConfigurationManager"));
const configManager = ConfigurationManager_1.default.getInstance();
const messageConfig = configManager.getConfig("message");
const llmConfig_1 = __importDefault(require("@llm/interfaces/llmConfig"));
/**
 * Determines whether a message should be processed based on configuration settings.
 * @param messageLength - The length of the message to process.
 * @returns Whether the message should be processed or not.
 */
function shouldProcessMessage(messageLength) {
    if (!messageConfig || !llmConfig_1.default) {
        throw new Error('Message or LLM configuration is not loaded.');
    }
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const minIntervalMs = messageConfig.get('MESSAGE_MIN_INTERVAL_MS');
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const followUpEnabled = messageConfig.get('MESSAGE_FOLLOW_UP_ENABLED');
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const limitPerHour = llmConfig_1.default.get('LLM_MESSAGE_LIMIT_PER_HOUR');
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
function isWithinMessageLimit(messageCount) {
    if (!llmConfig_1.default) {
        throw new Error('LLM configuration is not loaded.');
    }
    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    return messageCount < llmConfig_1.default.get('LLM_MESSAGE_LIMIT_PER_HOUR');
}
/**
 * Adjusts the processing threshold based on dynamic conditions.
 * @param baseThreshold - The base threshold value.
 * @param factor - A multiplier to adjust the threshold.
 * @returns The adjusted threshold value.
 */
function adjustProcessingThreshold(baseThreshold, factor) {
    return baseThreshold * factor;
}
