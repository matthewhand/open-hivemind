import Debug from "debug";
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendFollowUp } from './sendFollowUp';

/**
 * Handles the follow-up request by sending a follow-up message.
 *
 * @param message - The original message.
 * @param channelId - The ID of the channel to send the follow-up to.
 * @param topic - The topic of the follow-up message.
 */
export async function sendFollowUpRequest(message: IMessage, channelId: string, topic: string): Promise<void> {
    try {
        await sendFollowUp(message, channelId, topic);
    } catch (error: any) {
        console.error('[sendFollowUpRequest] Error sending follow-up request:', error);
    }
}
