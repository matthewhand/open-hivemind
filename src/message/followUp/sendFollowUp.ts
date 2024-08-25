import { Client } from 'discord.js';
import logger from '@src/utils/logger';

/**
 * Sends a follow-up request to a specific channel based on the original message content.
 * 
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the follow-up request to.
 * @param originalMessage - The original message content that triggered the follow-up.
 */
export async function sendFollowUp(client: Client<boolean>, channelId: string, originalMessage: string): Promise<void> {
    try {
        // Simulate a follow-up request
        await client.channels.cache.get(channelId)?.send(`Follow-up: ${originalMessage}`);
        logger.info(`Follow-up message sent to channel ${channelId}.`);
    } catch (error: any) {
        logger.error('Failed to send follow-up message:', error);
    }
}
