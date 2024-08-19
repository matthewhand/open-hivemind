import logger from '@utils/logger';
import constants from '../../config/configurationManager';
import OpenAiManager from '../../managers/OpenAiManager';

/**
 * Prepares the request body for the OpenAI API call, incorporating the provided message content,
 * channel history, and other contextual information.
 *
 * @param {string} prompt - The main content for the OpenAI prompt.
 * @param {string} [channelId=constants.CHANNEL_ID] - The ID of the Discord channel, defaults to a predefined channel ID.
 * @param {Array<Object>} [history=[]] - Historical messages to provide context.
 * @returns {Promise<Object>} A configuration object containing the model, prompt, and settings for the API call.
 */
export async function prepareMessageBody(prompt: string, channelId: string = constants.CHANNEL_ID, history: Array<Object> = []): Promise<Object> {
    if (typeof prompt !== 'string') {
        logger.error('[prepareMessageBody] Invalid prompt type: ' + typeof prompt, { prompt });
        throw new Error('Prompt must be a string.');
    }

    if (typeof channelId !== 'string') {
        logger.error('[prepareMessageBody] Invalid channelId type: ' + typeof channelId, { channelId });
        throw new Error('ChannelId must be a string.');
    }

    if (!Array.isArray(history)) {
        logger.error('[prepareMessageBody] Invalid history type: ' + typeof history, { history });
        throw new Error('History must be an array.');
    }

    logger.debug('[prepareMessageBody] Preparing message body for channel ID: ' + channelId + ' with prompt: ' + prompt.substring(0, 50) + '...', { prompt, channelId });

    return OpenAiManager.getInstance().buildRequestBody(history, prompt);
}
