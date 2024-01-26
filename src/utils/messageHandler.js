const { aliases } = require('../textCommands/commandHandler'); 
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
const followUpEnabled = process.env.FOLLOW_UP_ENABLED !== 'false'; // Enabled by default
const followUpMinDelay = parseInt(process.env.FOLLOW_UP_MIN_DELAY || '2', 10) * 60 * 1000; // Default 2 minutes
const followUpMaxDelay = parseInt(process.env.FOLLOW_UP_MAX_DELAY || '60', 10) * 60 * 1000; // Default 60 minutes

// In your messageHandler.js or wherever DecideToRespond is initialized
const responseDeciderConfig = {
    interrobangBonus: 0.2,
    mentionBonus: 0.4,
    botResponsePenalty: 0.8,
    timeVsResponseChance: [[12345, 0.4], [420000, 0.6], [4140000, 0.2]],
    llmWakewords: ['!help']
};

const discordSettings = {
    unsolicitedChannelCap: 5,
    // other settings...
};

const responseDecider = new DecideToRespond(responseDeciderConfig, discordSettings);

    
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

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sendFollowUpRequest(message) {
    try {
        logger.debug("[Follow-Up Handler] Fetching conversation history for follow-up...");
        const historyMessages = await fetchConversationHistory(message.channel);

        if (!historyMessages || historyMessages.length === 0) {
            logger.debug("[Follow-Up Handler] No conversation history available for follow-up.");
            return; // Exit if no history messages are available
        }

        logger.debug("[Follow-Up Handler] Building request body for follow-up...");
        const requestBody = buildFollowUpRequestBody(historyMessages, message);

        if (!validateRequestBody(requestBody)) {
            throw new Error('Invalid request body for follow-up');
        }

        logger.debug("[Follow-Up Handler] Sending LLM follow-up request...");
        const response = await axios.post(LLM_ENDPOINT_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            }
        });

        const followUpContent = (response.status === 200 && response.data) ? processResponse(response.data) : 'No response from the server.';
        logger.debug("[Follow-Up Handler] LLM follow-up response received.");

        if (followUpContent && followUpContent.trim() !== '') {
            const messagesToSend = splitMessage(followUpContent, 2000);
            for (const msg of messagesToSend) {
                await message.reply(msg);
            }
            logger.debug("[Follow-Up Handler] Reply sent.");
        } else {
            logger.debug("[Follow-Up Handler] LLM returned an empty or invalid follow-up response.");
        }
    } catch (error) {
        logger.error(`[Error] Follow-Up Handler: ${error.message}`);
        if (error.response) {
            logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
        }
        await message.reply(getRandomErrorMessage());
    }
}

function buildFollowUpRequestBody(historyMessages, message) {
    try {
        if (!historyMessages || historyMessages.length === 0) {
            throw new Error("History messages are empty or undefined.");
        }

        // Select a random alias command
        const aliasKeys = Object.keys(aliases);
        const randomAlias = aliasKeys[Math.floor(Math.random() * aliasKeys.length)];

        // Construct the query using the random alias
        const command = `!${randomAlias}`;
        const reflectivePrompt = `Reflecting on the conversation, how might we use the command ${command} for further insights?`;
        requestBody.messages.push({ role: 'system', content: reflectivePrompt });

        logger.debug("[Follow-Up Handler] Constructed follow-up request body.");

        return requestBody;
    } catch (error) {
        logger.error("Error constructing follow-up request body:", error);
        return null; // Return null to indicate a failure in building the request body
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
