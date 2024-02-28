// Import necessary modules and managers
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants');

async function messageHandler(originalMessage) {
    const startTime = Date.now();
    logger.info(`Handling message at ${new Date(startTime).toISOString()}`);

    const openAiManager = new OpenAiManager();
    if (openAiManager.getIsResponding() && !originalMessage.isDirectMessage() && !originalMessage.isReplyToBot()) {
        logger.info("Currently busy. Skipping non-direct/non-reply message.");
        return;
    }

    try {
        const shouldReply = messageResponseManager.shouldReplyToMessage(originalMessage).shouldReply;
        if (!shouldReply) {
            logger.info("Chose not to respond to this message.");
            return;
        }

        const requestBody = await prepareRequestBody(originalMessage);
        if (!requestBody.messages || requestBody.messages.length === 0) {
            logger.error('Request body is empty or invalid.');
            return;
        }

        const responseContent = await openAiManager.sendRequest(requestBody);
        let messageToSend = responseContent.choices[0].message.content;

        if (messageToSend.length > 1000) {
            logger.info("Message exceeds 1000 characters. Summarizing.");
            messageToSend = await summarizeMessage(messageToSend);
        }

        await sendResponse(messageToSend, originalMessage.getChannelId(), startTime);

        if (constants.FOLLOW_UP_ENABLED) {
            logger.info("Follow-up enabled. Processing follow-up message.");
            const channelTopic = "Determine dynamically"; // Placeholder for actual logic to determine channel topic
            await sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic);
        }
    } catch (error) {
        logger.error(`Failed to process message: ${error}`);
    } finally {
        logger.info(`Processing complete. Elapsed time: ${Date.now() - startTime}ms`);
    }
}

async function summarizeMessage(message) {
    const requestBody = {
        prompt: `Summarize the following message:\n\n${message}`,
        max_tokens: 123,
        temperature: 0.7,
    };
    const summaryResponse = await new OpenAiManager().sendRequest(requestBody);
    return summaryResponse.choices[0].text.trim();
}

async function sendResponse(messageContent, channelId, startTime) {
    // Function to handle message splitting and sending with appropriate delays
    async function sendMessagePart(part, delayStartTime) {
        const processingTime = Date.now() - delayStartTime;
        const delay = Math.max((part.length / 3.33) * 1000 - processingTime, 5000 - processingTime, 0);
        await new Promise(resolve => setTimeout(resolve, delay));
        await DiscordManager.getInstance().sendResponse(channelId, part);
        logger.info(`Message part sent with delay ${delay}ms: "${part}"`);
    }

    // Optionally split message and send parts recursively
    const splitChance = 0.5;
    if (Math.random() < splitChance) {
        const splitIndex = Math.max(messageContent.indexOf('. ') + 1, messageContent.indexOf('\n') + 1);
        if (splitIndex > 0) {
            const firstPart = messageContent.substring(0, splitIndex);
            await sendMessagePart(firstPart, startTime);
            const remainingMessage = messageContent.substring(splitIndex).trim();
            if (remainingMessage) {
                await sendResponse(remainingMessage, channelId, Date.now());
            }
        } else {
            await sendMessagePart(messageContent, startTime);
        }
    } else {
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
    const requestBody = await prepareFollowUpRequestBody(originalMessage, channelTopic);
    const suggestedCommandResponse = await new OpenAiManager().sendRequest(requestBody);
    await sendResponse(suggestedCommandResponse.choices[0].text.trim(), originalMessage.getChannelId(), Date.now());
}

async function prepareFollowUpRequestBody(originalMessage, channelTopic) {
    const commands = require('../commands/inline'); // Load commands dynamically
    const commandDescriptions = Object.values(commands).map(cmd => `${cmd.name}: ${cmd.description}`).join('; ');
    const prompt = `Channel topic "${channelTopic}" with commands: ${commandDescriptions}, suggest a follow-up action.`;
    return { prompt, max_tokens: 420 };
}

module.exports = { messageHandler };
