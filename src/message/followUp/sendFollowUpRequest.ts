import { sendResponse } from '@src/message/discord/utils/sendResponse';
import logger from '@src/utils/logger';
import { Client } from 'discord.js';

export async function sendFollowUpRequest(client: Client<boolean>, channelId: string, originalMessage: string, followUpMessage: string): Promise<void> {
    try {
        await sendResponse(client, channelId, followUpMessage);
        logger.info(`Follow-up message sent: ${followUpMessage}`);
    } catch (error: any) {
        logger.error('Failed to send follow-up request:', error);
    }
}
