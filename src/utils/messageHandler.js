const axios = require('axios');
const fetchConversationHistory = require('./fetchConversationHistory');
const { DecideToRespond } = require('./responseDecider');
const getRandomErrorMessage = require('./errorMessages');

// Constants
const followUpEnabled = process.env.FOLLOW_UP_ENABLED !== 'false'; // Enabled by default
const followUpMinDelay = parseInt(process.env.FOLLOW_UP_MIN_DELAY || '2', 10) * 60 * 1000; // Default 2 minutes
const followUpMaxDelay = parseInt(process.env.FOLLOW_UP_MAX_DELAY || '60', 10) * 60 * 1000; // Default 60 minutes
const MAX_CONTENT_LENGTH = parseInt(process.env.LLM_MAX_CONTEXT_SIZE || '4096', 10);
const MAX_RESPONSE_SIZE = parseInt(process.env.LLM_MAX_RESPONSE_SIZE || '2048', 10);
const MODEL_TO_USE = process.env.LLM_MODEL || 'mistral-7b-instruct';
const LLM_ENDPOINT_URL = process.env.LLM_ENDPOINT_URL;
const SYSTEM_PROMPT = process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.';
const BOT_TO_BOT_MODE = process.env.BOT_TO_BOT_MODE !== 'false';
const API_KEY = process.env.LLM_API_KEY;
const MIN_RESPONSE_TIME = process.env.MIN_RESPONSE_TIME || 3000;
const SCALE_RESPONSE_TIME = parseFloat(process.env.SCALE_RESPONSE_TIME || '6.9');

// Bonuses and Response Chances
const INTERROBANG_BONUS = parseFloat(process.env.INTERROBANG_BONUS || '0.2');
const TIME_VS_RESPONSE_CHANCE = process.env.TIME_VS_RESPONSE_CHANCE ?
    JSON.parse(process.env.TIME_VS_RESPONSE_CHANCE) : 
    [[12345, 0.1], [7 * 60000, 0.8], [69 * 60000, 0.4]];

// Response Decider Singleton
const responseDecider = new DecideToRespond({
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true
}, INTERROBANG_BONUS, TIME_VS_RESPONSE_CHANCE);

// Validate Request Body
function validateRequestBody(requestBody) {
    if (!requestBody || !Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
        console.debug("Validation failed for requestBody:", JSON.stringify(requestBody));
        return false;
    }
    console.debug("Validation passed for requestBody.");
    return true;
}

function processResponse(data) {
    if (data && data.choices && data.choices.length > 0) {
        let content = data.choices[0].message.content.trim();

        // Regular expression to match patterns like '<@anything>: '
        const pattern = /^<@\w+>: /;
        content = content.replace(pattern, '');

        return content;
    }
    return 'No response from the server.';
}

function splitMessage(message, maxLength) {
    const suffix = "...";
    const effectiveMaxLength = maxLength - suffix.length; // Adjusting for suffix length
    let parts = [];

    while (message.length > 0) {
        if (message.length > maxLength) {
            let lastSpaceIndex = message.lastIndexOf(' ', effectiveMaxLength);
            lastSpaceIndex = lastSpaceIndex > -1 ? lastSpaceIndex : effectiveMaxLength;
            parts.push(message.substring(0, lastSpaceIndex) + suffix);
            message = message.substring(lastSpaceIndex).trim();
        } else {
            parts.push(message);
            break; // No more splitting needed
        }
        console.debug("Split part:", parts[parts.length - 1]);
    }
    return parts;
}

function scaleMinResponseTime(responseLength) {
    const baseMinTime = MIN_RESPONSE_TIME;
    const scalingFactor = SCALE_RESPONSE_TIME;

    return baseMinTime + (responseLength * scalingFactor);
}

