const { GPT } = require('openai');
const logger = require('./logger'); // Assumed logger utility

/**
 * Tokenizes the given text using OpenAI's GPT and ensures it is within the token limit.
 * @param {string} text - The text to be tokenized.
 * @param {number} tokenLimit - The maximum number of tokens allowed (default 4000).
 * @returns {string} - The tokenized text within the specified limit.
 */
async function tokenize(text, tokenLimit = 4000) {
    try {
        const gpt = new GPT();
        const tokenized = await gpt.tokenize({ text: text });

        if (tokenized.tokens.length > tokenLimit) {
            logger.info(`Token count exceeded the limit of ${tokenLimit}. Truncating.`);
            const truncatedText = await gpt.detokenize({ tokens: tokenized.tokens.slice(0, tokenLimit) });
            return truncatedText;
        }

        return text;
    } catch (error) {
        logger.error(`Error in tokenization: ${error.message}`);
        throw new Error('Failed to tokenize the text.');
    }
}

module.exports = { tokenize };
