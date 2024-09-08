"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldProcessMessage = shouldProcessMessage;
const llmConfig_1 = __importDefault(require("@llm/interfaces/llmConfig"));
const messageConfig_1 = __importDefault(require("@src/message/config/messageConfig"));
/**
 * Determines whether the message should be processed based on the last message time
 * and rate-limiting settings.
 *
 * @param {number} lastMessageTime - Timestamp of the last processed message.
 * @returns {boolean} - True if the message can be processed, false otherwise.
 */
function shouldProcessMessage(lastMessageTime) {
    // Guard: Ensure messageConfig and llmConfig are loaded properly
    if (!messageConfig_1.default || !llmConfig_1.default) {
        throw new Error('Message or LLM configuration is missing.');
    }
    // Add default value and guard for message interval
    const minIntervalMs = messageConfig_1.default.get('MESSAGE_MIN_INTERVAL_MS') || 1000; // Default to 1000ms
    const limitPerHour = llmConfig_1.default.get('LLM_RESPONSE_MAX_TOKENS') || 100; // Default to 100
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
