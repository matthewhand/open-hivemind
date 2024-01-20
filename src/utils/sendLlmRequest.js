const axios = require('axios');
const fetchConversationHistory = require('./fetchConversationHistory');

const MAX_CONTENT_LENGTH = parseInt(process.env.LLM_MAX_CONTEXT_SIZE || '4096', 10);
const MAX_RESPONSE_SIZE = parseInt(process.env.LLM_MAX_RESPONSE_SIZE || '2048', 10);
const MODEL_TO_USE = process.env.LLM_MODEL || 'mistral-7b-instruct';
const LLM_URL = process.env.LLM_ENDPOINT_URL;
const SYSTEM_PROMPT = process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.';
const BOT_TO_BOT_MODE = process.env.BOT_TO_BOT_MODE !== 'false';
const API_KEY = process.env.LLM_API_KEY;

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
            console.debug("Maximum context size reached.");
            break;
        }
    }

    const userFormattedMessage = `${message.author.username}: ${userMessage}`;
    requestBody.messages.push({ role: 'user', content: userFormattedMessage });
    
    return requestBody;
}

async function sendLlmRequest(message) {
    if (!LLM_URL) {
        console.error('LLM endpoint URL is not set.');
        return;
    }

    if (message.author.bot && !BOT_TO_BOT_MODE) return;

    try {
        const historyMessages = await fetchConversationHistory(message.channel);
        const requestBody = buildRequestBody(historyMessages, message.content, message);

        console.debug("Outgoing payload:", JSON.stringify(requestBody, null, 2));

        const response = await axios.post(LLM_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            }
        });

        if (response.status !== 200) {
            console.error(`Request failed with status ${response.status}: ${response.statusText}`);
            message.reply('Error communicating with the server.');
            return;
        }

        let replyContent = processResponse(response.data);
        sendReplyInChunks(message, replyContent).then(() => {
            // Log the time of this reply
            responseDecider.logMention(message.channel.id, Date.now());
        });

    } catch (error) {
        console.error('Error in sendLlmRequest:', error);
    }
}

function sendReplyInChunks(message, replyContent) {
    if (replyContent.length <= 2000) {
        return message.reply(replyContent);
    } else {
        const chunks = replyContent.match(/[\s\S]{1,2000}/g);
        const promises = chunks.map(chunk => message.reply(chunk));
        return Promise.all(promises);
    }
}

function processResponse(data) {
    if (!data || !data.choices || data.choices.length === 0) {
        console.debug("No response or empty response from the server.");
        return 'No response from the server.';
    }

    const choice = data.choices[0];

    // Hypothetical metadata handling
    if (choice.metadata && choice.metadata.unsolicitedResponseChance) {
        console.debug(`Unsolicited response chance: ${choice.metadata.unsolicitedResponseChance}`);
    }

    let replyContent = choice.message.content;
    return (typeof replyContent === 'string' ? replyContent.trim() : JSON.stringify(replyContent)).substring(0, 2000);
}

module.exports = { sendLlmRequest };
