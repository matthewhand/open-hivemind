import Debug from "debug";
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendFollowUpRequest } from '@src/message/helpers/followUp/sendFollowUpRequest';
import { Client } from 'discord.js';

/**
 * Handles the follow-up request by sending a follow-up message.
 *
 * @param message - The original message.
 * @param client - The Discord client to send the message.
 */
export async function followUpRequest(message: IMessage, client: Client): Promise<void> {
    const channelId = message.getChannelId();
    const topic = message.getChannelTopic() || 'General Discussion';

    try {
        // Fix: Add client argument to match sendFollowUpRequest signature.
        await sendFollowUpRequest(client, message, channelId, topic);
    } catch (error: any) {
        console.error('[followUpRequest] Error sending follow-up request:', error);
    }
}
