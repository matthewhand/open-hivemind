const OpenAI = require('openai');
const logger = require('../../utils/logger');
const fs = require('fs');
const constants = require('../../config/constants');

/**
 * Transcribes audio using the OpenAI API.
 * @param {string} audioFilePath - The path to the audio file to be transcribed.
 * @returns {Promise<string>} The transcribed text.
 */
async function transcribeAudio(audioFilePath) {
    try {
        const openai = new OpenAI({
            apiKey: constants.TRANSCRIBE_API_KEY
        });

        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: 'whisper-1', // Assuming you are using OpenAI Whisper model
            response_format: 'text', // Specify the desired response format
            headers: {
                'Content-Type': 'audio/wav' // Ensure the correct content type is specified
            }
        });

        logger.debug('transcribeAudio: Response data:', response.data);
        return response.data.text;
    } catch (error) {
        logger.error('transcribeAudio: Error transcribing audio: ' + error.message);
        if (error.response) {
            logger.debug('transcribeAudio: Response status: ' + error.response.status);
            logger.debug('transcribeAudio: Response data: ' + JSON.stringify(error.response.data));
        }
        throw error;
    }
}

module.exports = transcribeAudio;
