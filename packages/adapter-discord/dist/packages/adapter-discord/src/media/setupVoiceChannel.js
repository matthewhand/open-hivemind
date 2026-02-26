"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupVoiceChannel = setupVoiceChannel;
const discord_js_1 = require("discord.js");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:setupVoiceChannel');
/**
 * Setup Voice Channel
 *
 * This function handles the setup of a voice channel in Discord.
 * It ensures that the channel is ready for use and manages any necessary configurations.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to set up.
 * @returns The configured voice channel object.
 */
async function setupVoiceChannel(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== discord_js_1.ChannelType.GuildVoice) {
            debug('Channel not found or is not a voice channel');
            return null;
        }
        const guildChannel = channel;
        const voiceChannel = channel;
        if (!guildChannel.guild) {
            debug('Voice channel does not belong to a guild');
            return null;
        }
        debug('Voice channel setup complete.');
        return voiceChannel;
    }
    catch (error) {
        debug('Error setting up voice channel: ' + error.message);
        return null;
    }
}
