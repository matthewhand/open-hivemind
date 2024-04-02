const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants');

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
    logger.debug(`Starting summarization process for message of length ${message.length}.`);
    try {
        const summaryResponse = await openAiManager.summarizeText(message);
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

const commands = require('../commands/inline'); // Assuming this is the path to your commands

async function handleFollowUp(originalMessage) {
    const openAiManager = OpenAiManager.getInstance();
    logger.debug(`Handling follow-up for message ID: ${originalMessage.id}`);

    // Fetching channel topic or using a default one if not available
    const channelTopic = await fetchChannelTopic(originalMessage.getChannelId()) || "General conversation";

    // Delay the follow-up message to simulate a more natural interaction
    const followUpDelay = 5 * 60 * 1000; // 5 minutes delay, adjust as necessary
    setTimeout(async () => {
        try {
            // Dynamically load command descriptions and compile them into a prompt
            logger.debug('Commands loaded for follow-up.');
            const commandDescriptions = Object.values(commands).map(cmd => `${cmd.name}: ${cmd.description}`).join('; ');
            logger.debug(`Command descriptions compiled: ${commandDescriptions}`);

            const prompt = `Channel topic "${channelTopic}" with commands: ${commandDescriptions}. Suggest a follow-up action.`;
            
            // Building the request body for the follow-up action using the compiled prompt
            const requestBody = {
                model: constants.LLM_MODEL,
                prompt: prompt,
                max_tokens: 420,
                stop: ["\n", " END"],
            };

            // Sending the request to OpenAI and handling the response
            const responseContent = await openAiManager.sendRequest(requestBody);
            if (!responseContent || responseContent.length === 0) {
                logger.error("Received empty or invalid response from OpenAI for follow-up.");
                return;
            }

            // Sending the follow-up response back to the user
            const followUpMessage = responseContent[0].trim();
            if (followUpMessage) {
                await sendResponse(followUpMessage, originalMessage.getChannelId(), Date.now());
            } else {
                logger.warn(`No follow-up action suggested for message ID: ${originalMessage.id}`);
            }
        } catch (error) {
            logger.error(`Error during follow-up handling: ${error}`);
        }
    }, followUpDelay);
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
