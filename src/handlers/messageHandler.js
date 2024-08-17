const IMessage = require("../interfaces/IMessage");
const MessageResponseManager = require("../managers/MessageResponseManager");
const LLMInterface = require("../interfaces/LLMInterface");
const constants = require("../config/constants");
const logger = require("../utils/logger");
const { sendResponse, sendFollowUp } = require("../utils/messageSendingUtils");
const { prepareMessageBody, summarizeMessage, processCommand } = require("../utils/messageProcessingUtils");
// const { encrypt } = require("../utils/encryptionUtils");

/**
 * Handles incoming messages and processes them accordingly.
 *
 * @param {Object} originalMsg - The original message object.
 * @param {Array} historyMessages - An array of previous messages for context.
 */
async function messageHandler(originalMsg, historyMessages = []) {
    if (!originalMsg) {
        logger.error("[messageHandler] No original message provided.");
        return;
    }

    const startTime = Date.now();
    logger.debug("[messageHandler] originalMsg: " + JSON.stringify(originalMsg));

    // Log the presence and type of getMessageId
    if (originalMsg.getMessageId) {
        logger.debug("[messageHandler] originalMsg.getMessageId exists. Type: " + typeof originalMsg.getMessageId);
    } else {
        logger.debug("[messageHandler] originalMsg.getMessageId does not exist or is undefined.");
    }

    try {
        // TODO encryption
        // const messageId = originalMsg.getMessageId ? encrypt(originalMsg.getMessageId()) : "undefined";
        // logger.debug("[messageHandler] Started processing message ID: " + messageId + " at " + new Date(startTime).toISOString());
        const messageId = originalMsg.getMessageId;
        logger.debug("[messageHandler] Started processing message ID: " + messageId + " at " + new Date(startTime).toISOString());
    } catch (error) {
        logger.error("[messageHandler] Error processing message ID: " + error.message);
    }

    // Directly check and log the type of originalMsg
    logger.debug("[messageHandler] Type of originalMsg: " + typeof originalMsg);
    logger.debug("[messageHandler] Constructor of originalMsg: " + originalMsg.constructor.name);

    if (!(originalMsg instanceof IMessage)) {
        logger.error("[messageHandler] originalMsg is not an instance of IMessage. Actual type: " + originalMsg.constructor.name);
        return;
    } else {
        logger.debug("[messageHandler] originalMsg is a valid instance of IMessage.");
    }

    if (!originalMsg.getText || typeof originalMsg.getText !== 'function') {
        logger.error("[messageHandler] originalMsg does not have a valid getText method.");
        return;
    } else {
        logger.debug("[messageHandler] originalMsg has a valid getText method.");
    }

    // Log the message text content
    logger.debug("[messageHandler] originalMsg.getText(): " + originalMsg.getText());

    if (originalMsg.getText && !originalMsg.getText().trim()) {
        logger.info("[messageHandler] Received empty message.");
        return;
    }

    // Skip validateMessage function for now and include direct checks
    if (!validateMessage(originalMsg)) {
        logger.debug("[messageHandler] Message validation failed.");
        return;
    }

    logger.debug("[messageHandler] validated message");

    if (await processCommand(originalMsg)) {
        logger.debug("[messageHandler] processed command");
        return;
    }

    await processAIResponse(originalMsg, historyMessages, startTime);
}

/**
 * Validates the incoming message object.
 *
 * @param {Object} message - The message object to validate.
 * @returns {boolean} - Returns true if the message is valid, false otherwise.
 */
function validateMessage(message) {
    if (!(message instanceof IMessage)) {
        logger.error("[validateMessage] Invalid message object type. Expected IMessage instance, got: " + message.constructor.name);
        return false;
    }

    if (!message.getText || typeof message.getText !== 'function') {
        logger.error("[validateMessage] Message object does not have a valid getText method.");
        return false;
    }

    if (!message.getText().trim()) {
        logger.info("[validateMessage] Received empty message.");
        return false;
    }

    logger.debug("[validateMessage] Message validated successfully.");
    return true;
}

