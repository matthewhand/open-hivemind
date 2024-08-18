import axios from 'axios';
import configurationManager from '../config/configurationManager';
import logger from './logger';
import { getRandomDelay } from './common';
import { aliases } from '../config/aliases';

/**
 * Sends a follow-up request to the LLM endpoint with a reflective prompt.
 * @param {any} message - The message object.
 * @param {string} aliasCommand - The alias command to include in the prompt.
 * @returns {Promise<void>} - Resolves when the follow-up request is sent.
 */
export async function sendFollowUpRequest(message: any, aliasCommand: string): Promise<void> {
    try {
        const reflectivePrompt = 'Given the conversation, how might the command !' + aliasCommand + ' provide further insights?';

        const response = await axios.post(configurationManager.getConfig('LLM_ENDPOINT_URL'), {
            model: configurationManager.getConfig('LLM_MODEL'),
            prompt: reflectivePrompt,
            max_tokens: 200
        }, {
            headers: { 'Authorization': 'Bearer ' + configurationManager.getConfig('API_KEY') }
        });

        const suggestion = response.data.choices[0].text.trim();
        await message.channel.send('🤖 LLM Suggestion: ' + suggestion);
    } catch (error: any) {
        logger.error('Error in sendFollowUpRequest: ' + error.message);
        await message.channel.send('An error occurred while processing a follow-up suggestion.');
    }
}

/**
 * Schedules a follow-up request after a random delay.
 * @param {any} message - The message object.
 */
export function scheduleFollowUpRequest(message: any): void {
    const randomAlias = Object.keys(aliases)[Math.floor(Math.random() * Object.keys(aliases).length)];
    const delay = getRandomDelay(2 * 60 * 1000, 10 * 60 * 1000);
    setTimeout(() => sendFollowUpRequest(message, randomAlias), delay);
}
