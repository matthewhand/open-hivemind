import Debug from "debug";
const debug = Debug("app");

import ConfigurationManager from '@config/ConfigurationManager';
import { Client, PermissionsBitField, VoiceChannel } from 'discord.js';
import { joinVoiceChannel, VoiceConnection, VoiceConnectionStatus, EndBehaviorType } from '@discordjs/voice';
import constants from '@config/ConfigurationManager';
import { playWelcomeMessage } from './playWelcomeMessage';
import { handleAudioStream } from './handleAudioStream';
import Debug from 'debug';
const debug = Debug('app:voice:setupVoiceChannel');

/**
 * Sets up the voice channel by joining it and configuring the connection to handle audio streams.
 * Ensures the bot has the necessary permissions and logs relevant information for debugging.
 */
export async function setupVoiceChannel(client: Client): Promise<VoiceConnection | void> {
    const VOICE_CHANNEL_ID = ConfigurationManager.getConfig('VOICE_CHANNEL_ID', 'default_voice_channel_id');
    debug('VOICE_CHANNEL_ID: ' + VOICE_CHANNEL_ID);
    if (!VOICE_CHANNEL_ID) {
        debug('VOICE_CHANNEL_ID is not set in the environment variables.');
        return;
    }
    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
        debug('Fetched channel: ' + (channel ? channel.id : 'null'));
        if (!channel || !(channel instanceof VoiceChannel)) {
            debug('Channel with ID ' + VOICE_CHANNEL_ID + ' is not a valid voice channel.');
            return;
        }
        if (!client.user) {
            debug('Client user is not defined.');
            return;
        }
        const permissions = channel.permissionsFor(client.user);
        debug('Permissions for channel: ' + (permissions ? permissions.bitfield : 'null'));
        if (!permissions) {
            debug('Unable to fetch permissions for channel: ' + channel.name);
            return;
        }
        if (!permissions.has(PermissionsBitField.Flags.Connect)) {
            debug('Missing CONNECT permission for voice channel: ' + channel.name);
            return;
        }
        if (!permissions.has(PermissionsBitField.Flags.Speak)) {
            debug('Missing SPEAK permission for voice channel: ' + channel.name);
            return;
        }
        if (!permissions.has(PermissionsBitField.Flags.UseVAD)) {
            debug('Missing USE_VOICE_ACTIVITY permission for voice channel: ' + channel.name);
            return;
        }
        debug('Attempting to join voice channel: ' + channel.name + ' (' + channel.id + ')');
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        debug('Voice connection object: ' + JSON.stringify(connection));
        connection.on(VoiceConnectionStatus.Ready, async () => {
            debug('Successfully connected to the voice channel: ' + channel.name);
            await playWelcomeMessage(connection);
        });
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            debug('Disconnected from the voice channel.');
        });
        connection.on(VoiceConnectionStatus.Destroyed, () => {
            debug('Voice connection destroyed.');
        });
        connection.on('error', (error) => {
            debug('Voice connection error: ' + error.message);
        });
        connection.receiver.speaking.on('start', (userId) => {
            debug('User ' + userId + ' started speaking');
            const audioStream = connection.receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 5000 } });
            handleAudioStream(audioStream, userId, connection);
        });
        return connection;
    } catch (error: any) {
        debug('Error setting up voice channel: ' + (error instanceof Error ? error.message : String(error)));
    }
}
