import Debug from 'debug';
import { DMChannel, EmbedBuilder, PartialGroupDMChannel, TextChannel } from 'discord.js';
import { ErrorUtils, HivemindError } from '@src/types/errors';
import { DiscordService } from '../DiscordService';

const discordSvc = DiscordService.getInstance();

const debug = Debug('app:sendPublicAnnouncement');

export async function sendPublicAnnouncement(
  channelId: string,
  announcement: { title?: string; description?: string; color?: string }
): Promise<void> {
  const client = discordSvc.getClient();

  const embed = new EmbedBuilder()
    .setTitle(announcement.title || '📢 Public Announcement')
    .setDescription(announcement.description || 'No description provided')
    .setColor((announcement.color || '#0099ff') as any)
    .setTimestamp();

  try {
    const channel = await client.channels.fetch(channelId);
    if (!(channel instanceof TextChannel || channel instanceof DMChannel)) {
      throw ErrorUtils.createError(
        'Unsupported channel type.',
        'ValidationError' as any,
        'DISCORD_UNSUPPORTED_CHANNEL_TYPE',
        400,
        { channelId, channelType: channel?.type }
      );
    }
    if (channel instanceof PartialGroupDMChannel) {
      throw ErrorUtils.createError(
        'Cannot send messages to PartialGroupDMChannel.',
        'ValidationError' as any,
        'DISCORD_CANNOT_SEND_TO_PARTIAL_GROUP_DM',
        400,
        { channelId }
      );
    }

    await channel.send({ embeds: [embed] });
    debug(`Announcement sent to channel ${channelId}`);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug(`Failed to send announcement: ${ErrorUtils.getMessage(hivemindError)}`);

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord send public announcement error:', hivemindError);
    }

    throw ErrorUtils.createError(
      `Failed to send public announcement: ${ErrorUtils.getMessage(hivemindError)}`,
      classification.type,
      'DISCORD_SEND_PUBLIC_ANNOUNCEMENT_ERROR',
      ErrorUtils.getStatusCode(hivemindError),
      { originalError: error, channelId }
    );
  }
}
