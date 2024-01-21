const axios = require('axios');
const fetchConversationHistory = require('./fetchConversationHistory');
const { DecideToRespond } = require('./responseDecider');

const MAX_CONTENT_LENGTH = parseInt(process.env.LLM_MAX_CONTEXT_SIZE || '4096', 10);
const MAX_RESPONSE_SIZE = parseInt(process.env.LLM_MAX_RESPONSE_SIZE || '2048', 10);
const MODEL_TO_USE = process.env.LLM_MODEL || 'mistral-7b-instruct';
const LLM_URL = process.env.LLM_ENDPOINT_URL;
const SYSTEM_PROMPT = process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.';
const BOT_TO_BOT_MODE = process.env.BOT_TO_BOT_MODE !== 'false';
const API_KEY = process.env.LLM_API_KEY;

const responseDecider = new DecideToRespond({
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true
}, 0.1, [[5, 0.05], [120, 0.5], [420, 0.9], [6900, 0.1]]);

// Random error messages
const errorMessages = [
    "Oops, I tripped over my own code! 🤖",
    "Whoa, I got a bit tangled in my wires there. 🌐",
    "Ah, my circuits are in a twist! 🔧",
    "Looks like I zapped the wrong bytes! ⚡",
    "Yikes, I think I just had a code hiccup. 🤖🤧",
    // Add more messages as desired
];

function getRandomErrorMessage() {
    const randomIndex = Math.floor(Math.random() * errorMessages.length);
    return errorMessages[randomIndex];
}

function validateRequestBody(requestBody) {
    // Check if requestBody exists
    if (!requestBody) {
        console.debug("Validation failed: requestBody is undefined or null.");
        return false;
    }

    // Check if requestBody has the 'messages' array
    if (!Array.isArray(requestBody.messages)) {
        console.debug("Validation failed: 'messages' is not an array. requestBody:", JSON.stringify(requestBody));
        return false;
    }

    // Check if the 'messages' array is empty
    if (requestBody.messages.length === 0) {
        console.debug("Validation failed: 'messages' array is empty.");
        return false;
    }

    // Additional validation checks can be added here
    // ...

    // If all checks pass
    console.debug("Validation passed for requestBody.");
    return true;
}

async function sendLlmRequest(message) {
    try {
        const historyMessages = await fetchConversationHistory(message.channel);
        const requestBody = buildRequestBody(historyMessages, message.content, message);

        // Validate the request body before sending
        if (!validateRequestBody(requestBody)) {
            console.error('Invalid request body:', JSON.stringify(requestBody));
            throw new Error('Invalid request body');
        }

        // Debugging: log the request payload
        console.debug("Sending LLM request with payload:", JSON.stringify(requestBody));

        const response = await axios.post(LLM_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            }
        });

        if (response.status === 200) {
            const replyContent = processResponse(response.data);
            await message.reply(replyContent);
            responseDecider.logMention(message.channel.id, Date.now());
        } else {
            console.error(`Request failed with status ${response.status}: ${response.statusText}`);
            await message.reply(getRandomErrorMessage());
        }
    } catch (error) {
        console.error('Error in sendLlmRequest:', error);
        await message.reply(getRandomErrorMessage());
    }
}

function buildRequestBody(historyMessages, userMessage, message) {
    let requestBody = { model: MODEL_TO_USE, messages: [{ role: 'system', content: SYSTEM_PROMPT }] };
    let currentSize = JSON.stringify(requestBody).length;

    for (let msg of historyMessages) {
        const formattedMessage = `${msg.username}: ${msg.content}`;
        const messageObj = { role: 'user', content: formattedMessage };
        currentSize += JSON.stringify(messageObj).length;

        if (currentSize <= MAX_CONTENT_LENGTH - MAX_RESPONSE_SIZE) {
            requestBody.messages.push(messageObj);
        } else {
            break;
        }
    }

    const userFormattedMessage = `${message.author.username}: ${userMessage}`;
    requestBody.messages.push({ role: 'user', content: userFormattedMessage });
    return requestBody;
}

function processResponse(data) {
    if (data && data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
    }
    return 'No response from the server.';
}

async function messageHandler(message) {
    if (message.author.bot && !BOT_TO_BOT_MODE) return;

    const { shouldReply, isDirectMention } = responseDecider.shouldReplyToMessage(message.client.user.id, message);

    if (shouldReply || isDirectMention) {
        await sendLlmRequest(message);
    }
}

module.exports = messageHandler;
