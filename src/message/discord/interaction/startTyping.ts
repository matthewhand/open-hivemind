import { Client, TextChannel, NewsChannel } from 'discord.js';
export async function startTyping(client: Client, channelId: string): Promise<void> {
    try {
        debug.debug('[DiscordManager] Fetching channel ID: ' + channelId);
        const channel = await client.channels.fetch(channelId);
        debug.debug('[DiscordManager] Fetched channel: ' + (channel ? channel.id : 'null'));
        if (!channel) {
            debug('[DiscordManager] Channel with ID: ' + channelId + ' not found.');
            return;
        }
        debug.debug('[DiscordManager] Channel type: ' + channel.type);
        if (channel instanceof TextChannel || channel instanceof NewsChannel) {
            // TODO confirm permission before attempting to send
            // const permissions = channel.permissionsFor(client.user!);
            // if (!permissions || !permissions.has(PermissionsBitField.Flags.SEND_MESSAGES)) {
            //     debug('[DiscordManager] Missing SEND_MESSAGES permission in channel ID: ' + channelId);
            //     return;
            // }
            await channel.sendTyping();
            debug.debug('[DiscordManager] Started typing in channel ID: ' + channelId);
        } else {
            debug.debug('[DiscordManager] Channel ID: ' + channelId + ' does not support typing.');
        }
    } catch (error: any) {
        debug('[DiscordManager] Failed to start typing in channel ID: ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
    }
}
