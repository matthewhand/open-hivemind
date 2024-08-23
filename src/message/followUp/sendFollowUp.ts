import OpenAiManager from '@src/llm/OpenAiManager';
import logger from '@src/utils/logger';
import { sendResponse } from '@src/message/followUp/sendResponse';
import constants from '@config/ConfigurationManager';

export async function sendFollowUp(originalMessage: any, topic: string): Promise<void> {
    try {
        const followUpText = await OpenAiManager.getInstance().sendRequest({ content: topic, originalMessage });

        if (followUpText) {
            await sendResponse(followUpText, originalMessage.channel.id, Date.now());
            logger.info('[sendFollowUp] Follow-up message sent successfully.');
        } else {
            logger.warn('[sendFollowUp] No follow-up text generated.');
        }
    } catch (error: any) {
        logger.error('[sendFollowUp] Failed to send follow-up message. Error: ' + error.message, { error });
    }
}
