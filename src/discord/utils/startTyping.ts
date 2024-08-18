import { Client, PermissionsBitField } from 'discord.js';
import logger from '../../utils/logger';

/**
 * Signals that the bot is typing in a specific channel. This visual cue can make interactions
 * feel more dynamic and responsive.
 * @param {Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel where the bot appears to start typing.
 * @returns {Promise<void>}
 */
export async function startTyping(client: Client, channelId: string): Promise<void> {
    try {
        logger.debug('[DiscordManager] Fetching channel ID: ' + channelId);
        const channel = await client.channels.fetch(channelId);
        logger.debug('[DiscordManager] Fetched channel: ' + (channel ? channel.id : 'null'));

        if (!channel) {
            logger.error('[DiscordManager] Channel with ID: ' + channelId + ' not found.');
            return;
        }

        logger.debug('[DiscordManager] Channel type: ' + channel.type);
        if (channel.isTextBased()) {
            // Check if the bot has permission to send messages in the channel
            const permissions = channel.permissionsFor(client.user!);
            if (!permissions || !permissions.has(PermissionsBitField.Flags.SendMessages)) {
                logger.error('[DiscordManager] Missing SEND_MESSAGES permission in channel ID: ' + channelId);
                return;
            }

            await channel.sendTyping();
            logger.debug('[DiscordManager] Started typing in channel ID: ' + channelId);
        } else {
            logger.debug('[DiscordManager] Channel ID: ' + channelId + ' does not support typing.');
        }
    } catch (error) {
        logger.error('[DiscordManager] Failed to start typing in channel ID: ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
    }
}
