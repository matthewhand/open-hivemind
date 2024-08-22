import axios from 'axios';
import loadServerPolicy from './loadServerPolicy';
import configurationManager from '@config/ConfigurationManager';
import logger from '@src/utils/logger';

/**
 * Determines if a user should be banned based on chat history and server policy.
 * 
 * @param chatHistory - The chat history as an array of messages.
 * @param userId - The ID of the user in question.
 * @returns A promise that resolves to the decision on banning the user.
 */
export async function shouldUserBeBanned(chatHistory: string[], userId: string): Promise<string> {
    const serverPolicy = loadServerPolicy();
    const prompt = 'Given the chat history and server policy, should user ' + userId + ' be banned?';
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY');

    try {
        const response = await axios.post(LLM_ENDPOINT_URL, {
            prompt: chatHistory.join('\n') + '\n\nServer Policy:\n' + serverPolicy + '\n\n' + prompt,
            model: LLM_MODEL,
        }, {
            headers: { Authorization: 'Bearer ' + LLM_API_KEY },
        });

        logger.debug('Moderation decision request sent for user ' + userId, { userId, prompt });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].text.trim();
        } else {
            logger.warn('Moderation decision request did not return expected data.');
            return 'Unable to determine.';
        }
    } catch (error: any) {
        logger.error('Error determining ban for user ' + userId + ': ' + error);
        throw new Error('Failed to determine ban decision.');
    }
}
