const DiscordManager = require('../managers/DiscordManager');
const OpenAiManager = require('../managers/OpenAiManager');
const logger = require('./logger');
const commands = require('../commands/inline');

const { listAllAliases } = require('./aliasUtils');
const constants = require('../config/constants');


/**
 * Sends a message to a specified Discord channel. This function delegates the responsibility
 * of message handling, including any necessary splitting, to the DiscordManager.
 * 
 * @param {string} channelId - The ID of the Discord channel where the message will be sent.
 * @param {string|number} messageContent - The content of the message to be sent.
 */
async function sendResponse(channelId, messageContent) {
    logger.debug(`[messageHandlerUtils] Preparing to send response. Channel ID: ${channelId}, Content: ${messageContent}`);

    if (typeof channelId !== 'string') {
        logger.error('[messageHandlerUtils] Invalid channelId type. Expected string.');
        throw new TypeError('channelId must be a string');
    }

    if (typeof messageContent !== 'string' && typeof messageContent !== 'number') {
        logger.error('[messageHandlerUtils] Invalid messageContent type. Expected string or number.');
        throw new TypeError('messageContent must be a string or a number');
    }

    // Convert number to string if necessary
    messageContent = messageContent.toString();
    logger.debug(`[messageHandlerUtils] Sending message. Channel ID: ${channelId}, Content: ${messageContent}`);

    try {
        // Directly use DiscordManager's sendResponse method to send the message
        await DiscordManager.getInstance().sendResponse(channelId, messageContent);
        logger.debug(`[messageHandlerUtils] Message successfully sent to channel ID: ${channelId}. Content: ${messageContent}`);
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

/**
 * Summarizes a message content to a specified target size.
 * 
 * @param {string} initialMessageContent - The initial content of the message to be summarized.
 * @param {number} [targetSize=constants.LLM_RESPONSE_MAX_TOKENS] - The target size for the summary in tokens. Defaults to the max token limit from constants.
 * @returns {Promise<string>} The summarized message content.
 */
async function summarizeMessage(initialMessageContent, targetSize = constants.LLM_RESPONSE_MAX_TOKENS) {
    const maxAttempts = 3;
    let attempt = 0;
    let currentMessageContent = initialMessageContent; // Ensure this is a string.
    let finalSummary = currentMessageContent; // Initialize with the initial content.
    let detailedResponse;

    const openAiManager = OpenAiManager.getInstance();

    while (attempt < maxAttempts) {
        attempt++;
        logger.debug(`[summarizeMessage] Attempt ${attempt}: Summarizing content to target size of ${targetSize} tokens.`);
        
        try {
            // Adjust the call to OpenAiManager's summarizeText method to include the targetSize.
            detailedResponse = await openAiManager.summarizeText(currentMessageContent, constants.LLM_SUMMARY_SYSTEM_PROMPT, targetSize);
            const { summary, finishReason } = detailedResponse;

            logger.debug(`[summarizeMessage] Attempt ${attempt}: Summary length=${summary.length}, finishReason=${finishReason}`);

            if ((finishReason !== 'stop' && finishReason !== 'length') && attempt < maxAttempts) { // oai=stop, together.xyz=length
                currentMessageContent = summary;
                logger.debug(`[summarizeMessage] Content updated for next summarization attempt.`);
            } else {
                finalSummary = summary;
                logger.debug(`[summarizeMessage] Final summarization complete or attempts exhausted.`);
                break;
            }
                    } catch (error) {
            logger.error(`[summarizeMessage] Error during summarization attempt ${attempt}: ${error}`);
            break;
        }
    }

    logger.debug(`Final summary: ${finalSummary.substring(0, 100)}... (trimmed for brevity)`);
    return finalSummary;
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
    logger.debug('[handleFollowUp] Starting follow-up handling.');

    try {
        // Example logic for deciding which follow-ups or command suggestions to make
        const followUpSuggestions = generateFollowUpSuggestions(originalMessage.getText());
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

