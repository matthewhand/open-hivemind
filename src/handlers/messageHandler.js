const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const LLMResponse = require('../interfaces/LLMResponse');
const {
  sendResponse,
  processCommand,
  summarizeMessage,
  handleFollowUp,
  shouldProcessMessage
} = require('../utils/messageHandlerUtils');
const commands = require('../commands/inline');
const constants = require('../config/constants');
const rateLimiter = require('../utils/rateLimiter');

/**
 * Handles incoming messages and processes them accordingly. It ensures messages conform to 
 * expected structures, adheres to rate limits, and simulates a typing delay for enhanced interaction realism.
 * Messages are then processed for commands or responses from OpenAI, with the latter potentially being summarized
 * based on length before being sent back. Follow-up actions may also be triggered as needed.
 * 
 * @param {IMessage} originalMessage - The original message object.
 * @param {Array} historyMessages - An array of historical messages for context.
 */
async function messageHandler(originalMessage, historyMessages = []) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();

    if (typeof originalMessage.getText !== 'function' || 
        typeof originalMessage.getChannelId !== 'function') {
        logger.error(`[messageHandler] Provided message lacks required methods.`);
        return;
    }

    if (await processCommand(originalMessage, commands)) {
        logger.debug("[messageHandler] Command processed.");
        return;
    }

    if (!await shouldProcessMessage(originalMessage, openAiManager)) {
        logger.debug("[messageHandler] Message processing skipped.");
        return;
    }

    if (!rateLimiter.canSendMessage()) {
        logger.warn('[messageHandler] Exceeded message rate limit.');
        return;
    }

    // Initiate OpenAI request
    const fetchResponsePromise = openAiManager.sendRequest(openAiManager.buildRequestBody(historyMessages, constants.LLM_SYSTEM_PROMPT));
    openAiManager.setIsResponding(true);

    // Introduce an artificial delay
    const artificialDelayPromise = new Promise(resolve => setTimeout(resolve, Math.random() * (constants.BOT_TYPING_DELAY_MAX_MS - constants.BOT_TYPING_DELAY_MIN_MS) + constants.BOT_TYPING_DELAY_MIN_MS));
    
    // Await OpenAI response; delay does not block OpenAI request
    const [llmResponse] = await Promise.all([fetchResponsePromise, artificialDelayPromise]);

    if (!(llmResponse instanceof LLMResponse)) {
        logger.error(`[messageHandler] Invalid LLMResponse received.`);
        openAiManager.setIsResponding(false);
        return;
    }

    logger.debug('[messageHandler] Response and typing delay complete.');
    let messageContent = llmResponse.getContent();

    if (constants.LLM_ALWAYS_SUMMARISE || (llmResponse.getCompletionTokens() > constants.LLM_RESPONSE_MAX_TOKENS)) {
        messageContent = await summarizeMessage(messageContent);
    }

    rateLimiter.addMessageTimestamp();
    await sendResponse(originalMessage.getChannelId(), messageContent).catch(error => logger.error(`[messageHandler] Response send failure: ${error}`));

    if (await handleFollowUp(originalMessage)) {
        logger.debug('[messageHandler] Completed follow-up.');
    }

    openAiManager.setIsResponding(false);
    logger.info(`[messageHandler] Processing completed in ${Date.now() - startTime}ms.`);
}

module.exports = { messageHandler };
