const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const util = require('util');
const OpenAI = require('openai');
const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const constants = require('../../../config/constants');
const logger = require('../../../utils/logger');

/**
 * Plays a welcome message in the voice channel.
 * @param {VoiceConnection} connection - The voice connection to use.
 */
async function playWelcomeMessage(connection) {
    const welcomeMessage = constants.WELCOME_MESSAGE;
    logger.info('Playing welcome message: ' + welcomeMessage);
    logger.debug('joinVoiceChannel is available: ' + typeof joinVoiceChannel !== 'undefined');

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
        connection.subscribe(player);

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
}

module.exports = playWelcomeMessage;
