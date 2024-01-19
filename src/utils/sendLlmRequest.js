const axios = require('axios');
const fetchConversationHistory = require('./fetchConversationHistory');

const MAX_CONTENT_LENGTH = parseInt(process.env.LLM_MAX_CONTEXT_SIZE || '4096', 10);
const MAX_RESPONSE_SIZE = parseInt(process.env.LLM_MAX_RESPONSE_SIZE || '2048', 10);
const MODEL_TO_USE = process.env.LLM_MODEL || 'mistral-7b-instruct';
const LLM_URL = process.env.LLM_ENDPOINT_URL;
const SYSTEM_PROMPT = process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.';
const BOT_TO_BOT_MODE = process.env.BOT_TO_BOT_MODE !== 'false';
const API_KEY = process.env.LLM_API_KEY;

// This function should be in the same file, above the sendLlmRequest function
function isValidRequestBody(body) {
    // Example validation rules (extend as needed)
    if (!body.model || typeof body.model !== 'string') return false;
    if (!Array.isArray(body.messages)) return false;

    for (const message of body.messages) {
        if (!message.role || !['user', 'system'].includes(message.role)) return false;
        if (typeof message.content !== 'string') return false;
    }

    return true;
}

async function sendLlmRequest(message) {
    if (!LLM_URL) {
        console.error('LLM endpoint URL is not set.');
        return;
    }

    if (message.author.bot && !BOT_TO_BOT_MODE) return; // Ignore other bots unless BOT_TO_BOT_MODE is true

    let typingTimeout = startTypingIndicator(message.channel);

    try {
        console.debug("sendLlmRequest: Fetching conversation history...");
        const historyMessages = await fetchConversationHistory(message.channel);

        console.debug("Preparing LLM request body...");
        let requestBody = buildRequestBody(historyMessages, message.content);

        if (!isValidRequestBody(requestBody)) {
            console.error('Invalid request body');
            return;
        }

        console.debug("Sending request to LLM...");
        const response = await axios.post(LLM_URL, requestBody, buildHeaders());
        if (response.status !== 200) handleFailedResponse(response);

        console.debug("LLM request successful. Processing response...");
        const replyContent = processResponse(response.data);
        message.reply(replyContent);
    } catch (error) {
        console.error('Error in sendLlmRequest:', error);
    } finally {
        clearTimeout(typingTimeout);
    }
}

function startTypingIndicator(channel) {
    const sendTyping = () => channel.sendTyping();
    return setInterval(sendTyping, randomDelay(10000, 20000));
}

function buildRequestBody(historyMessages, userMessage) {
    let requestBody = { model: MODEL_TO_USE, messages: [{ role: 'system', content: SYSTEM_PROMPT }] };

    for (let msg of historyMessages) {
        const messageObj = { role: 'user', content: msg };
        requestBody.messages.push(messageObj);
        const currentSize = JSON.stringify(requestBody).length;

        if (currentSize > MAX_CONTENT_LENGTH - MAX_RESPONSE_SIZE) {
            requestBody.messages.pop(); // Remove last message if over limit
            break;
        }
    }

    requestBody.messages.push({ role: 'user', content: userMessage });
    console.debug(`Final request body: ${JSON.stringify(requestBody, null, 2)}`);
    return requestBody;
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
    return headers;
}

function handleFailedResponse(response) {
    console.error(`Request failed with status ${response.status}: ${response.statusText}`);
    console.debug(`Response body on failure: ${JSON.stringify(response.data)}`);
}

function processResponse(data) {
    if (!data || !data.choices || data.choices.length === 0) {
        console.debug("No response or empty response from the server.");
        return 'No response from the server.';
    }
    let replyContent = data.choices[0].message.content;
    return (typeof replyContent === 'string' ? replyContent.trim() : JSON.stringify(replyContent)).substring(0, 2000);
}

module.exports = { sendLlmRequest };