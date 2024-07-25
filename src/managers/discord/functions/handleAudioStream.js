const logger = require('../../../utils/logger');
const fs = require('fs');
const { convertOpusToWav } = require('../../../utils/audioConversion');
const { transcribeAudio, generateResponse, playAudioResponse } = require('../../../utils/audioProcessing');

/**
 * Handles audio streaming to a Discord voice connection.
 * @param {ReadableStream} stream - The audio stream to handle.
 * @param {string} userId - The ID of the user sending the audio.
 * @param {VoiceConnection} connection - The voice connection to stream to.
 */
const handleAudioStream = async (stream, userId, connection) => {
    const audioChunks = [];
    logger.debug('handleAudioStream: Initialized for user ' + userId);

    stream.on('data', (chunk) => {
        logger.info('Receiving audio data from user ' + userId);
        audioChunks.push(chunk);
        logger.debug('handleAudioStream: Collected audio chunk of size ' + chunk.length);
    });

    stream.on('end', async () => {
        logger.debug('handleAudioStream: End of audio stream for user ' + userId);

        try {
            const audioBuffer = Buffer.concat(audioChunks);
            logger.debug('handleAudioStream: Concatenated audio buffer size ' + audioBuffer.length);

            if (audioBuffer.length === 0) {
                logger.warn('handleAudioStream: Audio buffer is empty, skipping transcription');
                return;
            }

            const wavBuffer = await convertOpusToWav(audioBuffer);
            const audioFilePath = 'audio.wav';
            fs.writeFileSync(audioFilePath, wavBuffer);

            // Log file details for debugging
            const stats = fs.statSync(audioFilePath);
            logger.debug('handleAudioStream: Saved WAV file size ' + stats.size);

            if (stats.size === 0) {
                logger.warn('handleAudioStream: WAV file size is 0, skipping transcription');
                return;
            }

            const transcript = await transcribeAudio(audioFilePath);
            if (transcript) {
                logger.info('Transcription: ' + transcript);
                logger.debug('handleAudioStream: Transcription successful');

                const response = await generateResponse(transcript);
                logger.debug('handleAudioStream: Generated response: ' + response);

                await playAudioResponse(connection, response);
                logger.debug('handleAudioStream: Played audio response');
            } else {
                logger.warn('handleAudioStream: Transcription returned null or undefined');
            }
        } catch (error) {
            logger.error('handleAudioStream: Error processing audio stream for user ' + userId + ': ' + error.message);
            logger.debug('handleAudioStream: Error stack trace: ' + error.stack);
        }
    });

    stream.on('error', (error) => {
        logger.error('handleAudioStream: Error in audio stream for user ' + userId + ': ' + error.message);
        logger.debug('handleAudioStream: Stream error stack trace: ' + error.stack);
    });
};

module.exports = handleAudioStream;
