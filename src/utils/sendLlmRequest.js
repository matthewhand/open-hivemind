const axios = require('axios');
const fetchConversationHistory = require('./fetchConversationHistory');

const MAX_CONTENT_LENGTH = process.env.LLM_MAX_CONTEXT_SIZE ? parseInt(process.env.LLM_MAX_CONTEXT_SIZE, 10) : 4096;
const MAX_RESPONSE_SIZE = process.env.LLM_MAX_RESPONSE_SIZE ? parseInt(process.env.LLM_MAX_RESPONSE_SIZE, 10) : 2048;

async function sendLlmRequest(message) {
    let typingTimeout;

    const sendTypingWithRandomDelay = () => {
        message.channel.sendTyping();
        const delay = 10000 + Math.random() * 10000;
        typingTimeout = setTimeout(sendTypingWithRandomDelay, delay);
    };

    try {
        console.debug("sendLlmRequest: Starting request process...");

        const userMessage = message.content;

        const modelToUse = process.env.LLM_MODEL || 'mistral-7b-instruct';
        console.debug(`Model selected: ${modelToUse}`);

        console.debug("Fetching conversation history...");
        const historyMessages = await fetchConversationHistory(message.channel);
        console.debug(`Fetched ${historyMessages.length} messages from history.`);

        console.debug("Preparing LLM request body...");
        const maxTotalSize = MAX_CONTENT_LENGTH - MAX_RESPONSE_SIZE;
        let requestBody = {
            model: modelToUse,
            messages: [{ role: 'system', content: process.env.LLM_SYSTEM || 'You are a helpful assistant.' }]
        };

        let currentSize = JSON.stringify(requestBody).length;

        for (let msg of historyMessages) {
            let msgSize = JSON.stringify({ role: 'user', content: msg }).length;
            if (currentSize + msgSize > maxTotalSize) {
                console.debug("Maximum context size reached. Stopping addition of history messages.");
                break;
            }
            requestBody.messages.push({ role: 'user', content: msg });
            currentSize += msgSize;
        }

        console.debug(`Total request size: ${currentSize} bytes`);

        requestBody.messages.push({ role: 'user', content: userMessage });

        sendTypingWithRandomDelay();

        const headers = { 'Content-Type': 'application/json' };
        if (process.env.LLM_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;
        }

        console.debug("Sending request to LLM...");
        const response = await axios.post(process.env.LLM_URL, requestBody, { headers: headers });
        clearTimeout(typingTimeout);

        if (response.status !== 200) {
            console.error(`Request failed with status ${response.status}: ${response.statusText}`);
            console.debug(`Response body on failure: ${JSON.stringify(response.data)}`);
            return;
        }

        console.debug("LLM request successful. Processing response...");
        const responseData = response.data;
        if (responseData && responseData.choices && responseData.choices.length > 0) {
            let replyContent = responseData.choices[0].message.content;

            // Additional debug to check the type and existence of replyContent
            console.debug(`Type of replyContent: ${typeof replyContent}`);
            if (replyContent === undefined) {
                console.debug("replyContent is undefined. Full responseData: " + JSON.stringify(responseData));
                message.reply('Received an undefined response.');
                return;
            }

            replyContent = typeof replyContent === 'string' ? replyContent.trim() : JSON.stringify(replyContent);

            console.debug(`Response received. Length: ${replyContent.length} characters`);
            if (replyContent.length > 2000) {
                const chunks = replyContent.match(/.{1,2000}/g);
                for (let chunk of chunks) {
                    message.reply(chunk);
                }
            } else {
                message.reply(replyContent);
            }
        } else {
            console.debug("No response or empty response from the server.");
            console.debug("Full responseData: " + JSON.stringify(responseData));
            message.reply('No response from the server.');
        }
    } catch (error) {
        clearTimeout(typingTimeout);
        console.error('Error in sendLlmRequest:', error);
        console.debug(`Error details: ${error.message}`);
    }
}

module.exports = { sendLlmRequest };
