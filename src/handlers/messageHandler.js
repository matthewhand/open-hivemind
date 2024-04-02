const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants');
const commands = require('../commands/inline'); // Assuming this is the path to your commands

async function messageHandler(originalMessage) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();

    logger.info(`Handling message at ${new Date(startTime).toISOString()}`);

    // Check if we should proceed with processing this message
    if (!await shouldProcessMessage(originalMessage, openAiManager)) {
        return; // Early return if we decide not to process this message
    }

    // Check if the bot should reply to this message
    const shouldReply = messageResponseManager.shouldReplyToMessage(originalMessage).shouldReply;
    if (!shouldReply) {
        logger.info("Chose not to respond to this message.");
        return;
    }

    try {
        // Preparing request for OpenAI
        const requestBody = await prepareRequestBody(originalMessage);
        if (!requestBody || !requestBody.messages || requestBody.messages.length === 0) {
            logger.error('Request body is empty or invalid.');
            return;
        }

        // Marking as responding to prevent processing of new incoming messages
        openAiManager.setIsResponding(true);

        // Sending the request to OpenAI and handling the response
        const responseContent = await openAiManager.sendRequest(requestBody);
        if (!responseContent || responseContent.length === 0) {
            logger.error("Received empty or invalid response from OpenAI.");
            return;
        }

        // Handling message content length for summarization
        let messageToSend = responseContent[0];
        if (messageToSend.length > 1000) {
            logger.info("Message exceeds 1000 characters. Summarizing.");
            messageToSend = await summarizeMessage(messageToSend);
        }

        // Sending the response back to the user
        await sendResponse(messageToSend, originalMessage.getChannelId(), startTime);

        // Handling follow-up messages if enabled
        if (constants.FOLLOW_UP_ENABLED) {
            await handleFollowUp(originalMessage);
        }
    } catch (error) {
        logger.error(`Failed to process message: ${error}`);
    } finally {
        // Resetting the bot's status to ready for new messages
        openAiManager.setIsResponding(false);
        logger.info(`Processing complete. Elapsed time: ${Date.now() - startTime}ms`);
    }
}

async function shouldProcessMessage(originalMessage, openAiManager) {
    // Check if the bot is currently processing another request and decide based on message type
    if (openAiManager.getIsResponding()) {
        logger.info("Currently processing another request...");

        if (!originalMessage.isDirectionMention() && !originalMessage.isReplyToBot()) {
            logger.info("... Skipping message.");
            return false;
        }

        logger.info("... considering response due to being a direct/reply message.");
    }
    return true;
}

async function summarizeMessage(message) {
    const openAiManager = OpenAiManager.getInstance();
    logger.debug(`Starting the summarization process for a message of length ${message.length}.`);

    // You might adjust this system message to fit the summarization context better
    const systemMessageContent = 'Respond as a discord bot, summarising the following:';

    try {
        // Using the modified summarizeText method to include both the user message and system instruction
        const summaryResponse = await openAiManager.summarizeText(message, systemMessageContent);
        
        if (summaryResponse && summaryResponse.length > 0) {
            const summary = summaryResponse[0].trim();
            logger.debug(`Summarization successful. Summary: ${summary.substring(0, 100)}...`); // Log the first 100 chars
            return summary;
        } else {
            logger.warn('Summarization response was empty or undefined.');
            return 'Unable to summarize the message due to an empty response from the summarization process.';
        }
    } catch (error) {
        logger.error(`Summarization process failed with error: ${error}`);
        return 'Failed to summarize the message due to an error in the summarization process.';
    }
}

async function sendResponse(messageContent, channelId, startTime) {
    logger.debug(`Preparing to send response. Channel ID: ${channelId}, Message Content Length: ${messageContent.length}`);

    async function sendMessagePart(part, delayStartTime) {
        const processingTime = Date.now() - delayStartTime;
        // Calculate delay to simulate typing speed and prevent instant response
        const delay = Math.max((part.length / 6.66) * 1000 - processingTime, 250 - processingTime, 0);
        
        logger.debug(`Delaying message part send by ${delay}ms. Message part: "${part.substring(0, 50)}..."`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            await DiscordManager.getInstance().sendResponse(channelId, part);
            logger.info(`Message part sent. Channel ID: ${channelId}, Part Length: ${part.length}`);
        } catch (error) {
            logger.error(`Error sending message part. Channel ID: ${channelId}, Error: ${error}`);
        }
    }

    // Splitting the message if it's too long, or if we decide to chunk it for any reason
    const splitChance = 0.5; // This is arbitrary, adjust as needed
    if (Math.random() < splitChance && messageContent.length > 1900) { // Discord's max message length is 2000 characters
        const parts = messageContent.match(/.{1,1900}(\s|$)/g) || [messageContent]; // Split by space if possible
        for (const part of parts) {
            await sendMessagePart(part, startTime);
        }
    } else {
        await sendMessagePart(messageContent, startTime);
    }
}

async function prepareRequestBody(originalMessage) {
    const openAiManager = OpenAiManager.getInstance();

    const channel = await DiscordManager.getInstance().client.channels.fetch(originalMessage.getChannelId());
    const channelTopic = channel.topic || 'General conversation';
    const historyMessages = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
    
    return openAiManager.buildRequestBody(historyMessages, `Channel Topic: ${channelTopic}`);
}

async function handleFollowUp(originalMessage) {
    const openAiManager = OpenAiManager.getInstance();
    logger.debug(`Preparing follow-up for message ID: ${originalMessage.id}`);

    // Fetch the channel topic or use a default value if not set
    const channelTopic = await fetchChannelTopic(originalMessage.getChannelId()) || "General conversation";

    // Construct a dynamic prompt that incorporates the channel's topic and any relevant context
    const prompt = `Demonstrate how to use one of the following built-in commands: "${Object.values(commands).map(cmd => cmd.name).join(', ')}"...  Related to either the user's message, "${originalMessage.getText}" or channel topic, "${channelTopic}".`;

    try {
        // Generate a follow-up action using OpenAI based on the constructed prompt
        const summaryResponse = await openAiManager.summarizeText(prompt, "Provide a follow-up command suggestion:");
        
        if (summaryResponse && summaryResponse.length > 0) {
            const followUpAction = summaryResponse[0].trim();
            logger.debug(`Follow-up command suggestion generated successfully. Action: ${followUpAction.substring(0, 100)}...`);

            // Send the follow-up action as a response in the channel
            await sendResponse(followUpAction, originalMessage.getChannelId(), Date.now());
        } else {
            logger.warn('Follow-up command suggestion generation resulted in an empty or undefined response.');
        }
    } catch (error) {
        logger.error(`Error during follow-up generation: ${error}`);
    }
}

async function fetchChannelTopic(channelId) {
    try {
        const channel = await DiscordManager.getInstance().client.channels.fetch(channelId);
        return channel.topic || 'No specific topic';
    } catch (error) {
        logger.error(`Failed to fetch channel topic for channel ID: ${channelId}, Error: ${error}`);
        return 'No specific topic';
    }
}

module.exports = { messageHandler };
