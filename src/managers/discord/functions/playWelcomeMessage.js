const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const logger = require('../../../utils/logger');
const constants = require('../../../config/constants');
const { generateDependencyReport } = require('@discordjs/voice');
const OpenAI = require('openai');
const fs = require('fs');
const util = require('util');

/**
 * Plays a welcome message in a specified voice channel.
 * @param {VoiceChannel} voiceChannel - The voice channel to join and play the welcome message.
 */
const playWelcomeMessage = async (voiceChannel) => {
    const welcomeMessage = constants.WELCOME_MESSAGE;
    logger.info('Playing welcome message:  + welcomeMessage + ');
    logger.debug('Dependency Report:\n' + generateDependencyReport());

    const openai = new OpenAI({
        apiKey: constants.NARRATION_API_KEY
    });

    try {
        // Generate speech using OpenAI's text-to-speech API
        const response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'nova',
            input: welcomeMessage,
        });

        // Get the audio data as a buffer
        const buffer = Buffer.from(await response.arrayBuffer());

        // Write the buffer to a file
        const writeFile = util.promisify(fs.writeFile);
        await writeFile('welcome.mp3', buffer);

        // Play the audio file
        const player = createAudioPlayer();
        const resource = createAudioResource('welcome.mp3');
        player.play(resource);
        voiceChannel.connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            fs.unlinkSync('welcome.mp3');
        });

        player.on('error', error => {
            logger.error('Error playing welcome message: ' + error.message);
        });

    } catch (error) {
        logger.error('Error generating welcome message: ' + error.message);
        if (error.response) {
            logger.error('Response status: ' + error.response.status);
            logger.error('Response data: ' + JSON.stringify(error.response.data));
        }
    }
};

module.exports = playWelcomeMessage;
