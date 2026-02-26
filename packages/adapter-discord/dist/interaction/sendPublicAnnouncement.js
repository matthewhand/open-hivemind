"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPublicAnnouncement = sendPublicAnnouncement;
const discord_js_1 = require("discord.js");
const debug_1 = __importDefault(require("debug"));
const DiscordService_1 = require("../DiscordService");
const errors_1 = require("@src/types/errors");
const discordSvc = DiscordService_1.DiscordService.getInstance();
const debug = (0, debug_1.default)('app:sendPublicAnnouncement');
async function sendPublicAnnouncement(channelId, announcement) {
    const client = discordSvc.getClient();
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(announcement.title || '📢 Public Announcement')
        .setDescription(announcement.description || 'No description provided')
        .setColor((announcement.color || '#0099ff'))
        .setTimestamp();
    try {
        const channel = await client.channels.fetch(channelId);
        if (!(channel instanceof discord_js_1.TextChannel || channel instanceof discord_js_1.DMChannel)) {
            throw errors_1.ErrorUtils.createError('Unsupported channel type.', 'ValidationError', 'DISCORD_UNSUPPORTED_CHANNEL_TYPE', 400, { channelId, channelType: channel === null || channel === void 0 ? void 0 : channel.type });
        }
        if (channel instanceof discord_js_1.PartialGroupDMChannel) {
            throw errors_1.ErrorUtils.createError('Cannot send messages to PartialGroupDMChannel.', 'ValidationError', 'DISCORD_CANNOT_SEND_TO_PARTIAL_GROUP_DM', 400, { channelId });
        }
        await channel.send({ embeds: [embed] });
        debug(`Announcement sent to channel ${channelId}`);
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug(`Failed to send announcement: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord send public announcement error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Failed to send public announcement: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'DISCORD_SEND_PUBLIC_ANNOUNCEMENT_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error, channelId });
    }
}
