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
        logger.warn("Resetting isResponding due to timeout.");
        isResponding = false;
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
        await sendResponse(responseContent, originalMessage.getChannelId());

        if (constants.FOLLOW_UP_ENABLED) {
            await sendFollowUpResponse(originalMessage, channelTopic);
        }
    } catch (error) {
        logger.error(`Failed to process message: ${error}`, { errorDetail: error });
    } finally {
        isResponding = false;
        lastResponseTime = null; // Reset the timestamp after processing
    }
}

async function prepareRequestBody(originalMessage) {
    // TODO move discord logic into discord manager, message and/or util
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

async function sendResponse(responseContent, channelId = constants.CHANNEL_ID) {
    try {
        // Check if the necessary properties exist in the responseContent
        if (!responseContent || !responseContent.choices || responseContent.choices.length === 0 || !responseContent.choices[0].message || !responseContent.choices[0].message.content) {
            // Log the entire responseContent for debugging
            logger.error(`Invalid response structure: ${JSON.stringify(responseContent, null, 2)}`);
            throw new Error('Response content is missing or not in the expected format.');
        }

        // Assuming checks passed, proceed to send the response
        const messageToSend = responseContent.choices[0].message.content;
        await DiscordManager.getInstance().sendResponse(originalMessage.getChannelId(), messageToSend);
        logger.info(`Response sent: "${messageToSend}"`);
    } catch (error) {
        // Log the error for debugging
        logger.error(`Failed to send response: ${error.message}`);
        // Optionally, send a fallback message to the channel indicating an error occurred
        // This part is optional and can be adjusted based on how you want to handle errors
        await DiscordManager.getInstance().sendResponse(channelId, "Sorry, I encountered an error processing your request.");
    }
}

async function sendFollowUpResponse(originalMessage, channelTopic) {
    const followUpDelay = Math.random() * (constants.FOLLOW_UP_MAX_DELAY - constants.FOLLOW_UP_MIN_DELAY) + constants.FOLLOW_UP_MIN_DELAY;
    await new Promise(resolve => setTimeout(resolve, followUpDelay));

    const commandSuggestions = await getCommandSuggestions();
    const followUpMessageContent = `For more interaction, try: ${commandSuggestions}.`;

    await DiscordManager.getInstance().sendResponse(originalMessage.getChannelId(), followUpMessageContent);
    logger.info(`Follow-up message sent: "${followUpMessageContent}"`);
}

async function getCommandSuggestions() {
    const commands = require('../commands/inline');
    const commandDescriptions = Object.values(commands).map(cmd => cmd.description).join('. ');
    const analysisRequestBody = {
        prompt: `Given these commands: ${commandDescriptions}, suggest one for further engagement.`,
        max_tokens: 100,
    };

    const suggestedCommandResponse = await new OpenAiManager().sendRequest(analysisRequestBody);
    return suggestedCommandResponse; // Process this as needed to extract the suggested command
}

module.exports = { messageHandler };
