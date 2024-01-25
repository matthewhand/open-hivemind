const axios = require('axios');
const fetchConversationHistory = require('./fetchConversationHistory');
const { DecideToRespond } = require('./responseDecider');
const getRandomErrorMessage = require('./errorMessages');
const logger = require('./logger');

// Constants
const MODEL_TO_USE = process.env.LLM_MODEL || 'mistral-7b-instruct';
const LLM_ENDPOINT_URL = process.env.LLM_ENDPOINT_URL;
const SYSTEM_PROMPT = process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.';
const BOT_TO_BOT_MODE = process.env.BOT_TO_BOT_MODE !== 'false';
const API_KEY = process.env.LLM_API_KEY;
const MAX_CONTENT_LENGTH = parseInt(process.env.LLM_MAX_CONTEXT_SIZE || '4096', 10);

// Bonuses and Response Chances
const INTERROBANG_BONUS = parseFloat(process.env.INTERROBANG_BONUS || '0.2');
const TIME_VS_RESPONSE_CHANCE = process.env.TIME_VS_RESPONSE_CHANCE ?
    JSON.parse(process.env.TIME_VS_RESPONSE_CHANCE) : 
    [[12345, 0.05], [7 * 60000, 0.75], [69 * 60000, 0.0]];

const responseDecider = new DecideToRespond({
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true
});
    
// Validate Request Body
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

        // Regular expression to match patterns like '<@anything>: '
        const pattern = /^<@\w+>: /;

        // Check if the pattern exists and log it
        if (pattern.test(content)) {
            console.debug(`Stripping pattern from response: ${content.match(pattern)[0]}`);
        }

        content = content.replace(pattern, '');

        return content;
    }
    return 'No response from the server.';
}

// Build Request Body
function buildRequestBody(historyMessages, userMessage, message) {
    let requestBody = { model: MODEL_TO_USE, messages: [{ role: 'system', content: SYSTEM_PROMPT }] };      
    let currentSize = JSON.stringify(requestBody).length;

    historyMessages.slice().reverse().forEach(msg => {
        const authorId = msg.author ? msg.author.id : 'unknown-author';
        const formattedMessage = `<@${authorId}>: ${msg.content}`;
        const messageObj = { role: 'user', content: formattedMessage };
        currentSize += JSON.stringify(messageObj).length;

        if (currentSize <= MAX_CONTENT_LENGTH) {
            requestBody.messages.push(messageObj);
        }
    });

    requestBody.messages.push({ role: 'user', content: userMessage });

    logger.debug("Constructed request body:", JSON.stringify(requestBody));
    return requestBody;
}

function splitMessage(message, maxLength = 2000) {
    const splitMessages = [];
    let currentMessage = '';

    message.split(' ').forEach(word => {
        if ((currentMessage + word).length > maxLength) {
            splitMessages.push(currentMessage);
            currentMessage = '';
        }
        currentMessage += `${word} `;
    });

    if (currentMessage.length > 0) {
        splitMessages.push(currentMessage.trim());
    }

    return splitMessages;
}


async function sendLlmRequest(message) {
    try {
        // Fetch conversation history
        const historyMessages = await fetchConversationHistory(message.channel);
        const requestBody = buildRequestBody(historyMessages, message.content, message);

        if (!validateRequestBody(requestBody)) {
            throw new Error('Invalid request body');
        }

        // Start Typing Indicator
        const typingInterval = startTypingIndicator(message.channel);

        // Send LLM request
        const response = await axios.post(LLM_ENDPOINT_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            }
        });

        // Process LLM response
        const replyContent = processResponse(response.data);

        // Stop Typing Indicator
        clearInterval(typingInterval);

        if (replyContent && replyContent.trim() !== '') {
            // Send reply
            const messagesToSend = splitMessage(replyContent, 2000);
            for (const msg of messagesToSend) {
                await message.reply(msg);
            }

            // Log mention time
            responseDecider.logMention(message.channel.id, Date.now());

            // Follow-up logic
            if (followUpEnabled) {
                const delay = getRandomDelay(followUpMinDelay, followUpMaxDelay);
                setTimeout(() => sendFollowUpRequest(message), delay);
            }
        } else {
            console.debug("LLM returned an empty or invalid response.");
        }
    } catch (error) {
        console.error(`Error in sendLlmRequest: ${error.message}, Stack: ${error.stack}`);
        await message.reply(getRandomErrorMessage());
    }
}

function startTypingIndicator(channel) {
    channel.sendTyping();
    return setInterval(() => channel.sendTyping(), 15000);
}

// Message Handler
async function messageHandler(message) {
    if (message.author.bot && !BOT_TO_BOT_MODE) {
        console.log('[Message Handler] Ignoring bot message (BOT_TO_BOT_MODE disabled).');
        return;
    }

    const shouldReply = responseDecider.shouldReplyToMessage(message.client.user.id, message);
    console.log(`[Message Handler] Decision to reply: ${shouldReply}`);

    if (shouldReply) {
        console.log('[Message Handler] Decided to respond. Sending LLM request.');
        await sendLlmRequest(message);
    } else {
        console.log('[Message Handler] Decided not to respond.');
    }
}

module.exports = messageHandler;
