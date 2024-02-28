// Import necessary modules and managers
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager');
const constants = require('../config/constants'); // Ensure this constant module exists and is correctly structured

async function messageHandler(originalMessage) {
    const startTime = Date.now();
    console.log(`messageHandler: Handling message at ${new Date(startTime).toISOString()}`);

    const openAiManager = new OpenAiManager();

    if (openAiManager.getIsResponding() && !originalMessage.isDirectMessage() && !originalMessage.isReplyToBot()) {
        console.log("messageHandler: Currently processing another message. Skipping until free, unless direct/reply.");
        return;
    }

    try {
        if (!messageResponseManager.shouldReplyToMessage(originalMessage).shouldReply) {
            console.log("messageHandler: Chose not to respond to this message.");
            return;
        }

        console.log("messageHandler: Preparing request body.");
        const requestBody = await prepareRequestBody(originalMessage); 

        // Before calling this.sendRequest(requestBody) in your code where you prepare the request
        if (!requestBody.messages || requestBody.messages.length === 0) {
            logger.error('messageHandler: Request body is empty or invalid.');
            return; // Skip sending request
        } else {
            logger.debug(`messageHandler: Request body is - ${JSON.stringify(requestBody.messages, null, 2)}`);
        }

        console.log("messageHandler: Sending request to OpenAI.");
        const responseContent = await openAiManager.sendRequest(requestBody);
        const channelId = originalMessage.getChannelId();
        const channelTopic = "TODO - channel topic. ";
        let messageToSend = responseContent.choices[0].message.content;

        console.log(`messageHandler: Received response from OpenAI. Message length: ${messageToSend.length}`);
        if (messageToSend.length > 1000) {
            console.log("messageHandler: Message is over 1000 characters. Summarizing.");
            messageToSend = await summarizeMessage(messageToSend); // Assuming summarizeMessage is an async function
        }

        console.log("messageHandler: Sending response message.");
        await sendResponse(messageToSend, channelId, startTime);

        if (constants.FOLLOW_UP_ENABLED) {
            console.log("messageHandler: Follow-up enabled. Sending follow-up message.");
            await sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic);
        }
    } catch (error) {
        console.error(`messageHandler: Failed to process message: ${error}`);
    } finally {
        console.log(`messageHandler: Processing complete. Elapsed time: ${Date.now() - startTime}ms`);
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

    logger.debug(`summarizeMessage: message - ${JSON.stringify(message, null, 2)}`);

    // Before calling this.sendRequest(requestBody) in your code where you prepare the request
    if (!requestBody.messages || requestBody.messages.length === 0) {
        logger.error('summarizeMessage: Request body is empty or invalid.');
        return; // Skip sending request
    } else {
        logger.debug(`summarizeMessage: Request body is - ${JSON.stringify(requestBody.messages, null, 2)}`);
    }

    const summaryResponse = await new OpenAiManager().sendRequest(requestBody);
    return summaryResponse.choices[0].text.trim();
}

