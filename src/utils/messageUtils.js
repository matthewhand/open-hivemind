// src/utils/messageUtils.js
const axios = require('axios');
const logger = require('./logger');
const { splitMessage } = require('./common');
const loadServerPolicy = require('./loadServerPolicy');
const configurationManager = require('../config/configurationManager');
const { aliases } = require('../config/aliases');

// Enhanced sendLlmRequest function with prioritized logging
async function sendLlmRequest(message, prompt) {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');

    // Logging the initiation of LLM request
    logger.info(`Sending LLM request for model: ${LLM_MODEL} with prompt: ${prompt.substring(0, 50)}...`);

    try {
        const response = await axios.post(LLM_ENDPOINT_URL, {
            prompt: prompt,
            model: LLM_MODEL,
        }, {
            headers: { 'Authorization': `Bearer ${configurationManager.getConfig('LLM_API_KEY')}` }
        });

        // Check and log if the response is successful
        if (response.data) {
            const replyContent = response.data.choices[0].text.trim();
            logger.info(`LLM request successful. Response length: ${replyContent.length} characters`);

            const messagesToSend = splitMessage(replyContent, 2000);
            for (const msg of messagesToSend) {
                await message.channel.send(msg);
            }
        } else {
            // Log if response is successful but missing expected data
            logger.warn('LLM request returned a successful response but did not contain expected data');
        }
    } catch (error) {
        // Detailed logging when an error occurs
        logger.error(`Error in sendLlmRequest: ${error.message}. Prompt: ${prompt.substring(0, 50)}...`, error);
    }
}


async function fetchConversationHistory(channel) {
    try {
        const limit = configurationManager.getConfig('historyFetchLimit') || 50;
        const messages = await channel.messages.fetch({ limit });
        return messages.map(message => ({
            content: message.content,
            username: message.author.username,
            timestamp: message.createdTimestamp,
            userId: message.author.id,
        })).reverse();
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        return [];
    }
}

async function shouldUserBeBanned(chatHistory, userId) {
    const serverPolicy = loadServerPolicy(); // Ensure this function or module is correctly set up
    const prompt = `Should user ${userId} be banned based on server policy?`;
    try {
        const response = await axios.post(configurationManager.getConfig('LLM_ENDPOINT_URL'), {
            model: "text-davinci-003",
            prompt: `${chatHistory}\n\nServer Policy:\n${serverPolicy}\n\n${prompt}`,
            max_tokens: 1024,
        }, {
            headers: { 'Authorization': `Bearer ${configurationManager.getConfig('LLM_API_KEY')}` }
        });

        return response.status === 200 ? response.data.choices[0].text.trim() : 'Error: Unable to process decision';
    } catch (error) {
        logger.error(`Error in LLM communication: ${error.message}`);
        return 'Error: Communication failure';
    }
}

async function sendFollowUpRequest(message, aliasCommand) {
    const reflectivePrompt = `Given the conversation, how might the command !${aliasCommand} provide further insights?`;
    try {
        const response = await axios.post(configurationManager.getConfig('LLM_ENDPOINT_URL'), {
            model: configurationManager.getConfig('LLM_MODEL'),
            prompt: reflectivePrompt,
            max_tokens: 200
        }, {
            headers: { 'Authorization': `Bearer ${configurationManager.getConfig('LLM_API_KEY')}` }
        });

        const suggestion = response.data.choices[0].text.trim();
        await message.channel.send(`LLM Suggestion: ${suggestion}`);
    } catch (error) {
        logger.error(`Error in sendFollowUpRequest: ${error.message}`);
    }
}

function scheduleFollowUpRequest(message) {
    const randomAlias = Object.keys(aliases)[Math.floor(Math.random() * Object.keys(aliases).length)];
    const delay = configurationManager.getConfig('FOLLOW_UP_MIN_DELAY') + Math.random() * (configurationManager.getConfig('FOLLOW_UP_MAX_DELAY') - configurationManager.getConfig('FOLLOW_UP_MIN_DELAY'));
    setTimeout(() => sendFollowUpRequest(message, randomAlias), delay);
}

module.exports = { sendLlmRequest, fetchConversationHistory, scheduleFollowUpRequest, shouldUserBeBanned };
