import { IMessage } from "@message/types/IMessage";
import MessageResponseManager from "@message/responseHandling/MessageResponseManager";
import { LLMInterface } from "@llm/LLMInterface";
import logger from "@utils/logger";
import constants from "@comm@config/ConfigurationManager";
import { prepareMessageBody } from "@message/helpers/messageProcessing/prepareMessageBody";
import { summarizeMessage } from "@message/helpers/messageProcessing/summarizeMessage";
import { sendResponse } from "@message/followUp/sendResponse";
import { sendFollowUp } from "@message/followUp/sendFollowUp";

export async function processAIResponse(message: IMessage, historyMessages: IMessage[], startTime: number): Promise<void> {
    logger.debug('[messageHandler] process ai response');

    if (!MessageResponseManager.getInstance().shouldReplyToMessage(message)) {
        logger.info('[messageHandler] No AI response deemed necessary based on the content and context.');
        return;
    }

    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info('[messageHandler] LLM Manager busy.');
        return;
    }

    logger.debug('[messageHandler] processAiResponse called.');

    try {
        const topic = message.getChannelTopic();
        logger.debug('[messageHandler] channel topic is ' + topic + '.');

        const userMentions = message.getUserMentions();
        const channelUsers = message.getChannelUsers();

        let requestBody;
        try {
            requestBody = await prepareMessageBody(
                constants.LLM_SYSTEM_PROMPT, 
                message.getChannelId(), 
                historyMessages, 
                topic, 
                userMentions, 
                channelUsers
            );
            logger.debug('[messageHandler] LLM request body prepared: ' + JSON.stringify(requestBody));
        } catch (error: any) {
            logger.error('[messageHandler] Error preparing LLM request body: ' + error.message, { error });
            return;
        }

        let llmResponse;
        try {
            llmResponse = await llmManager.sendRequest(requestBody);
            logger.debug('[messageHandler] LLM request sent successfully.');
        } catch (error: any) {
            logger.error('[messageHandler] Error sending LLM request: ' + error.message, { error });
            return;
        }

        let responseContent;
        try {
            responseContent = llmResponse.getContent();
            logger.debug('[messageHandler] LLM response received. Response Content: ' + responseContent);

            if (typeof responseContent !== 'string') {
                logger.error('[messageHandler] Invalid response content type: ' + typeof responseContent);
                throw new Error('Expected string from LLM response, received type: ' + typeof responseContent);
            }

            const finishReason = llmResponse.getFinishReason();
            if (finishReason !== 'stop') {
                logger.error('[messageHandler] LLM response finished with reason: ' + finishReason);
                throw new Error('LLM response finished with reason: ' + finishReason);
            }

            if (!responseContent.trim()) {
                logger.error('[messageHandler] LLM provided an empty or invalid response.');
                throw new Error('LLM provided an empty or invalid response.');
            }

            if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
                responseContent = await summarizeMessage(responseContent);
                logger.info('[messageHandler] LLM response exceeded maximum length and was summarized.');
            }
        } catch (error: any) {
            logger.error('[messageHandler] Error processing LLM response content: ' + error.message, { error });
            return;
        }

        logger.debug('[messageHandler] Preparing to send response. Response Content: ' + responseContent);

        if (typeof responseContent !== 'string' && !Buffer.isBuffer(responseContent)) {
            logger.error('[messageHandler] responseContent is not string or is not Buffer');
            throw new Error('Invalid responseContent type: ' + typeof responseContent);
        }

        try {
            await sendResponse(responseContent, message.getChannelId(), startTime);
            logger.info('[messageHandler] LLM response sent to the channel successfully.');
        } catch (error: any) {
            logger.error('[messageHandler] Error sending response to channel: ' + error.message, { error });
            return;
        }

        if (constants.FOLLOW_UP_ENABLED) {
            try {
                await sendFollowUp(message, topic || 'General Discussion');
                logger.debug('[messageHandler] Follow-up interaction initiated.');
            } catch (error: any) {
                logger.error('[messageHandler] Error initiating follow-up interaction: ' + error.message, { error });
            }
        }
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info('[messageHandler] Message processing completed in ' + processingTime + 'ms.');
    }
}
