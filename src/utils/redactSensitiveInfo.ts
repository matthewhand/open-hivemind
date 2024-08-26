import Debug from "debug";

const debug = Debug('app:redactSensitiveInfo');

/**
 * Utility to redact sensitive information from key-value pairs.
 *
 * This function is designed to scan and redact sensitive information from key-value pairs, 
 * commonly used in logging or data processing to avoid exposing sensitive data.
 *
 * Key Features:
 * - Redacts sensitive values like passwords, tokens, and API keys.
 * - Handles complex data types, ensuring that non-string values are safely stringified.
 * - Logs any issues with invalid keys or errors during stringification for debugging purposes.
 *
 * @param {string} key - The key identifying the type of information.
 * @param {any} value - The value that may contain sensitive information.
 * @returns {string} The redacted key-value pair as a string.
 */
export function redactSensitiveInfo(key: string, value: any): string {
    if (typeof key !== 'string') {
        debug(`Invalid key type: ${typeof key}. Key must be a string.`);
        return 'Invalid key: [Key must be a string]';
    }
    if (value == null) {
        value = '[Value is null or undefined]';
    } else if (typeof value !== 'string') {
        try {
            value = JSON.stringify(value);
        } catch (error: any) {
            debug(`Error stringifying value: ${error.message}`);
            value = '[Complex value cannot be stringified]';
        }
    }
    const lowerKey = key.toLowerCase();
    const sensitiveKeys = ['password', 'secret', 'apikey', 'access_token', 'auth_token'];
    const sensitivePhrases = ['bearer', 'token'];
    if (sensitiveKeys.includes(lowerKey) || sensitivePhrases.some(phrase => value.includes(phrase))) {
        const redactedPart = value.length > 10 ? value.substring(0, 5) + '...' + value.slice(-5) : '[REDACTED]';
        return `${key}: ${redactedPart}`;
    }
    return `${key}: ${value}`;
}
