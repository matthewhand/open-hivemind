const axios = require('axios');
const fetchConversationHistory = require('./fetchConversationHistory');
const { DecideToRespond } = require('./responseDecider');
const getRandomErrorMessage = require('./errorMessages');

// Constants
const MAX_CONTENT_LENGTH = parseInt(process.env.LLM_MAX_CONTEXT_SIZE || '4096', 10);
const MAX_RESPONSE_SIZE = parseInt(process.env.LLM_MAX_RESPONSE_SIZE || '2048', 10);
const MODEL_TO_USE = process.env.LLM_MODEL || 'mistral-7b-instruct';
const LLM_ENDPOINT_URL = process.env.LLM_ENDPOINT_URL;
const SYSTEM_PROMPT = process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.';
const BOT_TO_BOT_MODE = process.env.BOT_TO_BOT_MODE !== 'false';
const API_KEY = process.env.LLM_API_KEY;
const INACTIVITY_THRESHOLD = parseInt(process.env.INACTIVITY_THRESHOLD || '120000', 10); // Default: 2 minutes

// Bonuses and Response Chances
const INTERROBANG_BONUS = parseFloat(process.env.INTERROBANG_BONUS || '0.2');
const TIME_VS_RESPONSE_CHANCE = process.env.TIME_VS_RESPONSE_CHANCE ?
    JSON.parse(process.env.TIME_VS_RESPONSE_CHANCE) : 
    [[1 * 60000, 0.05], [7 * 60000, 0.8], [69 * 60000, 0.1]];

// Response Decider Singleton
const responseDecider = new DecideToRespond({
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true
}, INTERROBANG_BONUS, TIME_VS_RESPONSE_CHANCE, INACTIVITY_THRESHOLD);

// Validate Request Body
function validateRequestBody(requestBody) {
    if (!requestBody || !Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
        console.debug("Validation failed for requestBody:", JSON.stringify(requestBody));
        return false;
    }
    console.debug("Validation passed for requestBody.");
    return true;
}


// Process LLM Response
function processResponse(data) {
    if (data && data.choices && data.choices.length > 0) {
        let content = data.choices[0].message.content.trim();
        return splitMessage(content, 2000);
    }
    return ['No response from the server.'];
}

function splitMessage(message, maxLength) {
    const suffix = "...";
    let parts = [];
    while (message.length > 0) {
        let nextIndex = maxLength;
        if (message.length > maxLength) {
            const lastSpaceIndex = message.lastIndexOf(' ', maxLength);
            nextIndex = lastSpaceIndex > -1 ? lastSpaceIndex : maxLength;
            parts.push(message.substring(0, nextIndex) + suffix);
        } else {
            parts.push(message.substring(0, nextIndex));
        }
        message = message.substring(nextIndex).trim();
        console.debug("Split part:", parts[parts.length - 1]); 
    }
    return parts;
}

function buildReviveRequestBody(historyMessages, revivePrompt) {
    // Create a system message that includes both the chat history context and the instruction
    const systemMessage = "The following is the chat history. Please generate a message that can revive the conversation in a friendly and engaging manner based on this history.";

    // Initialize the request body with the model, system prompt, and the combined system message
    let requestBody = { 
        model: MODEL_TO_USE, 
        messages: [
            { role: 'system', content: SYSTEM_PROMPT + "\n" + systemMessage }
        ] 
    };

    let currentSize = JSON.stringify(requestBody).length;

    // Add each message from the chat history
    historyMessages.slice().reverse().forEach(msg => {
        const authorId = msg.author ? msg.author.id : 'unknown-author';
        const formattedMessage = `<@${authorId}>: ${msg.content}`;
        const messageObj = { role: 'user', content: formattedMessage };
        currentSize += JSON.stringify(messageObj).length;

        if (currentSize <= MAX_CONTENT_LENGTH - MAX_RESPONSE_SIZE) {
            requestBody.messages.push(messageObj);
        }
    });

    // Add the user's revival prompt if provided
    if (revivePrompt) {
        requestBody.messages.push({ role: 'user', content: revivePrompt });
    }

    return requestBody;
}

// Send LLM Request
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

        console.debug("Sending LLM request...");
        const response = await axios.post(LLM_ENDPOINT_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            }
        });

        console.debug("Stopping typing indicator...");
        clearInterval(typingInterval);

        console.console.debug("Processing LLM response...");
        if (response.status === 200 && response.data) {
            const replyContent = processResponse(response.data);
            console.debug("LLM response:", replyContent);
            if (replyContent && replyContent.trim() !== '') {
                // Split the replyContent if needed and send it
                const messagesToSend = splitMessage(replyContent, 2000);
                for (const msg of messagesToSend) {
                    await message.reply(msg);
                }
        
                responseDecider.logMention(message.channel.id, Date.now());
            } else {
                console.debug("LLM returned an empty or invalid response.");
            }
        } else {
            console.error(`Request failed with status ${response.status}: ${response.statusText}, Response: ${JSON.stringify(response.data)}`);
            await message.reply(getRandomErrorMessage());
        }
    } catch (error) {
        console.error(`Error in sendLlmRequest: ${error.message}, Stack: ${error.stack}`);
        await message.reply(getRandomErrorMessage());
    }
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

async function generateReviveMessage(channel) {
    const revivePrompt = "Generate an engaging message to revive a quiet conversation in a friendly and casual tone.";
    const historyMessages = await fetchConversationHistory(channel);
    const fakeMessage = {
        channel: channel,
        content: revivePrompt,
        historyMessages: historyMessages // Include the chat history
    };

    await sendLlmRequest(fakeMessage, true); // Pass true to indicate revival message
}

async function messageHandler(message) {
    if (message.author.bot && !BOT_TO_BOT_MODE) {
        console.debug("Ignoring bot message as BOT_TO_BOT_MODE is disabled.");
        return;
    }

    console.debug("Deciding whether to respond...");
    const { shouldReply, isDirectMention } = responseDecider.shouldReplyToMessage(message.client.user.id, message);

    responseDecider.logMessage(message.channel.id, Date.now());
    // responseDecider.startInactivityTimer(message.channel.id, async () => {
    //     await generateReviveMessage(message.channel.id);
    // });

    if (shouldReply || isDirectMention) {
        console.debug("Sending LLM request for message...");
        await sendLlmRequest(message);
    }
}

module.exports = messageHandler;
