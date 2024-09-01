import Debug from 'debug';
import { VoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import { Client, GatewayIntentBits } from 'discord.js';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:setupVoiceChannel');
const configManager = ConfigurationManager.getInstance();
const discordConfig = configManager.getConfig('discord');

/**
 * Sets up a voice channel connection and returns the connection object.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the voice channel to connect to.
 * @returns {Promise<VoiceConnection>} The voice connection object.
 */
export async function setupVoiceChannel(client: Client, channelId: string): Promise<VoiceConnection> {
    if (!discordConfig) {
        throw new Error('Discord configuration is not loaded.');
    }

    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const guildId = discordConfig.get<string>('DISCORD_GUILD_ID');
    const channel = await client.channels.fetch(channelId);

    if (!channel || !channel.isVoice()) {
        throw new Error('The specified channel is not a voice channel.');
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    debug('Connected to voice channel:', channelId);
    return connection;
}
