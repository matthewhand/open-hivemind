const axios = require('axios');
const { aliases } = require('./commandHandler');
const { commandHandler } = require('./commandHandler'); 
const { DecideToRespond } = require('./responseHandler');
const logger = require('../utils/logger');
const constants = require('../config/constants');
// const { splitMessage, getRandomDelay, startTypingIndicator } = require('../utils/common');
// const getRandomErrorMessage = require('../utils/errorMessages');
// const fetchConversationHistory = require('../utils/fetchConversationHistory');

const responseDecider = new DecideToRespond(constants.responseDeciderConfig);

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

function buildRequestBody(historyMessages, userMessage) {
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

// async function sendLlmRequest(message) {
//     try {
//         const historyMessages = await fetchConversationHistory(message.channel);
//         const requestBody = buildRequestBody(historyMessages, message.content);
//         if (!validateRequestBody(requestBody)) throw new Error('Invalid request body');

//         const typingInterval = startTypingIndicator(message.channel);
//         const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
//             headers: { 'Content-Type': 'application/json', ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` }) }
//         });

//         clearInterval(typingInterval);
//         const replyContent = processResponse(response.data);
//         if (replyContent) {
//             const messagesToSend = splitMessage(replyContent, 2000);
//             for (const msg of messagesToSend) await message.reply(msg);
//             if (constants.FOLLOW_UP_ENABLED) setTimeout(() => sendFollowUpRequest(message), getRandomDelay(constants.FOLLOW_UP_MIN_DELAY, constants.FOLLOW_UP_MAX_DELAY));
//         }
//     } catch (error) {
//         logger.error(`Error in sendLlmRequest: ${error.message}`, error);
//         await message.reply(getRandomErrorMessage());
//     }
// }

// async function sendFollowUpRequest(message) {
//     try {
//         const historyMessages = await fetchConversationHistory(message.channel);
//         if (historyMessages.length === 0) return;

//         const requestBody = buildFollowUpRequestBody(historyMessages);
//         if (!validateRequestBody(requestBody)) throw new Error('Invalid request body for follow-up');

//         const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
//             headers: { 'Content-Type': 'application/json', ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` }) }
//         });

//         const followUpContent = processResponse(response.data);
//         if (followUpContent) {
//             const messagesToSend = splitMessage(followUpContent, 2000);
//             for (const msg of messagesToSend) await message.reply(msg);
//         }
//     } catch (error) {
//         logger.error(`[Error] Follow-Up Handler: ${error.message}`, error);
//         await message.reply(getRandomErrorMessage());
//     }
// }

// function buildFollowUpRequestBody(historyMessages) {
//     const randomAlias = aliases[Math.floor(Math.random() * Object.keys(aliases).length)];
//     const command = `!${randomAlias}`;
//     const reflectivePrompt = `Reflecting on the conversation, how might we use the command ${command} for further insights?`;

//     let requestBody = { model: constants.MODEL_TO_USE, messages: [{ role: 'system', content: reflectivePrompt }] };
//     historyMessages.slice().reverse().forEach(msg => {
//         if (JSON.stringify(requestBody).length <= constants.MAX_CONTENT_LENGTH) {
//             requestBody.messages.push({ role: 'user', content: `<@${msg.userId}>: ${msg.content}` });
//         }
//     });
//     return requestBody;
// }

async function messageHandler(message) {
    if (message.author.bot) return;

    // Get the handler setting for the current guild
    const guildId = message.guild.id;
    const handlerAlias = config.guildHandlers[guildId] || 'oai'; // defaults to OAI compatible

    // Prepend the handler alias to the message content
    const modifiedMessageContent = `!${handlerAlias} ${message.content}`;

    // Pass the modified message content to your general command handler
    await commandHandler(message, modifiedMessageContent);
}

module.exports = { messageHandler };
