import { Client, VoiceChannel, ChannelType } from 'discord.js';
import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:setupVoiceChannel');
const configManager = ConfigurationManager.getInstance();

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
export async function setupVoiceChannel(client: Client, channelId: string): Promise<VoiceChannel | null> {
  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      debug('Channel not found or is not a voice channel');
      return null;
    }

    const voiceChannel = channel as VoiceChannel;

    if (!voiceChannel.guild) {
      debug('Voice channel does not belong to a guild');
      return null;
    }

    debug('Voice channel setup complete.');
    return voiceChannel;
  } catch (error: any) {
    debug('Error setting up voice channel: ' + error.message);
    return null;
  }
}
