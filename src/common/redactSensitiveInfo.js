"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSensitiveInfo = redactSensitiveInfo;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:redactSensitiveInfo');
/**
 * Utility to redact sensitive information from key-value pairs.
 *
 * This function is designed to scan and redact sensitive information from key-value pairs,
 * typically used in logging or data processing to avoid exposing sensitive data.
 *
 * Key Features:
 * - Redacts sensitive values based on key patterns and content phrases (e.g., tokens, passwords).
 * - Handles non-string values by safely stringifying them before processing.
 * - Provides detailed logging for invalid keys or errors encountered during stringification.
 * - Uses flexible key matching to identify and redact sensitive information more effectively.
 *
 * @param {string} key - The key identifying the type of information.
 * @param {any} value - The value that may contain sensitive information.
 * @returns {string} The redacted key-value pair as a string.
 */
function redactSensitiveInfo(key, value) {
    // Ensure the key is a string
    if (typeof key !== 'string') {
        debug(`Invalid key type: ${typeof key}. Key must be a string.`);
        return 'Invalid key: [Key must be a string]';
    }
    // Handle null or undefined values
    if (value == null) {
        value = '[Value is null or undefined]';
    }
    else if (typeof value !== 'string') {
        // Safely stringify non-string values
        try {
            value = JSON.stringify(value);
        }
        catch (error) {
            debug(`Error stringifying value: ${error.message}`);
            value = '[Complex value cannot be stringified]';
        }
    }
    // Define sensitive keys and phrases for redaction
    const sensitiveKeys = ['token', 'password', 'secret', 'apikey', 'api_key', 'discord_token'];
    const sensitivePhrases = ['bearer', 'token'];
    // Convert the key and value to lowercase for case-insensitive matching
    const lowerKey = key.toLowerCase();
    const lowerValue = value.toLowerCase();
    // Redact if the key contains sensitive information or the value includes sensitive phrases
    if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey)) ||
        sensitivePhrases.some(phrase => lowerValue.includes(phrase))) {
        const redactedPart = value.length > 10 ? value.substring(0, 5) + '...' + value.slice(-5) : '[REDACTED]';
        return `${key}: ${redactedPart}`;
    }
    // Return the original key-value pair if no redaction is needed
    return `${key}: ${value}`;
}
