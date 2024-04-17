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
// async function sendResponse(channelId, messageContent) {
//     logger.debug(`[messageHandlerUtils] Preparing to send response. Channel ID: ${channelId}, Content: ${messageContent}`);

//     if (typeof channelId !== 'string') {
//         logger.error('[messageHandlerUtils] Invalid channelId type. Expected string.');
//         throw new TypeError('channelId must be a string');
//     }

//     if (typeof messageContent !== 'string' && typeof messageContent !== 'number') {
//         logger.error('[messageHandlerUtils] Invalid messageContent type. Expected string or number.');
//         throw new TypeError('messageContent must be a string or a number');
//     }

//     // Convert number to string if necessary
//     messageContent = messageContent.toString();
//     logger.debug(`[messageHandlerUtils] Sending message. Channel ID: ${channelId}, Content: ${messageContent}`);

//     try {
//         // Directly use DiscordManager's sendResponse method to send the message
//         await DiscordManager.getInstance().sendResponse(channelId, messageContent);
//         logger.debug(`[messageHandlerUtils] Message successfully sent to channel ID: ${channelId}. Content: ${messageContent}`);
//     } catch (error) {
//         // Log any errors encountered during the message sending process
//         logger.error(`[messageHandlerUtils] Failed to send message to channel ID: ${channelId}: ${error}`);
//     }
// }

/**
 * Sends a response message to a specified channel with artificial delays to simulate human-like interaction and to avoid spamming the channel.
 * This function also handles message splitting if the message exceeds a certain length or contains natural breakpoints such as periods or newlines.
 *
 * @param {string} messageContent - The content of the message to be sent.
 * @param {string} channelId - The Discord channel ID where the message will be sent.
 * @param {number} startTime - The timestamp when the message processing started, used to calculate total processing time.
 */
