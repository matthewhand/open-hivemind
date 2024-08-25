import OpenAiManager from '@src/llm/openai/manager/OpenAiManager';
import logger from '@src/utils/logger';
import { sendMessageToChannel } from '@src/message/discord/utils/sendMessageToChannel';
import constants from '@config/ConfigurationManager';
import { makeOpenAiRequest } from '@src/message/followUp/messageSendingUtils';

export async function sendFollowUp(originalMessage: any, topic: string): Promise<void> {
    try {
        const requestBody = {
            model: constants.LLM_MODEL,
            prompt: topic,
            max_tokens: 420,
            stop: ['\n', ' END'],
        };
        const followUpText = await makeOpenAiRequest(OpenAiManager.getInstance(), requestBody);

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
