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

async function summarizeMessage(messageContent) {
    const maxAttempts = 3;
    let attempt = 0;
    let finishReason = '';
    let summary = '';
    let response = [];
    const openAiManager = OpenAiManager.getInstance(); // Ensure you have an instance of your OpenAiManager.

    while (attempt < maxAttempts && finishReason !== 'stop') {
        attempt++;
        logger.debug(`Attempting summarization, attempt ${attempt}`);
        
        // Use the revised summarizeText method. Assume it's part of an instance of a class managing OpenAI requests.
        response = await openAiManager.summarizeText(messageContent, 'A brief version of the following (and only that):');

        if (response.length > 0) {
            summary = response[0];
            // Assume your OpenAI response parsing logic sets 'finish_reason' as part of the summary or within a debug message.
            // Here, we'll need to manually check if the summary meets our requirements or if we should infer 'finish_reason'.
            // Since we don't have 'finish_reason' directly, let's decide based on the length of the summary or other criteria.

            // Example check - you might want to adjust this based on actual response structure or other logic
            let currentSummaryLength = summary.length;
            logger.debug(`Summary length after attempt ${attempt}: ${currentSummaryLength}`);

            if (currentSummaryLength < 1000 || summary.endsWith('...')) { // Example condition to retry
                finishReason = 'length'; // Simulating a finish reason for the purpose of this loop
                logger.debug(`Summarization attempt ${attempt} potentially incomplete. Retrying...`);
            } else {
                finishReason = 'stop'; // Assuming the summary is sufficient
                logger.debug('Summarization deemed complete.');
            }
        } else {
            logger.error('Failed to get a valid response from summarization request');
            break; // Exit loop if the response is not valid
        }
    }

    // Log final summary attempt's details
    logger.debug(`Final summary (attempt ${attempt}): ${summary.substring(0, 100)}...`); // Log the first 100 characters for brevity
    return summary; // Return the last summary attempt if all retries are exhausted or a valid summary is obtained
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