async function sendLlmRequest(message) {
    try {
        console.debug("Fetching conversation history...");
        const historyMessages = await fetchConversationHistory(message.channel);
        const requestBody = buildRequestBody(historyMessages, message.content, message);

        console.debug("Validating request body...");
        if (!validateRequestBody(requestBody)) {
            throw new Error('Invalid request body');
        }

        console.debug("Starting typing indicator...");
        const typingInterval = startTypingIndicator(message.channel);
       
        const startTime = Date.now();

        console.debug("Sending LLM request...");
        const response = await axios.post(LLM_ENDPOINT_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            }
        });

        console.debug("Processing LLM response...");
        const replyContent = (response.status === 200 && response.data) ? processResponse(response.data) : 'No response from the server.';
        console.debug("LLM response:", replyContent);

        if (replyContent && replyContent.trim() !== '') {
            const responseTime = Date.now() - startTime;
            const scaledMinResponseTime = scaleMinResponseTime(replyContent.length);
    
            let totalDelay = 0;
            if (responseTime < scaledMinResponseTime) {
                totalDelay = scaledMinResponseTime - responseTime;
            }

            if (totalDelay > 0) {
                console.debug(`Adding total delay of ${totalDelay} ms to mimic human response time`);
                await new Promise(resolve => setTimeout(resolve, totalDelay));
            }

            // Split the replyContent if needed and send it
            const messagesToSend = splitMessage(replyContent, 2000);
            for (const msg of messagesToSend) {
                await message.reply(msg);
            }

            responseDecider.logMention(message.channel.id, Date.now());
        } else {
            console.debug("LLM returned an empty or invalid response.");
        }

        console.debug("Stopping typing indicator...");
        clearInterval(typingInterval);

        // Follow-up message logic
        if (followUpEnabled && shouldSendFollowUp()) {
            const delay = getRandomDelay(followUpMinDelay, followUpMaxDelay);
            setTimeout(() => {
                   sendFollowUpRequest(message);
            }, delay);
        }
        
    } catch (error) {
        console.error(`Error in sendLlmRequest: ${error.message}, Stack: ${error.stack}`);
        await message.reply(getRandomErrorMessage());
    }
}

function shouldSendFollowUp() {
    // Randomly return true or false
    return Math.random() < 0.5; //  50% chance
}

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sendFollowUpRequest(message) {
    try {
        console.debug("Fetching conversation history for follow-up...");
        const historyMessages = await fetchConversationHistory(message.channel);

        console.debug("Building request body for follow-up...");
        const requestBody = buildFollowUpRequestBody(historyMessages, message);

        if (!validateRequestBody(requestBody)) {
            throw new Error('Invalid request body for follow-up');
        }

        console.debug("Sending LLM follow-up request...");
        const response = await axios.post(LLM_ENDPOINT_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            }
        });

        const followUpContent = (response.status === 200 && response.data) ? processResponse(response.data) : 'No response from the server.';
        console.debug("LLM follow-up response:", followUpContent);

        if (followUpContent && followUpContent.trim() !== '') {
            const messagesToSend = splitMessage(followUpContent, 2000);
            for (const msg of messagesToSend) {
                await message.reply(msg);
            }
        } else {
            console.debug("LLM returned an empty or invalid follow-up response.");
        }

    } catch (error) {
        // Log the error but do not reply to the channel
        console.error(`Error in sendFollowUpRequest: ${error.message}, Stack: ${error.stack}`);
        // Removed the line that replies to the channel with an error message
    }
}

function buildFollowUpRequestBody(historyMessages, message) {
    let requestBody = { model: MODEL_TO_USE, messages: [] };
    let currentSize = 0;

    historyMessages.slice().reverse().forEach(msg => {
        const messageObj = formatMessageObject(msg);
        currentSize += JSON.stringify(messageObj).length;

        if (currentSize <= MAX_CONTENT_LENGTH - MAX_RESPONSE_SIZE) {
            requestBody.messages.push(messageObj);
        }
    });

    // Modify the system prompt for reflection
    const reflectivePrompt = `Reflecting on my last message, ${requestBody.messages[requestBody.messages.length - 1].content}, what insights and educational value can be drawn from it?`;
    requestBody.messages.push({ role: 'system', content: reflectivePrompt });

    console.debug("Constructed follow-up request body:", JSON.stringify(requestBody));
    return requestBody;
}

function formatMessageObject(msg) {
    const authorId = msg.author ? msg.author.id : 'unknown-author';
    const formattedContent = `<@${authorId}>: ${msg.content}`;
    return { role: 'user', content: formattedContent };
}

// Start Typing Indicator
function startTypingIndicator(channel) {
    channel.sendTyping();
    return setInterval(() => channel.sendTyping(), 15000);
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

        if (currentSize <= MAX_CONTENT_LENGTH - MAX_RESPONSE_SIZE) {
            requestBody.messages.push(messageObj);
        }
    });

    const userFormattedMessage = `<@${message.author ? message.author.id : 'current-author'}>: ${userMessage}`;
    requestBody.messages.push({ role: 'user', content: userFormattedMessage });

    console.debug("Constructed request body:", JSON.stringify(requestBody));
    return requestBody;
}

// Process LLM Response
function processResponse(data) {
    if (data && data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
    }
    return 'No response from the server.';
}

// Message Handler
async function messageHandler(message) {
    if (message.author.bot && !BOT_TO_BOT_MODE) {
        console.debug("Ignoring bot message as BOT_TO_BOT_MODE is disabled.");
        return;
    }

    console.debug("Deciding whether to respond...");
    const { shouldReply, isDirectMention } = responseDecider.shouldReplyToMessage(message.client.user.id, message);

    if (shouldReply || isDirectMention) {
        console.debug("Sending LLM request for message...");
        await sendLlmRequest(message);
    }
}

module.exports = messageHandler;
