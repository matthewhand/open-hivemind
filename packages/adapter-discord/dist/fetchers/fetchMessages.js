"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMessages = fetchMessages;
const DiscordMessage_1 = __importDefault(require("@src/integrations/discord/DiscordMessage"));
const errors_1 = require("@src/types/errors");
/**
 * Fetch Messages
 *
 * This function fetches the last 50 messages from a specified channel.
 *
 * @param channel - The TextChannel to fetch messages from.
 * @returns A promise that resolves to an array of IMessage objects.
 */
async function fetchMessages(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        return messages.map(msg => new DiscordMessage_1.default(msg));
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord fetch messages error:', hivemindError);
        }
        return [];
    }
}
