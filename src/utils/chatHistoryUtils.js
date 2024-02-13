// src/utils/chatHistoryUtils.js
const { encode } = require('gpt-tokenizer');
const logger = require('./logger');

const trimMessagesByTokenCount = (messages, newPrompt, maxTokens) => {
    let totalTokens = encode(newPrompt).length;
    const trimmedMessages = [];

    for (const message of messages.reverse()) {
        const messageTokens = encode(message.content);
        if (totalTokens + messageTokens.length > maxTokens) break;
        trimmedMessages.unshift(message); // Ensure chronological order
        totalTokens += messageTokens.length;
    }

    logger.debug(`Trimmed history based on token count: ${trimmedMessages.length} messages retained`);
    return trimmedMessages;
};

module.exports = { trimMessagesByTokenCount };
