const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants');

async function messageHandler(originalMessage) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();

    logger.info(`Handling message at ${new Date(startTime).toISOString()}`);

    try {
        // // Ensure originalMessage has necessary methods
        // if (typeof originalMessage.mentionsUser !== 'function' || 
        //     typeof originalMessage.isReplyToBot !== 'function') {
        //     logger.error("originalMessage does not have expected methods.");
        //     return;
        // }

        if (openAiManager.getIsResponding()) {
            logger.info("Currently processing another request...")

            if (!originalMessage.isDirectionMention() && !originalMessage.isReplyToBot()) {
                logger.info("... Skipping message.");
                return;
            }

            logger.info("... considering response due to being a direct/reply message.");
            return;

        }

        const shouldReply = messageResponseManager.shouldReplyToMessage(originalMessage).shouldReply;
        if (!shouldReply) {
            logger.info("Chose not to respond to this message.");
            return;
        }

        logger.debug("Preparing request body for OpenAI API.");
        const requestBody = await prepareRequestBody(originalMessage);
        if (!requestBody || !requestBody.messages || requestBody.messages.length === 0) {
            logger.error('Request body is empty or invalid.');
            return;
        }

        openAiManager.setIsResponding(true); // Mark as responding

        logger.debug(`Sending request to OpenAI: ${JSON.stringify(requestBody)}`);
        const responseContent = await openAiManager.sendRequest(requestBody);

        if (!responseContent || responseContent.length === 0) {
            logger.error("Received empty or invalid response from OpenAI.");
            return;
        }

        let messageToSend = responseContent[0];
        logger.debug(`Response from OpenAI: ${messageToSend}`);

        if (messageToSend.length > 1000) {
            logger.info("Message exceeds 1000 characters. Summarizing.");
            messageToSend = await summarizeMessage(messageToSend);
        }

        await sendResponse(messageToSend, originalMessage.getChannelId(), startTime);

        if (constants.FOLLOW_UP_ENABLED) {
            logger.info("Follow-up enabled. Processing follow-up message.");
            const channelTopic = await DiscordManager.getInstance().getChannelTopic(originalMessage.getChannelId());
            await sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic);
        }
    } catch (error) {
        logger.error(`Failed to process message: ${error}`);
    } finally {
        openAiManager.setIsResponding(false); // Reset responding status
        logger.info(`Processing complete. Elapsed time: ${Date.now() - startTime}ms`);
    }
}

async function summarizeMessage(message) {
    const openAiManager = OpenAiManager.getInstance();

    logger.debug(`Starting summarization process for message of length ${message.length}.`);

    try {
        const summaryResponse = await openAiManager.summarizeText(message);
        logger.debug(`Summarization response: ${JSON.stringify(summaryResponse)}`);

        if (summaryResponse && summaryResponse.length > 0) {
            logger.debug(`Successfully summarized message. Summary: ${summaryResponse[0]}`);
            return summaryResponse[0].trim();
        } else {
            logger.warn('Summarization response was empty or undefined.');
            return 'Failed to summarize the message due to an empty response.';
        }
    } catch (error) {
        logger.error(`Summarization process failed with error: ${error}`);
        return 'Failed to summarize the message due to an error.';
    }
}

async function sendResponse(messageContent, channelId, startTime) {
    // Function to handle message splitting and sending with appropriate delays
    async function sendMessagePart(part, delayStartTime) {
        const processingTime = Date.now() - delayStartTime;
        const delay = Math.max((part.length / 3.33) * 1000 - processingTime, 500 - processingTime, 0);
        logger.debug(`Preparing to send message part with delay of ${delay}ms: "${part}"`);
        await new Promise(resolve => setTimeout(resolve, delay));
        logger.debug(`Sending message part: "${part}" to channel ID: ${channelId} after delay.`);
        try {
            await DiscordManager.getInstance().sendResponse(channelId, part);
            logger.info(`Message part sent successfully with delay ${delay}ms: "${part}"`);
        } catch (error) {
            logger.error(`Failed to send message part: "${part}" to channel ID: ${channelId}. Error: ${error}`);
        }
    }

    // Optionally split message and send parts recursively
    const splitChance = 0.5;
    if (Math.random() < splitChance) {
        logger.debug(`Splitting message: ${messageContent}`);
        const splitIndex = Math.max(messageContent.indexOf('. ') + 1, messageContent.indexOf('\n') + 1);
        if (splitIndex > 0) {
            const firstPart = messageContent.substring(0, splitIndex);
            logger.debug(`First part identified for split message: "${firstPart}"`);
            await sendMessagePart(firstPart, startTime);
            const remainingMessage = messageContent.substring(splitIndex).trim();
            if (remainingMessage) {
                logger.debug(`Sending remaining part of split message: "${remainingMessage}"`);
                await sendResponse(remainingMessage, channelId, Date.now());
            }
        } else {
            logger.debug(`Split index not found. Sending message as is: "${messageContent}"`);
            await sendMessagePart(messageContent, startTime);
        }
    } else {
        logger.debug(`Sending message without splitting: "${messageContent}"`);
        await sendMessagePart(messageContent, startTime);
    }
}

async function prepareRequestBody(originalMessage) {
    const channel = await DiscordManager.getInstance().client.channels.fetch(originalMessage.getChannelId());
    const channelTopic = channel.topic || 'No topic set';
    const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
    const systemMessageContent = `${constants.LLM_SYSTEM_PROMPT} USER: <@${originalMessage.getAuthorId()}>, ASSISTANT: <@${constants.CLIENT_ID}>, Channel Topic: ${channelTopic}`;
    return new OpenAiManager().buildRequestBody(history, systemMessageContent);
}

async function sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic) {
    try {
        logger.debug(`Preparing follow-up request body. Channel Topic: ${channelTopic}`);
        const requestBody = await prepareFollowUpRequestBody(originalMessage, channelTopic);
        logger.debug(`Follow-up request body prepared: ${JSON.stringify(requestBody)}`);

        const suggestedCommandResponse = await new OpenAiManager().sendRequest(requestBody);
        logger.debug(`Received follow-up response: ${JSON.stringify(suggestedCommandResponse)}`);

        if (!suggestedCommandResponse || suggestedCommandResponse.length === 0) {
            logger.error('Follow-up response is empty or invalid.');
            return;
        }

        await sendResponse(suggestedCommandResponse[0].trim(), originalMessage.getChannelId(), Date.now());
    } catch (error) {
        logger.error(`Failed to send LLM generated follow-up response: ${error}`);
        if (error instanceof Error) {
            logger.debug(`Error stack: ${error.stack}`);
        }
    }
}

async function prepareFollowUpRequestBody(originalMessage, channelTopic) {
    try {
        const commands = require('../commands/inline'); // Load commands dynamically
        logger.debug('Commands loaded for follow-up.');

        const commandDescriptions = Object.values(commands).map(cmd => `${cmd.name}: ${cmd.description}`).join('; ');
        logger.debug(`Command descriptions compiled: ${commandDescriptions}`);

        const prompt = `Channel topic "${channelTopic}" with commands: ${commandDescriptions}, suggest a follow-up action.`;
        return { prompt, max_tokens: 420 };
    } catch (error) {
        logger.error(`Error preparing follow-up request body: ${error}`);
        if (error instanceof Error) {
            logger.debug(`Error stack: ${error.stack}`);
        }
        return {}; // Return an empty object to prevent further processing
    }
}

module.exports = { messageHandler };
