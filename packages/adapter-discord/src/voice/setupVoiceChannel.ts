import Debug from 'debug';
import { ChannelType, type Client, type GuildChannel, type VoiceChannel } from 'discord.js';
import { ErrorUtils, HivemindError } from '@src/types/errors';

const debug = Debug('app:setupVoiceChannel');

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
export async function setupVoiceChannel(
  client: Client,
  channelId: string
): Promise<VoiceChannel | null> {
  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      debug('Channel not found or is not a voice channel');
      return null;
    }

    const guildChannel = channel as GuildChannel;
    const voiceChannel = channel;

    if (!('guild' in guildChannel)) {
      debug('Voice channel does not belong to a guild');
      return null;
    }

    debug('Voice channel setup complete.');
    return voiceChannel;
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Error setting up voice channel: ' + ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord setup voice channel error:', hivemindError);
    }

    return null;
  }
}