// Adjusted sendResponse function to emulate average human typing speed, split messages, and introduce a minimum delay
async function sendResponse(messageContent, channelId, startTime) {
    const charsPerSecond = 3.33; // Average typing speed (200 characters per minute / 60)
    const baseDelayPerChar = 1000 / charsPerSecond; // Delay per character in milliseconds
    const minDelayForShortMessage = 5000; // Minimum delay for a short message in milliseconds

    // Function to send message parts with delay
    async function sendMessagePart(part) {
        const characterCount = part.length;
        let totalDelay = characterCount * baseDelayPerChar; // Calculate total delay based on typing speed

        // Apply minimum delay for short messages
        totalDelay = Math.max(totalDelay, minDelayForShortMessage);

        // Ensure total delay accounts for processing time
        totalDelay = Math.max(totalDelay - processingTime, 0);

        // Apply the calculated delay before sending the message part
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        await DiscordManager.getInstance().sendResponse(channelId, part);
        logger.info(`Response part sent to channel ${channelId} after delay: ${totalDelay}ms, "${part}"`);
    }

    try {
        // Split the message at the end of the next full-stop or newline with a 50/50 chance
        let splitIndex = -1;
        if (Math.random() < 0.5) {
            const nextFullStop = messageContent.indexOf('. ', processingTime);
            const nextNewLine = messageContent.indexOf('\n', processingTime);
            splitIndex = nextFullStop !== -1 ? nextFullStop + 1 : nextNewLine;
        }

        if (splitIndex !== -1) {
            // Send the first part of the message
            const firstPart = messageContent.substring(0, splitIndex + 1);
            await sendMessagePart(firstPart);

            // Send the remainder of the message recursively
            const remainingMessage = messageContent.substring(splitIndex + 1);
            if (remainingMessage.trim().length > 0) {
                await sendResponse(remainingMessage, channelId, Date.now());
            }
        } else {
            // Send the entire message if no split is required
            await sendMessagePart(messageContent);
        }
    } catch (error) {
        logger.error(`Failed to send response: ${error.message}`);
        // Send a fallback error message to the channel
        await DiscordManager.getInstance().sendResponse(channelId, "Sorry, I encountered an error processing your request.");
    }
}
async function prepareRequestBody(originalMessage) {
    console.log("prepareRequestBody: Start");

    // Fetch recent messages for context and the channel's topic
    console.log("prepareRequestBody: Fetching message history and channel details.");
    // TODO use generic manager not specific Discord
    
    const channel = await DiscordManager.getInstance().client.channels.fetch(originalMessage.getChannelId());
    console.log(`prepareRequestBody: Fetched channel details. Channel ID: ${originalMessage.getChannelId()}`);
    
    const channelTopic = channel.topic || 'No topic set';
    console.log(`prepareRequestBody: Channel Topic: ${channelTopic}`);

    const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
    console.log(`prepareRequestBody: Fetched ${history.length} messages for context.`);

    // Include IDs for priority and context in the prompt
    const userId = originalMessage.getAuthorId();
    const botUserId = constants.CLIENT_ID;
    console.log(`prepareRequestBody: User ID: ${userId}, Bot User ID: ${botUserId}`);

    const promptSystem = `USER: <!${userId}>, ASSISTANT: <!${botUserId}>, Channel Topic: ${channelTopic}`;
    console.log(`prepareRequestBody: Prompt System: ${promptSystem}`);

    const systemMessageContent = constants.LLM_SYSTEM_PROMPT + promptSystem;
    console.log(`prepareRequestBody: System Message Content: ${systemMessageContent.substring(0, 50)}...`); // Truncate to avoid excessive logging

    // Build the request body with historical messages and the system prompt
    console.log("prepareRequestBody: Building request body.");
    const requestBody = new OpenAiManager().buildRequestBody(history, systemMessageContent);
    console.log("prepareRequestBody: Request body prepared.");

    return requestBody;
}

// Generates and sends a follow-up message after the initial response
async function sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic) {
    // Delay the follow-up message by a random interval
    const followUpDelay = Math.random() * (constants.FOLLOW_UP_MAX_DELAY - constants.FOLLOW_UP_MIN_DELAY) + constants.FOLLOW_UP_MIN_DELAY;
    await new Promise(resolve => setTimeout(resolve, followUpDelay));

    // Prepare and send the request for follow-up suggestions
    const requestBody = await prepareFollowUpRequestBody(originalMessage, channelTopic);

    // Before calling this.sendRequest(requestBody) in your code where you prepare the request
    if (!requestBody.messages || requestBody.messages.length === 0) {
        logger.error('sendLLMGeneratedFollowUpResponse: Request body is empty or invalid.');
        return; // Skip sending request
    } else {
        logger.debug(`sendLLMGeneratedFollowUpRequest: Request body is - ${JSON.stringify(requestBody.messages, null, 2)}`);
    }

    const suggestedCommandResponse = await new OpenAiManager().sendRequest(requestBody);
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
