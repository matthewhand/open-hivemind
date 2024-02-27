const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants'); // Ensure this is correctly imported

let isResponding = false;
let lastResponseTime = null;

async function messageHandler(originalMessage) {
    const timeSinceLastResponse = Date.now() - lastResponseTime;
    if (isResponding && timeSinceLastResponse < 600000) { // 10 minutes timeout
        logger.debug("Skipping new messages until the current one is processed.");
        return;
    } else if (timeSinceLastResponse >= 600000) {
        isResponding = false;
        logger.warn("Resetting isResponding due to timeout.");
    }

    isResponding = true;
    lastResponseTime = Date.now(); // Update time when starting to respond

    try {
        if (!messageResponseManager.shouldReplyToMessage(originalMessage).shouldReply) {
            logger.debug("Chose not to respond.");
            return;
        }

        const {channelTopic, requestBody} = await prepareRequestBody(originalMessage);
        const responseContent = await new OpenAiManager().sendRequest(requestBody);
        const channelId = originalMessage.getChannelId();
        let messageToSend = responseContent.choices[0].message.content;
        await sendResponse(messageToSend, channelId);

        if (constants.FOLLOW_UP_ENABLED) {
            await sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic);
        }
    } catch (error) {
        logger.error(`Failed to process message: ${error}`, { errorDetail: error });
    } finally {
        isResponding = false;
        lastResponseTime = null; // Reset the timestamp after processing
    }
}

async function prepareRequestBody(originalMessage) {
    const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
    const channel = await DiscordManager.getInstance().client.channels.fetch(originalMessage.getChannelId());
    const channelTopic = channel.topic || 'No topic set';
    
    const userId = originalMessage.getAuthorId();
    const botUserId = constants.CLIENT_ID;
    
    const promptSystem = `Prioritise User ID: ${userId}, Bot User ID (your ID): ${botUserId}, Channel Topic: ${channelTopic}`;
    const systemMessageContent = constants.LLM_SYSTEM_PROMPT + promptSystem;
    const requestBody = new OpenAiManager().buildRequestBody(history, systemMessageContent);

    return {channelTopic, requestBody};
}

async function sendResponse(messageContent, channelId) {
    try {
        logger.debug("sendResponse called");

        // Directly use the messageContent, which is now a string
        await DiscordManager.getInstance().sendResponse(channelId, messageContent);
        logger.info(`Response sent to channel ${channelId}: "${messageContent}"`);
    } catch (error) {
        logger.error(`Failed to send response: ${error.message}`);
        await DiscordManager.getInstance().sendResponse(channelId, "Sorry, I encountered an error processing your request.");
    }
}

async function sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic) {
    const followUpDelay = Math.random() * (constants.FOLLOW_UP_MAX_DELAY - constants.FOLLOW_UP_MIN_DELAY) + constants.FOLLOW_UP_MIN_DELAY;
    await new Promise(resolve => setTimeout(resolve, followUpDelay));
    
    const commandSuggestionsPrompt = await prepareFollowUpRequestBody(originalMessage, channelTopic);
    const suggestedCommandResponse = await new OpenAiManager().sendRequest(commandSuggestionsPrompt);
    const followUpMessageContent = suggestedCommandResponse.choices[0].text.trim();

    await sendResponse(followUpMessageContent, originalMessage.getChannelId());
    logger.info(`LLM-generated follow-up message sent: "${followUpMessageContent}"`);
}

async function prepareFollowUpRequestBody(originalMessage, channelTopic) {
    const commands = require('../commands/inline'); 
    const commandDescriptions = Object.values(commands).map(cmd => `Command: ${cmd.name}, Description: ${cmd.description}`).join('; ');
    
    const prompt = `Given the channel topic "${channelTopic}" and the following available commands: ${commandDescriptions}, suggest a follow-up action for the user to engage with.`;
    
    const requestBody = {
        prompt: prompt,
        max_tokens: 420,
    };

    return requestBody;
}

module.exports = { messageHandler };
