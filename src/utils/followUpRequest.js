const logger = require('./logger');
const fetchConversationHistory = require('./fetchConversationHistory');
const { getRandomAliasCommand } = require('./aliasUtils');
const { sendLlmRequest } = require('./sendLlmRequest');

async function shouldSendFollowUp(message, threshold) {
    try {
        const recentMessages = await fetchConversationHistory(message.channel);
        return recentMessages.length <= threshold;
    } catch (error) {
        logger.error(`Error in shouldSendFollowUp: ${error.message}`);
        return false;
    }
}

async function scheduleFollowUpRequest(message) {
    try {
        const aliasCommand = getRandomAliasCommand();
        const reflectivePrompt = `Reflecting on the recent conversation, how might the command ${aliasCommand} provide further insights?`;
        await sendLlmRequest(message, reflectivePrompt);
    } catch (error) {
        logger.error(`Error in scheduleFollowUpRequest: ${error.message}`);
    }
}

module.exports = { shouldSendFollowUp, scheduleFollowUpRequest };
