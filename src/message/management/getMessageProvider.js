"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageProvider = getMessageProvider;
const DiscordService_1 = require("@src/integrations/discord/DiscordService");
const debug_1 = __importDefault(require("debug"));
const messageConfig_1 = __importDefault(require("@src/message/config/messageConfig")); // Correct reference to messageConfig
const debug = (0, debug_1.default)('app:getMessageProvider');
/**
 * Get Message Provider
 *
 * Determines and returns the appropriate message provider singleton based on the
 * configuration specified in the convict-based messageConfig. Supports multiple message
 * providers, such as Discord.
 *
 * @returns The singleton instance of the configured message provider.
 * @throws An error if the configured message provider is unsupported.
 */
function getMessageProvider() {
    // Ensure messageConfig is loaded
    const messageProvider = messageConfig_1.default.get('MESSAGE_PROVIDER');
    debug('Configured message provider:', messageProvider);
    // Guard: Ensure the message provider is specified
    if (!messageProvider) {
        throw new Error('MESSAGE_PROVIDER is not configured.');
    }
    // Return the appropriate message provider based on configuration
    switch (messageProvider.toLowerCase()) {
        case 'discord':
            return DiscordService_1.DiscordService.getInstance();
        // Add additional cases for other providers here
        default:
            throw new Error(`Unsupported message provider: ${messageProvider}`);
    }
}
