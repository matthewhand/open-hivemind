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
        const channelId = originalMessage.getChannelId();
        await sendResponse(responseContent, channelId);

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
        logger.debug("sendResponse called");

        let messageToSend = "";

        // Handle response structure with 'choices'
        if (responseContent.choices && responseContent.choices.length > 0 && responseContent.choices[0].message && responseContent.choices[0].message.content) {
            messageToSend = responseContent.choices[0].message.content;
        } 
        // Handle simpler response structure without 'choices' (cloudflare response payload)
        else if (responseContent.response && responseContent.response.text) {
            messageToSend = responseContent.response.text;
        } else {
            logger.error(`Invalid response structure: ${JSON.stringify(responseContent, null, 2)}`);
            throw new Error('Response content is missing or not in the expected format.');
        }

        await DiscordManager.getInstance().sendResponse(channelId, messageToSend);
        logger.info(`Response sent to channel ${channelId}: "${messageToSend}"`);
    } catch (error) {
        logger.error(`Failed to send response: ${error.message}`);
        await DiscordManager.getInstance().sendResponse(channelId, "Sorry, I encountered an error processing your request.");
    }
}

async function sendLLMGeneratedFollowUpResponse(originalMessage, channelTopic) {
    // Delay to simulate thinking time or to not overwhelm the user
    const followUpDelay = Math.random() * (constants.FOLLOW_UP_MAX_DELAY - constants.FOLLOW_UP_MIN_DELAY) + constants.FOLLOW_UP_MIN_DELAY;
    await new Promise(resolve => setTimeout(resolve, followUpDelay));
    
    // Prepare the prompt for follow-up suggestion
    const commandSuggestionsPrompt = await prepareFollowUpRequestBody(originalMessage, channelTopic);
    
    // Send the request to LLM for a follow-up suggestion
    const suggestedCommandResponse = await new OpenAiManager().sendRequest(commandSuggestionsPrompt);
    
    // Assume the response structure is directly usable or parse as needed
    const followUpMessageContent = suggestedCommandResponse.choices[0].text.trim();

    // Use the existing sendResponse function to send the LLM-generated follow-up message
    await sendResponse({response: {text: followUpMessageContent}}, originalMessage.getChannelId());
    logger.info(`LLM-generated follow-up message sent: "${followUpMessageContent}"`);
}

async function prepareFollowUpRequestBody(originalMessage, channelTopic) {
    // Fetch available commands and their descriptions
    const commands = require('../commands/inline'); // Assuming commands are structured in a way that they can be described
    const commandDescriptions = Object.values(commands).map(cmd => `Command: ${cmd.name}, Description: ${cmd.description}`).join('; ');
    
    // Construct a prompt that asks the LLM to suggest a follow-up action based on the conversation context and available commands
    const prompt = `Given the channel topic "${channelTopic}" and the following available commands: ${commandDescriptions}, suggest a follow-up action for the user to engage with.`;
    
    const requestBody = {
        prompt: prompt,
        max_tokens: 420,
        // Add other parameters as needed to tailor the LLM's response
    };

    return requestBody;
}

module.exports = { messageHandler };
