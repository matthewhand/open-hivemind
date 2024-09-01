import { Client, GatewayIntentBits, VoiceBasedChannel, Channel } from 'discord.js';
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
export async function setupVoiceChannel(client: Client, channelId: string): Promise<VoiceBasedChannel | null> {
    try {
        const channel = await client.channels.fetch(channelId) as VoiceBasedChannel | null;

        if (!channel) {
            debug('Channel not found');
            return null;
        }

        // Check if the channel is a voice channel
        if (!channel.isVoiceBased()) {
            debug('Channel is not a voice-based channel');
            return null;
        }

        debug('Voice channel setup complete.');
        return channel;
    } catch (error: any) {
        debug('Error setting up voice channel: ' + error.message);
        return null;
    }
}
