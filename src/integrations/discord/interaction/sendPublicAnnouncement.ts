import { EmbedBuilder, TextChannel, DMChannel, PartialGroupDMChannel } from 'discord.js';
import Debug from 'debug';
import { DiscordService } from '@src/integrations/discord/DiscordService';

const log = Debug('app:sendPublicAnnouncement');

/**
 * Sends a public announcement using an embedded message.
 */
export async function sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
  const client = DiscordService.getInstance().client;

  const embed = new EmbedBuilder()
    .setTitle(announcement.title || '📢 Public Announcement')
    .setDescription(announcement.description || 'No description provided')
    .setColor(announcement.color || '#0099ff')
    .setTimestamp();

  try {
    const channel = await client.channels.fetch(channelId);
    if (!(channel instanceof TextChannel || channel instanceof DMChannel)) {
      throw new Error('Unsupported channel type.');
    }
    if (channel instanceof PartialGroupDMChannel) {
      throw new Error('Cannot send messages to PartialGroupDMChannel.');
    }

    await channel.send({ embeds: [embed] });
    log(`Announcement sent to channel ${channelId}`);
  } catch (error) {
    const err = error as Error
    log(`Failed to send announcement: ${err.message}`);
    throw err;
  }
}
