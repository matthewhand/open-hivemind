const IMessage = require('../interfaces/IMessage');
//const CommandManager = require('../managers/CommandManager');
const MessageResponseManager = require('../managers/MessageResponseManager');
const LLMInterface = require('../interfaces/LLMInterface');
const constants = require('../config/constants');
const logger = require('../utils/logger');
const { sendResponse, sendFollowUp } = require('../utils/messageSendingUtils');
const { prepareMessageBody, summarizeMessage, processCommand } = require('../utils/messageProcessingUtils');
const { encrypt } = require('../utils/encryptionUtils');  // Import encryption utils

async function messageHandler(originalMsg, historyMessages = []) {
    if (!originalMsg) {
        logger.error('[messageHandler] No original message provided.');
        return;
    }
    
    const startTime = Date.now();
    logger.debug(`[messageHandler] originalMsg: ${JSON.stringify(originalMsg)}`);
    logger.debug(`[messageHandler] Started processing message ID: ${encrypt(originalMsg.getMessageId())} at ${new Date(startTime).toISOString()}`);

    if (!validateMessage(originalMsg)) {
        return;
    }

    logger.debug(`[messageHandler] validated message`);

    if (await processCommand(originalMsg)) {
        return;
    }

    logger.debug(`[messageHandler] processed command`);

    await processAIResponse(originalMsg, historyMessages, startTime);
}

function validateMessage(message) {
    if (!(message instanceof IMessage)) {
        logger.error(`[messageHandler] Invalid message object type.`);
        return false;
    }
    if (!message.getText().trim()) {
        logger.info(`[messageHandler] Received empty message.`);
        return false;
    }
    return true;
}

async function processAIResponse(message, historyMessages, startTime) {

    logger.debug(`[messageHandler] process ai response`);

    if (!MessageResponseManager.getInstance().shouldReplyToMessage(message)) {
        logger.info(`[messageHandler] No AI response deemed necessary based on the content and context.`);
        return;
    }

    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info(`[messageHandler] LLM Manager busy.`);
        return;
    }

    logger.debug(`[messageHandler] processAiResponse called.`);

    try {
        const topic = message.getChannelTopic();
        logger.debug(`[messageHandler] channel topic is ${topic}.`);
        const userMentions = message.getUserMentions().map(user => encrypt(user));  // Encrypt user mentions
        const channelUsers = message.getChannelUsers().map(user => encrypt(user));  // Encrypt channel users

        let requestBody;
        try {
            requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, message.getChannelId(), historyMessages, topic, userMentions, channelUsers);
            logger.debug(`[messageHandler] LLM request body prepared: ${JSON.stringify(requestBody)}`);
        } catch (error) {
            logger.error(`[messageHandler] Error preparing LLM request body: ${error.message}`, { error });
            return;
        }

        let llmResponse;
        try {
            llmResponse = await llmManager.sendRequest(requestBody);
            logger.debug(`[messageHandler] LLM request sent successfully.`);
        } catch (error) {
            logger.error(`[messageHandler] Error sending LLM request: ${error.message}`, { error });
            return;
        }

        let responseContent;
        try {
            responseContent = llmResponse.getContent();
            logger.debug(`[messageHandler] LLM response received. Response Content: ${responseContent}`);

            if (typeof responseContent !== 'string') {
                throw new Error(`Expected string from LLM response, received type: ${typeof responseContent}`);
            }

            const finishReason = llmResponse.getFinishReason();
            if (finishReason !== 'stop') {
                throw new Error(`LLM response finished with reason: ${finishReason}`);
            }

            if (!responseContent.trim()) {
                throw new Error("LLM provided an empty or invalid response.");
            }

            if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
                responseContent = await summarizeMessage(responseContent);
                logger.info(`[messageHandler] LLM response exceeded maximum length and was summarized.`);
            }
        } catch (error) {
            logger.error(`[messageHandler] Error processing LLM response content: ${error.message}`, { error });
            return;
        }

        logger.debug(`[messageHandler] Preparing to send response. Response Content: ${responseContent}`);

        if (typeof responseContent !== 'string' && !Buffer.isBuffer(responseContent)) {
            logger.error(`[messageHandler] responseContent is not string or is not Buffer`);
            throw new Error(`Invalid responseContent type: ${typeof responseContent}`);
        }

        try {
            await sendResponse(responseContent, message.getChannelId(), startTime);
            logger.info(`[messageHandler] LLM response sent to the channel successfully.`);
        } catch (error) {
            logger.error(`[messageHandler] Error sending response to channel: ${error.message}`, { error });
            return;
        }

        if (constants.FOLLOW_UP_ENABLED) {
            try {
                await sendFollowUp(message, topic || "General Discussion");
                logger.debug(`[messageHandler] Follow-up interaction initiated.`);
            } catch (error) {
                logger.error(`[messageHandler] Error initiating follow-up interaction: ${error.message}`, { error });
            }
        }
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info(`[messageHandler] Message processing completed in ${processingTime}ms.`);
    }
}

module.exports = { messageHandler };
