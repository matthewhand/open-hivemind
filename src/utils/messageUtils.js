// src/utils/messageUtils.js
const axios = require('axios');
const { encode, decode } = require('gpt-tokenizer');
const logger = require('./logger');
const configurationManager = require('../config/configurationManager');

// Helper function to trim the history to fit within the max token count
function trimHistoryToFit(history, newPrompt, maxTokens) {
    let combinedText = history.map(msg => msg.content).join('\n') + '\n' + newPrompt;
    let encoded = encode(combinedText);
    
    // Calculate the max tokens allowed for history
    let maxHistoryTokens = maxTokens - encode(newPrompt).length;
    
    while (encoded.length > maxHistoryTokens) {
        history.shift(); // Remove the oldest messages from history
        combinedText = history.map(msg => msg.content).join('\n') + '\n' + newPrompt;
        encoded = encode(combinedText);
    }

    return history;
}

async function sendLlmRequest(message) {
    const endpointUrl = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const model = configurationManager.getConfig('LLM_MODEL');
    const apiKey = configurationManager.getConfig('LLM_API_KEY');
    const maxTokens = configurationManager.getConfig('MAX_CONTENT_LENGTH') || 2048; // Default to 2048 if not set

    const history = await fetchConversationHistory(message.channel);
    const newPrompt = message.content; // Assuming the new message is the prompt

    // Adjust history to fit within max token count
    const trimmedHistory = trimHistoryToFit(history, newPrompt, maxTokens);

    const payload = {
        model,
        prompt: [
            ...trimmedHistory.map(msg => ({ role: msg.role, content: msg.content })),
            { role: "user", content: newPrompt }
        ],
    };

    try {
        logger.debug(`Sending LLM request to ${endpointUrl} with payload: ${JSON.stringify(payload)}`);
        const response = await axios.post(endpointUrl, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Process the response from LLM
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            await message.channel.send(response.data.choices[0].message.content);
        } else {
            logger.warn('LLM request did not return the expected data structure.', response.data);
        }
    } catch (error) {
        logger.error(`Error sending LLM request: ${error}`, error);
    }
}

async function fetchConversationHistory(channel) {
    try {
        const limit = configurationManager.getConfig('HISTORY_FETCH_LIMIT') || 50;
        const fetchedMessages = await channel.messages.fetch({ limit });
        const messagesArray = Array.from(fetchedMessages.values());
        return messagesArray.map(msg => ({
            role: msg.author.bot ? 'assistant' : 'user',
            content: msg.content,
        })).reverse();
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        throw error;
    }
}

function scheduleFollowUpRequest(message) {
    logger.info(`Scheduled follow-up for message ${message.id}`);
}

module.exports = {
    sendLlmRequest,
    fetchConversationHistory,
    scheduleFollowUpRequest,
};
