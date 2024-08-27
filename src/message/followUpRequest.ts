import Debug from "debug";
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendFollowUpRequest } from '@src/message/helpers/followUp/sendFollowUpRequest';

/**
 * Handles the follow-up request by sending a follow-up message.
 *
 * @param message - The original message.
 * @param channelId - The ID of the channel to send the follow-up to.
 * @param topic - The topic of the follow-up message.
 */
export async function followUpRequest(message: IMessage): Promise<void> {
    const channelId = message.getChannelId();
    const topic = message.getChannelTopic() || 'General Discussion';

    try {
        await sendFollowUpRequest(message, channelId, topic);
    } catch (error: any) {
        console.error('[followUpRequest] Error sending follow-up request:', error);
    }
}
