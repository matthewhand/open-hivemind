const axios = require('axios');
const { fetchConversationHistory, sendLlmRequest } = require('../utils');

/**
 * Handles the MemGPT request from the Discord message.
 *
 * @param {Object} message - The Discord message object.
 * @param {string} action - The specific action to perform (if any).
 * @param {string} args - The arguments provided in the message.
 */
async function handleMemGptRequest(message, action = '', args) {
    console.debug(`Processing MemGPT request for message: ${message.content}`);

    // Retrieve environment variables for agent and user IDs
    const agent = action || process.env.MEMGPT_AGENT_ID;
    const userId = process.env.MEMGPT_USER_ID;
    const query = args.trim();

    // Check if the query is empty and handle accordingly
    if (!query) {
        console.debug('No query provided, generating error message...');
        let errorMessage = 'Please provide a query for MemGPT.';
    
        if (process.env.DYNAMIC_ERROR_MESSAGE_ENABLED !== 'false') {
            try {
                const history = await fetchConversationHistory(message.channel);
                const prompt = `Given this conversation context: ${history.join(' ')}\nGenerate a helpful error message for a missing MemGPT query:`;
                errorMessage = await sendLlmRequest(prompt);
            } catch (err) {
                console.error('Error fetching conversation history or generating dynamic error message:', err);
                errorMessage = 'An error occurred while generating the error message.';
            }
        }
    
        message.reply(errorMessage);
        return;
    }

    try {
        console.debug('Sending request to MemGPT API...');
        const response = await axios.post(`${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`, {
            agent_id: agent,
            user_id: userId,
            message: query
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MEMGPT_API_KEY}` }
        });

        console.debug('Received response from MemGPT API, sending back to Discord...');
        const memGptResponse = response.data.messages.join('\n');
        message.reply(memGptResponse);
    } catch (error) {
        console.error(`Error in handleMemGptRequest: ${error}`);
        message.reply('An error occurred while processing your MemGPT request. Please try again later.');
    }
}

module.exports = { handleMemGptRequest };
