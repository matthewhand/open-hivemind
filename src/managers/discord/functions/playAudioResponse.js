const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const axios = require('axios');
const logger = require('../../../utils/logger');
const fs = require('fs');
const util = require('util');
const constants = require('../../../config/constants');

/**
 * Plays the audio response back in the voice channel.
 * @param {VoiceConnection} connection - The voice connection object.
 * @param {string} text - The text to convert to speech and play.
 * @returns {Promise<void>}
 */
async function playAudioResponse(connection, text) {
    const narrationEndpointUrl = constants.NARRATION_ENDPOINT_URL;
    if (!narrationEndpointUrl) {
        logger.error('NARRATION_ENDPOINT_URL is not set in the environment variables.');
        return;
    }

    logger.debug('NARRATION_ENDPOINT_URL: ' + narrationEndpointUrl);

    const response = await axios.post(narrationEndpointUrl, {
        input: text,
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' }
    }, {
        headers: {
            'Authorization': 'Bearer ' + constants.NARRATION_API_KEY
        }
    });

    const audioBuffer = Buffer.from(response.data.audioContent, 'base64');

    const writeFile = util.promisify(fs.writeFile);
    await writeFile('output.mp3', audioBuffer);

    const player = createAudioPlayer();
    const resource = createAudioResource('output.mp3');
    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        fs.unlinkSync('output.mp3');
    });

    player.on('error', error => {
        logger.error('Error playing audio response: ' + error.message);
    });
}

module.exports = playAudioResponse;
