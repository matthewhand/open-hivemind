const IMessage = require('../interfaces/IMessage');
const CommandManager = require('../managers/CommandManager');
const MessageResponseManager = require('../managers/MessageResponseManager');
const LLMInterface = require('../interfaces/LLMInterface');
const constants = require('../config/constants');
const logger = require('../utils/logger');
const { sendResponse, sendFollowUp } = require('../utils/messageSendingUtils');
const { prepareMessageBody, summarizeMessage, processCommand  } = require('../utils/messageProcessingUtils');

async function messageHandler(originalMsg, historyMessages = []) {
    const startTime = Date.now();
    logger.debug(`[messageHandler] Started processing message ID: ${originalMsg.getMessageId()} at ${new Date(startTime).toISOString()}`);

    if (!validateMessage(originalMsg)) {
        return;
    }

    if (await processCommand(originalMsg)) {
        return;
    }

    await processAIResponse(originalMsg, historyMessages, startTime);
}

function validateMessage(message) {
    if (!(message instanceof IMessage)) {
        logger.error('[messageHandler] Invalid message object type.');
        return false;
    }
    if (!message.getText().trim()) {
        logger.info("[messageHandler] Received empty message.");
        return false;
    }
    return true;
}

async function processAIResponse(message, historyMessages, startTime) {
    if (!MessageResponseManager.getInstance().shouldReplyToMessage(message)) {
        logger.info("[messageHandler] No AI response deemed necessary based on the content and context.");
        return;
    }

    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info("[messageHandler] LLM Manager busy.");
        return;
    }

    try {
        const topic = message.getChannelTopic();
        const userMentions = message.getUserMentions();
        const channelUsers = message.getChannelUsers();

        let requestBody;
        try {
            requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, message.getChannelId(), historyMessages, topic, userMentions, channelUsers);
            logger.debug(`[messageHandler] LLM request body prepared, contents: ${JSON.stringify(requestBody)}`);
        } catch (error) {
            logger.error(`[messageHandler] Error preparing LLM request body: ${error.message}`, { error });
            return;
        }

        let llmResponse;
        try {
            llmResponse = await llmManager.sendRequest(requestBody);
        } catch (error) {
            logger.error(`[messageHandler] Error sending LLM request: ${error.message}`, { error });
            return;
        }

        let responseContent;
        try {
            responseContent = llmResponse.getContent();
            logger.debug(`[messageHandler] LLM response received, contents: ${responseContent}`);

            if (typeof responseContent !== 'string') {
                throw new Error(`Expected string from LLM response, received type: ${typeof responseContent}`);
            }

            // Use the getFinishReason method to check for error finish reasons
            const finishReason = llmResponse.getFinishReason();
            if (finishReason !== 'stop') {
                throw new Error(`LLM response finished with reason: ${finishReason}`);
            }

            if (!responseContent.trim()) {
                throw new Error("LLM provided an empty or invalid response.");
            }

            if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
                responseContent = await summarizeMessage(responseContent);
                logger.info("[messageHandler] LLM response exceeded maximum length and was summarized.");
            }
        } catch (error) {
            logger.error(`[messageHandler] Error processing LLM response content: ${error.message}`, { error });
            return;
        }

        try {
            await sendResponse(responseContent, message.getChannelId(), startTime);
            logger.info("[messageHandler] LLM response sent to the channel successfully.");
        } catch (error) {
            logger.error(`[messageHandler] Error sending response to channel: ${error.message}`, { error });
            return;
        }

        if (constants.FOLLOW_UP_ENABLED) {
            try {
                await sendFollowUp(message, topic || "General Discussion");
                logger.debug("[messageHandler] Follow-up interaction initiated.");
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
