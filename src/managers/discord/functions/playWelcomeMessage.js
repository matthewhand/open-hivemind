const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const logger = require('../../../utils/logger');
// const constants = require('../../../config/constants');

/**
 * Plays a welcome message in a specified voice channel.
 * @param {VoiceChannel} voiceChannel - The voice channel to join and play the welcome message.
 */
const playWelcomeMessage = async (voiceChannel) => {
    try {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource('path/to/welcome/message'); // Adjust the path as needed

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
            logger.info('Playing welcome message.');
        });

        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
            logger.info('Welcome message finished.');
        });

        player.on('error', (error) => {
            logger.error('Error playing welcome message: ' + error.message);
        });
    } catch (error) {
        logger.error('Error joining voice channel: ' + error.message);
    }
};

module.exports = playWelcomeMessage;
