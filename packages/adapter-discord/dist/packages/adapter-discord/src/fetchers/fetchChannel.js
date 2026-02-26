"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchChannel = fetchChannel;
const discord_js_1 = require("discord.js");
const errors_1 = require("@src/types/errors");
/**
 * Fetch Channel
 *
 * This function fetches a channel by its ID using the provided Discord client.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to fetch.
 * @returns A promise that resolves to the channel object or null if not found.
 */
async function fetchChannel(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel instanceof discord_js_1.TextChannel) {
            return channel;
        }
        return null;
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord fetch channel error:', hivemindError);
        }
        return null;
    }
}
