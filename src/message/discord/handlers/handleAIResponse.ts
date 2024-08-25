import { IMessage } from '@src/message/interfaces/IMessage';
import { LLMInterface } from '@src/llm/LLMInterface';
import { prepareMessageBody } from '../processing/prepareMessageBody';
import { summarizeMessage } from '../processing/summarizeMessage';
import { sendFollowUp } from '../utils/sendFollowUp';
import { sendMessageToChannel } from '../utils/sendMessageToChannel';
import constants from '@config/ConfigurationManager';
import logger from '@src/utils/logger';

/**
 * Handles the logic for processing an AI response to a message.
 * @param message - The incoming message.
 */
export async function handleAIResponse(message: IMessage): Promise<void> {
    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info('LLM Manager is busy.');
        return;
    }

    let requestBody;
    try {
        requestBody = await prepareMessageBody(
            constants.LLM_SYSTEM_PROMPT,
            message.getChannelId(),
            []
        );
        logger.debug(`Prepared requestBody: ${JSON.stringify(requestBody)}`);
    } catch (error: any) {
        logger.error('Error preparing LLM request body:', error);
        return;
    }

    let llmResponse;
    try {
        llmResponse = await llmManager.sendRequest(requestBody);
        logger.debug('LLM request sent successfully.');
    } catch (error: any) {
        logger.error('Error sending LLM request:', error);
        return;
    }

    let responseContent;
    try {
        responseContent = llmResponse.getContent();
        logger.debug(`LLM response content: ${responseContent}`);

        if (typeof responseContent !== 'string') {
            throw new Error(`Expected string from LLM response, received: ${typeof responseContent}`);
        }

        const finishReason = llmResponse.getFinishReason();
        if (finishReason !== 'stop') {
            throw new Error(`LLM response finished with reason: ${finishReason}`);
        }

        if (!responseContent.trim()) {
            throw new Error('LLM provided an empty or invalid response.');
        }

        if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
            responseContent = await summarizeMessage(responseContent);
            logger.info('LLM response summarized due to length.');
        }
    } catch (error: any) {
        logger.error('Error processing LLM response content:', error);
        return;
    }

    try {
        await sendMessageToChannel(message.getChannelId(), responseContent);
        logger.info('Sent message to channel successfully.');
    } catch (error: any) {
        logger.error('Error sending response to channel:', error);
        return;
    }

    if (constants.FOLLOW_UP_ENABLED) {
        try {
            await sendFollowUp(message, message.getChannelId(), message.getChannelTopic() || 'General Discussion');
            logger.debug('Follow-up interaction initiated.');
        } catch (error: any) {
            logger.error('Error initiating follow-up interaction:', error);
        }
    }
}
