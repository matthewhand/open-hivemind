"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginToDiscord = loginToDiscord;
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:loginToDiscord');
/**
 * Logs in the Discord client using the provided bot token.
 *
 * @param client - The Discord client instance to log in.
 * @param token - The Discord bot token.
 * @returns A promise that resolves when the login is successful.
 * @throws Will throw an error if the token is not provided or login fails.
 */
async function loginToDiscord(client, token) {
    debug('Attempting to log in to Discord.');
    // Guard clause: Ensure the token is provided.
    if (!token) {
        const errorMessage = 'DISCORD_BOT_TOKEN is not defined.';
        debug(errorMessage);
        throw errors_1.ErrorUtils.createError(errorMessage, 'ValidationError', 'DISCORD_TOKEN_NOT_PROVIDED', 400);
    }
    try {
        const result = await client.login(token);
        debug('Successfully logged in to Discord.');
        return result;
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        const errorMessage = 'Failed to log in to Discord: ' + errors_1.ErrorUtils.getMessage(hivemindError);
        debug(errorMessage);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord login error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(errorMessage, classification.type, 'DISCORD_LOGIN_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
}
