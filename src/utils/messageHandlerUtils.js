const DiscordManager = require('../managers/DiscordManager');
const OpenAiManager = require('../managers/OpenAiManager');
const logger = require('./logger');
const commands = require('../commands/inline'); // Adjust based on your actual command structure
const { listAllAliases, getAliasDescription } = require('./aliasUtils');

// Checks if the message contains code blocks to avoid splitting them
function containsCodeBlocks(messageContent) {
    logger.debug(`Checking for code blocks in message.`);
    return /```[\s\S]*?```/.test(messageContent);
}

// Splits the message into manageable parts if necessary, excluding code blocks
function splitMessage(messageContent) {
    logger.debug(`Splitting message content for Discord's length limit.`);
    const MAX_LENGTH = 1900; // Slightly under Discord's limit for safety
    let parts = [];
    if (containsCodeBlocks(messageContent)) {
        parts.push(messageContent); // Keep code blocks intact
    } else {
        let currentPart = '';
        messageContent.split('\n').forEach(line => {
            if ((currentPart + '\n' + line).length > MAX_LENGTH) {
                parts.push(currentPart);
                currentPart = line;
            } else {
                currentPart += (currentPart ? '\n' : '') + line;
            }
        });
        if (currentPart) parts.push(currentPart); // Include the last part if present
    }
    return parts.filter(part => part.length); // Filter out any empty strings
}

// Sends individual parts of a message using DiscordManager
async function sendResponse(messageContent, channelId) {
    const messageParts = splitMessage(messageContent);
    logger.debug(`Sending message parts to channel ID: ${channelId}`);
    for (const part of messageParts) {
        try {
            // Use DiscordManager's sendResponse method
            await DiscordManager.getInstance().sendResponse(channelId, part);
            logger.debug(`Message part sent to channel ID: ${channelId}`);
        } catch (error) {
            logger.error(`Failed to send message part to channel ID: ${channelId}: ${error}`);
        }
    }
}

// Processes commands detected in messages
async function processCommand(originalMessage) {
    const messageText = originalMessage.content?.trim() || "";
    if (!messageText.startsWith('!')) return false;
    const [commandName, ...args] = messageText.slice(1).split(/\s+/);
    const command = commands[commandName.toLowerCase()];
    if (command) {
        await command.execute(originalMessage, args);
        logger.info(`Command '${commandName}' executed.`);
        return true; // Indicate that a command was processed
    } else {
        await originalMessage.reply(`Unknown command: '${commandName}'. Try '!help' for a list of commands.`);
        logger.warn(`Unknown command attempted: '${commandName}'.`);
        return true; // Command attempt recognized, even if not successful
    }
}

// Summarizes long messages
async function summarizeMessage(messageContent) {
    // Check if message exceeds the 1000-character threshold for summarization
    if (messageContent.length <= 1000) {
        return messageContent; // Return original message if it's short enough
    } else {
        // Craft a system message for the LLM that specifies the need for a concise summary
        const systemMessageContent = "Summarize the following text concisely, without adding any additional comments, questions, or any wording that doesn't directly contribute to the summary. Aim to maintain the illusion of the bot's character role-playing:";
        try {
            const openAiManager = OpenAiManager.getInstance();
            const summarizedTexts = await openAiManager.summarizeText(messageContent, systemMessageContent);
            return summarizedTexts.length > 0 ? summarizedTexts[0] : "Could not summarize the message.";
        } catch (error) {
            logger.error(`Error summarizing message: ${error}`);
            return "An error occurred while summarizing the message."; // Fallback error message
        }
    }
}

// Determines whether the message should be processed
function shouldProcessMessage(originalMessage, openAiManager) {
    // This can include checks like rate limiting, bot mentions, or command prefixes
    if (openAiManager.getIsResponding()) {
        logger.info("Skipping message processing due to concurrent request.");
        return false; // Avoid processing if already handling another request
    }
    return true; // Proceed with processing
}

// This function could be expanded or refined based on the specifics of how your bot interacts with users
async function handleFollowUp(originalMessage) {
    try {
        // Example logic for deciding which follow-ups or command suggestions to make
        const followUpSuggestions = generateFollowUpSuggestions(originalMessage.content);
        const followUpMessage = `Here are some commands you might find useful:\n${followUpSuggestions}`;
        
        // Send the follow-up suggestion message back to the user
        await originalMessage.channel.send(followUpMessage);
        logger.info("Follow-up suggestions sent successfully.");
        return true; // Indicates successful handling of follow-up
    } catch (error) {
        logger.error(`Failed to send follow-up suggestions: ${error}`);
        return false; // Indicates an issue occurred during follow-up
    }
}

// Generate suggestions based on the original message content or context
function generateFollowUpSuggestions(messageContent) {
    // Placeholder: Implement your logic here to analyze the message content and decide on suggestions
    // For demonstration, this will simply list all aliases with descriptions
    const allAliasesWithDescriptions = listAllAliases();
    return allAliasesWithDescriptions; // Customize this to make more context-aware suggestions
}


module.exports = {
    sendResponse,
    processCommand,
    summarizeMessage,
    handleFollowUp,
    shouldProcessMessage,
};
