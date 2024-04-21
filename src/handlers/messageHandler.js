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

        const requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, message.getChannelId(), historyMessages, topic, userMentions, channelUsers);
        logger.debug(`[messageHandler] LLM request body prepared, contents: ${JSON.stringify(requestBody)}`);

        const llmResponse = await llmManager.sendRequest(requestBody);
        let responseContent = llmResponse.getContent();
        if (responseContent && typeof responseContent === 'string' && responseContent.includes('error')) {
            logger.error("[messageHandler] Error found in LLM response.");
            return;
        }
        
        logger.debug(`[messageHandler] LLM response received, contents: ${responseContent}`);

        if (typeof responseContent !== 'string') {
            logger.error("[messageHandler] Expected string from LLM response, received type: " + typeof responseContent);
            responseContent = "";  // Sets content to empty if not a string to avoid further errors
        }

        if (responseContent && responseContent.includes && responseContent.includes('error')) {
            logger.error("[messageHandler] Error keyword found in LLM response.");
            return;  // Early exit if the response contains 'error'
        }

        if (!responseContent.trim()) {
            logger.error("[messageHandler] LLM provided an empty or invalid response.");
            return;  // Exits if no valid content is returned
        }

        if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
            responseContent = await summarizeMessage(responseContent);
            logger.info("[messageHandler] LLM response exceeded maximum length and was summarized.");
        }

        await sendResponse(responseContent, message.getChannelId(), startTime);
        logger.info("[messageHandler] LLM response sent to the channel successfully.");

        if (constants.FOLLOW_UP_ENABLED) {
            await sendFollowUp(message, topic || "General Discussion");
            logger.debug("[messageHandler] Follow-up interaction initiated.");
        }
    } catch (error) {
        logger.error(`[messageHandler] Error processing LLM response: ${error.message}`, { originalMsg: message, error });
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info(`[messageHandler] Message processing completed in ${processingTime}ms.`);
    }
}

module.exports = { messageHandler };
