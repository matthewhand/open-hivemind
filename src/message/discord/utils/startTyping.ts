import { Client, ChannelType, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import logger from '@src/utils/logger';

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
        if (channel.isTextBased() && (channel instanceof TextChannel || channel instanceof DMChannel || channel instanceof NewsChannel)) {
            const textChannel = channel as TextChannel;
            const permissions = textChannel.permissionsFor(client.user!);
            if (!permissions || !permissions.has('SEND_MESSAGES')) {
                logger.error('[DiscordManager] Missing SEND_MESSAGES permission in channel ID: ' + channelId);
                return;
            }

            await textChannel.sendTyping();
            logger.debug('[DiscordManager] Started typing in channel ID: ' + channelId);
        } else {
            logger.debug('[DiscordManager] Channel ID: ' + channelId + ' does not support typing.');
        }
    } catch (error: any) {
        logger.error('[DiscordManager] Failed to start typing in channel ID: ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
    }
}