/**
 * Processes the AI response for the given message.
 *
 * @param {Object} message - The message object.
 * @param {Array} historyMessages - An array of previous messages for context.
 * @param {number} startTime - The timestamp when the processing started.
 */
async function processAIResponse(message, historyMessages, startTime) {
    logger.debug("[messageHandler] process ai response");

    if (!MessageResponseManager.getInstance().shouldReplyToMessage(message)) {
        logger.info("[messageHandler] No AI response deemed necessary based on the content and context.");
        return;
    }

    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info("[messageHandler] LLM Manager busy.");
        return;
    }

    logger.debug("[messageHandler] processAiResponse called.");

    try {
        const topic = message.getChannelTopic();
        logger.debug("[messageHandler] channel topic is " + topic + ".");
        // const userMentions = message.getUserMentions().map(user => encrypt(user));
        const userMentions = message.getUserMentions();
        // const channelUsers = message.getChannelUsers().map(user => encrypt(user));
        const channelUsers = message.getChannelUsers();

        let requestBody;
        try {
            requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, message.getChannelId(), historyMessages, topic, userMentions, channelUsers);
            logger.debug("[messageHandler] LLM request body prepared: " + JSON.stringify(requestBody));
        } catch (error) {
            logger.error("[messageHandler] Error preparing LLM request body: " + error.message, { error });
            return;
        }

        let llmResponse;
        try {
            llmResponse = await llmManager.sendRequest(requestBody);
            logger.debug("[messageHandler] LLM request sent successfully.");
        } catch (error) {
            logger.error("[messageHandler] Error sending LLM request: " + error.message, { error });
            return;
        }

        let responseContent;
        try {
            responseContent = llmResponse.getContent();
            logger.debug("[messageHandler] LLM response received. Response Content: " + responseContent);

            if (typeof responseContent !== "string") {
                logger.error("[messageHandler] Invalid response content type: " + typeof responseContent);
                throw new Error("Expected string from LLM response, received type: " + typeof responseContent);
            }

            const finishReason = llmResponse.getFinishReason();
            if (finishReason !== "stop") {
                logger.error("[messageHandler] LLM response finished with reason: " + finishReason);
                throw new Error("LLM response finished with reason: " + finishReason);
            }

            if (!responseContent.trim()) {
                logger.error("[messageHandler] LLM provided an empty or invalid response.");
                throw new Error("LLM provided an empty or invalid response.");
            }

            if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
                responseContent = await summarizeMessage(responseContent);
                logger.info("[messageHandler] LLM response exceeded maximum length and was summarized.");
            }
        } catch (error) {
            logger.error("[messageHandler] Error processing LLM response content: " + error.message, { error });
            return;
        }

        logger.debug("[messageHandler] Preparing to send response. Response Content: " + responseContent);

        if (typeof responseContent !== "string" && !Buffer.isBuffer(responseContent)) {
            logger.error("[messageHandler] responseContent is not string or is not Buffer");
            throw new Error("Invalid responseContent type: " + typeof responseContent);
        }

        try {
            await sendResponse(responseContent, message.getChannelId(), startTime);
            logger.info("[messageHandler] LLM response sent to the channel successfully.");
        } catch (error) {
            logger.error("[messageHandler] Error sending response to channel: " + error.message, { error });
            return;
        }

        if (constants.FOLLOW_UP_ENABLED) {
            try {
                await sendFollowUp(message, topic || "General Discussion");
                logger.debug("[messageHandler] Follow-up interaction initiated.");
            } catch (error) {
                logger.error("[messageHandler] Error initiating follow-up interaction: " + error.message, { error });
            }
        }
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info("[messageHandler] Message processing completed in " + processingTime + "ms.");
    }
}

module.exports = { messageHandler };
