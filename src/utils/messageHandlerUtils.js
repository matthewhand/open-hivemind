const DiscordManager = require('../managers/DiscordManager');
const OpenAiManager = require('../managers/OpenAiManager');
const logger = require('./logger');
const commands = require('../commands/inline'); // Adjust based on your actual command structure
const { listAllAliases } = require('./aliasUtils');


/**
 * Sends a message to a specified Discord channel. This function delegates the responsibility
 * of message handling, including any necessary splitting, to the DiscordManager.
 * 
 * @param {string} channelId - The ID of the Discord channel where the message will be sent.
 * @param {string} messageContent - The content of the message to be sent.
 */
async function sendResponse(channelId, messageContent) {
    try {
        // Directly use DiscordManager's sendResponse method to send the message
        await DiscordManager.getInstance().sendResponse(channelId, messageContent);
        logger.debug(`[messageHandlerUtils] Message sent to channel ID: ${channelId}`);
    } catch (error) {
        // Log any errors encountered during the message sending process
        logger.error(`[messageHandlerUtils] Failed to send message to channel ID: ${channelId}: ${error}`);
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

async function summarizeMessage(initialMessageContent) {
    const maxAttempts = 3;
    let attempt = 0;
    let currentMessageContent = initialMessageContent; // Ensure this is a string.
    let finalSummary = currentMessageContent; // Initialize with the initial content.
    let detailedResponse;

    const openAiManager = OpenAiManager.getInstance();

    while (attempt < maxAttempts) {
        attempt++;
        logger.debug(`[summarizeMessage] Attempt ${attempt}: Summarizing content.`);
        
        try {
            // Call OpenAiManager's summarizeText method with the current content as a string.
            detailedResponse = await openAiManager.summarizeText(currentMessageContent);
            const { summary, finishReason } = detailedResponse;

            logger.debug(`[summarizeMessage] Attempt ${attempt}: Summary length=${summary.length}, finishReason=${finishReason}`);

            if (finishReason !== 'stop' && attempt < maxAttempts) {
                // If summarization isn't deemed complete, and we haven't exhausted our attempts, prepare for another iteration.
                currentMessageContent = summary;
                logger.debug(`[summarizeMessage] Content updated for next summarization attempt.`);
            } else {
                // Summarization complete or attempts exhausted; set final summary.
                finalSummary = summary;
                logger.debug(`[summarizeMessage] Final summarization complete or attempts exhausted.`);
                break; // Exit loop as we've reached a conclusive end.
            }
        } catch (error) {
            logger.error(`[summarizeMessage] Error during summarization attempt ${attempt}: ${error}`);
            break; // Exit loop on error.
        }
    }

    logger.debug(`Final summary: ${finalSummary.substring(0, 100)}... (trimmed for brevity)`);
    return finalSummary; // Return the summary obtained from the final successful attempt.
}

// Determines whether the message should be processed
function shouldProcessMessage(originalMessage, openAiManager) {
    // Check if the message is from the bot itself
    if (originalMessage.isFromBot()) {
        logger.debug("[shouldProcessMessage] Skipping message from the bot itself.");
        return false; // Skip processing for bot's own messages
    }

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

        if (!followUpMessage) {
            logger.debug('[handleFollowUp] No follow-up suggestions generated.');
            return false;
        }

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
