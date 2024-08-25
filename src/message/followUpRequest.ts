import logger from '@src/utils/logger';
import { fetchMessages } from '@src/message/discord/utils/fetchMessages';
import { getRandomAliasCommand } from '@src/utils/aliasUtils';
import { sendLlmRequestUtils } from '@src/utils/sendLlmRequestUtils';
import { Client } from 'discord.js';

/**
 * Determines if a follow-up should be sent based on recent conversation history.
 * @param {Client} client - The Discord client instance.
 * @param {any} message - The message object.
 * @param {number} threshold - The threshold for deciding if a follow-up is needed.
 * @returns {Promise<boolean>} - True if a follow-up should be sent, otherwise false.
 */
export async function shouldSendFollowUp(client: Client, message: any, threshold: number): Promise<boolean> {
    try {
        const recentMessages = await fetchMessages(client, message.channel.id);
        return recentMessages.length <= threshold;
    } catch (error: any) {
        logger.error(`Error in shouldSendFollowUp: ${error.message}`);
        return false;
    }
}

/**
 * Schedules a follow-up request by generating a reflective prompt and sending it.
 * @param {Client} client - The Discord client instance.
 * @param {any} message - The message object.
 * @returns {Promise<void>} - Resolves when the follow-up request is scheduled.
 */
export async function scheduleFollowUpRequest(client: Client, message: any): Promise<void> {
    try {
        const aliasCommand = getRandomAliasCommand();
        const reflectivePrompt = 'Reflecting on the recent conversation, how might the command ' + aliasCommand + ' provide further insights?';
        await sendLlmRequestUtils(client, message, reflectivePrompt);
    } catch (error: any) {
        logger.error(`Error in scheduleFollowUpRequest: ${error.message}`);
    }
}
