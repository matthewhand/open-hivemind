// Import necessary modules and managers
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants'); // Ensure this constant module exists and is correctly structured

async function messageHandler(originalMessage) {
    const startTime = Date.now();

    const openAiManager = new OpenAiManager(); // Correctly instantiate OpenAiManager
    
    if (openAiManager.getIsResponding() && !originalMessage.isDirectMessage() && !originalMessage.isReplyToBot()) {
        console.log("Currently processing another message. Skipping until free, unless direct/reply.");
        return;
    }

    try {
        if (!messageResponseManager.shouldReplyToMessage(originalMessage).shouldReply) {
            console.log("Chose not to respond.");
            return;
        }

        const requestBody = prepareRequestBody(originalMessage);

        // Use the new sendRequestWithStateManagement method
        const responseContent = await openAiManager.sendRequestWithStateManagement(requestBody);
        const channelId = originalMessage.getChannelId();
        let messageToSend = responseContent.choices[0].message.content;

        if (messageToSend.length > 1000) {
            console.log("Message is over 1000 characters. Summarizing.");
            messageToSend = await summarizeMessage(messageToSend);
        }

        await sendResponse(messageToSend, channelId, startTime);

        if (constants.FOLLOW_UP_ENABLED) {
            await sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic);
        }
    } catch (error) {
        console.error(`Failed to process message: ${error}`);
    }
}

// Function to summarize long messages
async function summarizeMessage(message) {
    const summaryPrompt = `Summarize the following message:\n\n${message}`;
    const requestBody = {
        prompt: summaryPrompt,
        max_tokens: 123, // Adjust based on desired summary length
        temperature: 0.7,
    };
    const summaryResponse = await new OpenAiManager().sendRequest(requestBody);
    return summaryResponse.choices[0].text.trim();
}

// Adjusted sendResponse function to include dynamic delay calculations based on processing time
async function sendResponse(messageContent, channelId, startTime) {
    const baseDelayPerChars = 500; // Base delay of 500ms per 30 characters in the message
    const characterCount = messageContent.length;
    const baseDelay = Math.ceil(characterCount / 10) * baseDelayPerChars; // Calculate base delay based on message length
    
    const processingTime = Date.now() - startTime; // Calculate how long processing has taken so far
    let totalDelay = baseDelay - processingTime; // Adjust base delay by subtracting processing time

    const additionalRandomDelay = Math.floor(Math.random() * 10000); // Random delay between 0 and 10s
    totalDelay += additionalRandomDelay; // Add random delay to the total delay

    // Ensure total delay is not negative
    if (totalDelay < 0) {
        totalDelay = 0;
    }

    try {
        // Apply the calculated delay before sending the message
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        await DiscordManager.getInstance().sendResponse(channelId, messageContent);
        logger.info(`Response sent to channel ${channelId} after dynamic delay: ${totalDelay}ms, "${messageContent}"`);
    } catch (error) {
        logger.error(`Failed to send response: ${error.message}`);
        // Send a fallback error message to the channel
        await DiscordManager.getInstance().sendResponse(channelId, "Sorry, I encountered an error processing your request.");
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
    const promptSystem = `Active User: ${userId}, CLIENT_ID: ${botUserId}, Channel Topic: ${channelTopic}`;
    const systemMessageContent = constants.LLM_SYSTEM_PROMPT + promptSystem;

    // Build the request body with historical messages and the system prompt
    const requestBody = new OpenAiManager().buildRequestBody(history, systemMessageContent);
    return requestBody;
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
