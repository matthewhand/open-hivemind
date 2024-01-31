const axios = require('axios');
const { splitMessage, startTypingIndicator } = require('../utils/common');
const getRandomErrorMessage = require('../config/errorMessages');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const fetchConversationHistory = require('../utils/fetchConversationHistory');

async function handleOaiRequest(message, action, args) {
    try {
        // Determine the model based on the action, default to a predefined model
        const model = action || 'gpt-3.5-turbo'; // Default model

        const historyMessages = await fetchConversationHistory(message.channel);
        const requestBody = buildOaiRequestBody(historyMessages, args, model);
        if (!validateRequestBody(requestBody)) throw new Error('Invalid request body');

        const typingInterval = startTypingIndicator(message.channel);
        const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
            headers: { 'Content-Type': 'application/json', ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` }) }
        });

        clearInterval(typingInterval);
        const replyContent = processResponse(response.data);
        if (replyContent) {
            const messagesToSend = splitMessage(replyContent, 2000);
            for (const msg of messagesToSend) await message.reply(msg);
        }
    } catch (error) {
        logger.error(`Error in handleOaiRequest: ${error.message}`, error);
        await message.reply(getRandomErrorMessage());
    }
}

function buildOaiRequestBody(historyMessages, userMessage, model) {
    let requestBody = { model: constants.MODEL_TO_USE, messages: [{ role: 'system', content: constants.SYSTEM_PROMPT }] };  
    let currentSize = JSON.stringify(requestBody).length;

    historyMessages.slice().reverse().forEach(msg => {
        const formattedMessage = `<@${msg.userId}>: ${msg.content}`;
        const messageObj = { role: 'user', content: formattedMessage };
        currentSize += JSON.stringify(messageObj).length;
        if (currentSize <= constants.MAX_CONTENT_LENGTH) {
            requestBody.messages.push(messageObj);
        }
    });

    requestBody.messages.push({ role: 'user', content: userMessage });
    return requestBody;
}

function validateRequestBody(requestBody) {
    if (!requestBody || !Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
        logger.debug("Validation failed for requestBody:", JSON.stringify(requestBody));
        return false;
    }
    logger.debug("Validation passed for requestBody.");
    return true;
}
function processResponse(data) {
    if (data && data.choices && data.choices.length > 0) {
        let content = data.choices[0].message.content.trim();
        const pattern = /^<@\w+>: /;
        if (pattern.test(content)) {
            content = content.replace(pattern, '');
        }
        return content;
    }
    return 'No response from the server.';
}

module.exports = { handleOaiRequest };