const axios = require('axios');
const logger = require('../utils/logger');
const getRandomErrorMessage = require('../config/errorMessages');
const constants = require('../config/constants');
const fetchConversationHistory = require('../utils/fetchConversationHistory');

const data = {
    name: 'oai',
    description: 'Interact with OpenAI models. Usage: !oai:[model] [query]'
};

async function execute(message, action = 'gpt-3.5-turbo', args) {
    try {
        const historyMessages = await fetchConversationHistory(message.channel);
        const requestBody = buildOaiRequestBody(historyMessages, args, action);

        if (!validateRequestBody(requestBody)) {
            throw new Error('Invalid request body');
        }

        const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` })
            }
        });

        const replyContent = processResponse(response.data);
        if (replyContent) {
            const messagesToSend = splitMessage(replyContent, 2000);
            for (const msg of messagesToSend) {
                await message.channel.send(msg);
            }
        }
    } catch (error) {
        logger.error(`Error in handleOaiRequest: ${error.message}`);
        if (error.response) {
            // Log additional details if available
            logger.error(`Response: ${JSON.stringify(error.response.data)}`);
            logger.error(`Status: ${error.response.status}`);
            logger.error(`Headers: ${JSON.stringify(error.response.headers)}`);
        }
        await message.reply(getRandomErrorMessage());
    }
}

function buildOaiRequestBody(historyMessages, userMessage, model) {
    let requestBody = { 
        model: model, 
        messages: [{ role: 'system', content: constants.SYSTEM_PROMPT }] 
    };  

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
    return requestBody && Array.isArray(requestBody.messages) && requestBody.messages.length > 0;
}

function processResponse(data) {
    if (data && data.choices && data.choices.length > 0) {
        let content = data.choices[0].message.content.trim();
        const pattern = /^<@\w+>: /;
        content = content.replace(pattern, '');
        return content;
    }
    return 'No response from the server.';
}

module.exports = { data, execute };