async function sendResponse(messageContent, channelId, startTime) {
    logger.debug(`[sendResponse] Starting to send response to channel ${channelId}. Initial content length: ${messageContent.length}`);
    
    // Calculate the initial delay based on recent channel activity to prevent spamming.
    let delay = getInitialDelay(channelId);
    logger.debug(`[sendResponse] Initial calculated delay: ${delay}ms for channel ${channelId}.`);

    while (delay > 0) {
        logger.debug(`[sendResponse] Delaying message send by ${delay}ms to simulate human-like response.`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Recalculate delay with a decay factor to ensure the message is sent even during active channel periods.
        delay = getNextDelay(delay, channelId, 0.9); // Less aggressive decay for initial responses
        logger.debug(`[sendResponse] New delay after decay calculation: ${delay}ms.`);
    }

    // Split message if needed and send each part with an appropriate delay.
    const splitChance = 0.5; // Probability to split the message at a natural breakpoint
    if (Math.random() < splitChance) {
        logger.debug(`[sendResponse] Chance to split message met. Evaluating split points.`);
        const splitIndex = Math.max(messageContent.indexOf('! ') + 1, messageContent.indexOf('? ') + 1, messageContent.indexOf('. ') + 1, messageContent.indexOf('\n') + 1);
        if (splitIndex > 0) {
            const firstPart = messageContent.substring(0, splitIndex);
            logger.debug(`[sendResponse] Splitting message at index ${splitIndex}. First part length: ${firstPart.length}`);
            await sendMessagePart(firstPart, startTime, channelId);
            const remainingMessage = messageContent.substring(splitIndex).trim();
            if (remainingMessage) {
                logger.debug(`[sendResponse] Sending remaining part of the message after split. Remaining length: ${remainingMessage.length}`);
                await sendResponse(remainingMessage, channelId, Date.now()); // Recursively send the remaining part
            }
        } else {
            logger.debug(`[sendResponse] No valid split point found. Sending message as a single part.`);
            await sendMessagePart(messageContent, startTime, channelId);
        }
    } else {
        logger.debug(`[sendResponse] Message will not be split. Sending as a single part.`);
        await sendMessagePart(messageContent, startTime, channelId);
    }

    const processingTime = Date.now() - startTime;
    logger.info(`[sendResponse] Message processing complete. Total time: ${processingTime}ms.`);
}

/**
 * Sends a part of the message after applying the final delay.
 *
 * @param {string} part - The part of the message to send.
 * @param {number} startTime - The start time of the message processing.
 * @param {string} channelId - The channel ID to send the message to.
 */
async function sendMessagePart(part, startTime, channelId) {
    let finalDelay = getNextDelay(0, channelId, 0.5); // More aggressive decay for subsequent parts
    logger.debug(`[sendMessagePart] Final delay before sending message part: ${finalDelay}ms for channel ${channelId}.`);
    await new Promise(resolve => setTimeout(resolve, finalDelay));
    // Assume sendMessage is a function that sends a message to the channel.
    await DiscordManager.getInstance().sendMessage(channelId, part);
    logger.debug(`[sendMessagePart] Message part sent to channel ${channelId}. Content length: ${part.length}.`);
}

/**
 * Sends a part of the message considering typing delay and ensuring the simulation of typing speed.
 *
 * @param {string} part - The part of the message to send.
 * @param {number} startTime - The start time of the message sending process to calculate delays.
 * @param {string} channelId - The ID of the channel where the message is being sent.
 */
async function sendMessagePart(part, startTime, channelId) {
    const processingTime = Date.now() - startTime;
    // Calculate delay to simulate typing speed (approximately 300ms per character)
    const delay = Math.max((part.length / 3.33) * 1000 - processingTime, 5000 - processingTime, 0);
    await new Promise(resolve => setTimeout(resolve, delay));
    await DiscordManager.getInstance().sendMessage(channelId, part);
    logger.info(`Message part sent with delay ${delay}ms: "${part}"`);
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
function shouldProcessMessage(originalMessage) {
    const openAiManager = OpenAiManager.getInstance();  // Ensure a fresh instance for each call

    // Check if the message is from the bot itself
    if (originalMessage.isFromBot()) {
        logger.debug("[shouldProcessMessage] Skipping message from the bot itself.");
        return false; // Skip processing for bot's own messages
    }

    // Additional checks like rate limiting, bot mentions, or command prefixes
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

/**
 * Determines whether the response from OpenAI should be summarized based on predefined criteria.
 * @param {LLMResponse} llmResponse - The response object from OpenAI.
 * @return {boolean} True if summarization is needed, false otherwise.
 */
function shouldSummarize(llmResponse) {
    return constants.LLM_ALWAYS_SUMMARISE || (llmResponse.finish_reason === "length") || (llmResponse.getCompletionTokens() >= constants.LLM_RESPONSE_MAX_TOKENS);
}

/**
 * Calculates the initial delay for sending a message based on the last message timestamp in the channel.
 * This initial delay helps in preventing the bot from spamming the channel especially if someone else has posted recently.
 *
 * @param {string} channelId - The ID of the channel where the message will be sent.
 * @returns {number} The initial delay in milliseconds before the message can be sent.
 */
function getInitialDelay(channelId) {
    const lastPostTime = DiscordManager.getInstance().getLastMessageTimestamp(channelId);
    const timeSinceLastPost = Date.now() - lastPostTime;
    // If the last post in the channel was less than 10 seconds ago, set an initial delay of 30 seconds.
    if (timeSinceLastPost < 10000) { // Less than 10 seconds
        return 30000; // Start with a 30-second delay
    }
    return 0; // No delay if the last post was longer ago
}

/**
 * Calculates the next delay for a message based on the current delay and channel activity,
 * applying a decay factor to reduce the delay over time, ensuring the message is sent eventually.
 *
 * @param {number} currentDelay - The current delay before the next part of the message can be sent.
 * @param {string} channelId - The ID of the channel where the message is being sent.
 * @param {number} decayFactor - The factor by which the delay is reduced on each iteration to simulate decay, typical values might be between 0.75 to 0.9.
 * @returns {number} The recalculated delay in milliseconds, considering the last message time and decay factor.
 */
function getNextDelay(currentDelay, channelId, decayFactor) {
    const lastPostTime = DiscordManager.getInstance().getLastMessageTimestamp(channelId);
    const timeSinceLastPost = Date.now() - lastPostTime;
    // Apply a decay factor if the last post was very recent to avoid spamming, else reduce the delay more aggressively.
    if (timeSinceLastPost < 5000) { // Last post within 5 seconds
        return currentDelay * decayFactor; // Apply decay factor
    }
    // Reduce the current delay by subtracting a fixed amount or setting to zero if small enough
    return Math.max(currentDelay - 5000, 0); // Ensure delay never goes negative
}

/**
 * Sends a generated follow-up response using LLM to the same channel as the original message.
 * It simulates a delay to mimic human-like pause in the conversation.
 *
 * @param {Object} originalMsg - The original message object from Discord.
 * @param {string} topic - The current topic of the channel, used for generating contextually relevant follow-ups.
 */
async function sendFollowUp(originalMsg, topic) {
    await simulateDelay(); // Simulates a thoughtful delay before sending a follow-up

    const body = await prepFollowUpBody(originalMsg, topic);
    const response = await OpenAiManager.getInstance().sendRequest(body);

    if (response && response.trim()) {
        await sendResponse(response.trim(), originalMsg.getChannelId(), Date.now());
        logger.info("Follow-up sent successfully.");
    } else {
        logger.info("No follow-up generated.");
    }
}

/**
 * Simulates a random delay mimicking a pause before sending a follow-up message,
 * to emulate human-like response timing.
 */
async function simulateDelay() {
    const minDelay = 2 * 60 * 1000; // 2 minutes
    const maxDelay = 5 * 60 * 1000; // 5 minutes
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Prepares the request body for the follow-up message based on the channel's topic and the original message.
 *
 * @param {Object} originalMsg - The original message object.
 * @param {string} topic - The topic of the channel to tailor the follow-up content.
 * @returns {Object} The prepared request body for the LLM.
 */
async function prepFollowUpBody(originalMsg, topic) {
    const channel = await DiscordManager.getInstance().client.channels.fetch(originalMsg.getChannelId());
    topic = channel.topic || 'General'; // Default topic if none set
    const history = await DiscordManager.getInstance().fetchMessages(originalMsg.getChannelId(), 20);
    const systemContent = `${constants.LLM_SYSTEM_PROMPT} USER: <@${originalMsg.getAuthorId()}>, ASSISTANT: <@${constants.CLIENT_ID}>, Topic: ${topic}`;

    return {
        prompt: `Based on the topic "${topic}" with previous context, suggest a follow-up action.`,
        max_tokens: 420
    };
}

/**
 * Fetches and formats the history of messages from a channel.
 *
 * @param {string} channelId - The ID of the Discord channel.
 * @returns {string} A formatted string of historical messages.
 */
async function fetchAndFormatHistory(channelId) {
    let fetchedHistory = await DiscordManager.getInstance().fetchMessages(channelId, 20)
        .catch(error => {
            logger.error("Failed to fetch message history:", error);
            return [];  // Default to an empty history if fetch fails
        });

    let history = fetchedHistory.map(msg => new DiscordMessage(msg)).filter(msg => msg instanceof DiscordMessage);

    if (history.length === 0) {
        logger.error('[fetchAndFormatHistory] No valid messages retrieved in history.');
    }

    return history.map(msg => `${msg.author.username}: ${msg.content}`).join(' ');
}

/**
 * Prepares the request body for the OpenAI API call, incorporating the provided message content,
 * channel history, and other contextual information.
 *
 * @param {string} prompt - The main content for the OpenAI prompt.
 * @param {string} [channelId=constants.CHANNEL_ID] - The ID of the Discord channel, defaults to a predefined channel ID.
 * @param {Array<Object>} [history=[]] - Historical messages to provide context, expected to be an array of message-like objects.
 * @returns {Promise<Object>} A configuration object containing the model, prompt, and settings for the API call.
 */
async function prepareMessageBody(prompt, channelId = constants.CHANNEL_ID, history = []) {
    logger.debug(`Preparing message body for channel ID: ${channelId} with prompt: ${prompt.substring(0, 50)}...`);

    return OpenAiManager.getInstance().buildRequestBody(history, prompt);
}

module.exports = {
    sendResponse,
    processCommand,
    summarizeMessage,
    handleFollowUp,
    shouldProcessMessage,
    shouldSummarize,
    getNextDelay,
    getInitialDelay,
    prepFollowUpBody,
    simulateDelay,
    prepareMessageBody,
    sendFollowUp,
};

