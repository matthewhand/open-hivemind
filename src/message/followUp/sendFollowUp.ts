import OpenAI from '@src/llm/openai/OpenAI';
import logger from '@src/utils/logger';
import { sendMessageToChannel } from '@src/message/followUp/sendMessageToChannel';
import constants from '@config/ConfigurationManager';

export async function sendFollowUp(originalMessage: any, topic: string): Promise<void> {
    try {
        const followUpText = await OpenAI.getInstance().sendRequest({ content: topic, originalMessage });

        if (followUpText) {
            await sendMessageToChannel(followUpText, originalMessage.channel.id, Date.now());
            logger.info('[sendFollowUp] Follow-up message sent successfully.');
        } else {
            logger.warn('[sendFollowUp] No follow-up text generated.');
        }
    } catch (error: any) {
        logger.error('[sendFollowUp] Failed to send follow-up message. Error: ' + error.message, { error });
    }
}
