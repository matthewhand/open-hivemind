// Import necessary modules and managers
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants'); // Ensure this constant module exists and is correctly structured

// State variables to manage response status and timing
let isResponding = false;
let lastResponseTime = null;

// Main handler for processing incoming messages
async function messageHandler(originalMessage) {
    // Calculate the time since the last response
    const timeSinceLastResponse = Date.now() - lastResponseTime;
    // Check if the bot is currently responding or if a timeout has occurred
    if (isResponding && timeSinceLastResponse < 120000) {
        logger.debug("Skipping new messages until the current one is processed.");
        return;
    } else if (timeSinceLastResponse >= 120000) {
        // Reset response status after timeout
        isResponding = false;
        logger.warn("Resetting isResponding due to timeout.");
    }

    // Mark the bot as responding to a new message
    isResponding = true;
    lastResponseTime = Date.now();

    try {
        // Determine if the message warrants a reply
        if (!messageResponseManager.shouldReplyToMessage(originalMessage).shouldReply) {
            logger.debug("Chose not to respond.");
            return;
        }

        // Prepare the request body for OpenAI based on the original message
        const {channelTopic, requestBody} = await prepareRequestBody(originalMessage);
        // Send the request to OpenAI and wait for the response
        const responseContent = await new OpenAiManager().sendRequest(requestBody);
        const channelId = originalMessage.getChannelId();
        let messageToSend = responseContent.choices[0].message.content;

        // Send the response to the appropriate channel
        await sendResponse(messageToSend, channelId);

        // Optionally, send a follow-up message based on the original interaction
        if (constants.FOLLOW_UP_ENABLED) {
            await sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic);
        }
    } catch (error) {
        logger.error(`Failed to process message: ${error}`, { errorDetail: error });
    } finally {
        // Reset the response status and timestamp after processing
        logger.debug("Resetting isResponding to false");
        isResponding = false;
        lastResponseTime = null;
    }
}

// Prepares the request body for the OpenAI API call
async function prepareRequestBody(originalMessage) {
    // Fetch recent messages for context and the channel's topic
    const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
    const channel = await DiscordManager.getInstance().client.channels.fetch(originalMessage.getChannelId());
    const channelTopic = channel.topic || 'No topic set';

    // Include IDs for priority and context in the prompt
    const userId = originalMessage.getAuthorId();
    const botUserId = constants.CLIENT_ID;
    const promptSystem = `Prioritise User ID: ${userId}, Bot User ID (your ID): ${botUserId}, Channel Topic: ${channelTopic}`;
    const systemMessageContent = constants.LLM_SYSTEM_PROMPT + promptSystem;

    // Build the request body with historical messages and the system prompt
    const requestBody = new OpenAiManager().buildRequestBody(history, systemMessageContent);
    return {channelTopic, requestBody};
}

// Sends the generated response back to the Discord channel
async function sendResponse(messageContent, channelId) {
    try {
        await DiscordManager.getInstance().sendResponse(channelId, messageContent);
        logger.info(`Response sent to channel ${channelId}: "${messageContent}"`);
    } catch (error) {
        logger.error(`Failed to send response: ${error.message}`);
        // Send a fallback error message to the channel
        await DiscordManager.getInstance().sendResponse(channelId, "Sorry, I encountered an error processing your request.");
    }
}

// Generates and sends a follow-up message after the initial response
async function sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic) {
    // Delay the follow-up message by a random interval
    const followUpDelay = Math.random() * (constants.FOLLOW_UP_MAX_DELAY - constants.FOLLOW_UP_MIN_DELAY) + constants.FOLLOW_UP_MIN_DELAY;
    await new Promise(resolve => setTimeout(resolve, followUpDelay));

    // Prepare and send the request for follow-up suggestions
    const commandSuggestionsPrompt = await prepareFollowUpRequestBody(originalMessage, channelTopic);
    const suggestedCommandResponse = await new OpenAiManager().sendRequest(commandSuggestionsPrompt);
    const followUpMessageContent = suggestedCommandResponse.choices[0].text.trim();

    // Send the suggested follow-up action as a message
    await sendResponse(followUpMessageContent, originalMessage.getChannelId());
    logger.info(`LLM-generated follow-up message sent: "${followUpMessageContent}"`);
}

// Prepares the body for the follow-up request based on channel topic and commands
async function prepareFollowUpRequestBody(originalMessage, channelTopic) {
    // Load available commands and their descriptions
    const commands = require('../commands/inline'); // Ensure this commands module exists and is correctly structured
    const commandDescriptions = Object.values(commands).map(cmd => `Command: ${cmd.name}, Description: ${cmd.description}`).join('; ');

    // Build the prompt for follow-up action suggestions
    const prompt = `Given the channel topic "${channelTopic}" and the following available commands: ${commandDescriptions}, suggest a follow-up action for the user to engage with.`;
    const requestBody = {
        prompt: prompt,
        max_tokens: 420,
    };

    return requestBody;
}

// Export the message handler to be used elsewhere in the bot
module.exports = { messageHandler };
