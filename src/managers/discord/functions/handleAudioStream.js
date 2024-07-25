// const { Readable } = require('stream');
const logger = require('../../../utils/logger');

/**
 * Handles audio streaming to a Discord voice connection.
 * @param {ReadableStream} audioStream - The audio stream to play.
 * @param {VoiceConnection} connection - The voice connection to stream to.
 */
const handleAudioStream = (audioStream, connection) => {
    const dispatcher = connection.play(audioStream, { type: 'unknown' });

    dispatcher.on('start', () => {
        logger.info('Audio stream started.');
    });

    dispatcher.on('finish', () => {
        logger.info('Audio stream finished.');
    });

    dispatcher.on('error', (error) => {
        logger.error('Error in audio stream: ' + error.message);
    });
};

module.exports = handleAudioStream;
