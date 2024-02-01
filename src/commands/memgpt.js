const axios = require('axios');
const { fetchConversationHistory, sendLlmRequest } = require('../utils');

async function handleMemGptRequest(message, action = '', args) {
    const agent = action || process.env.MEMGPT_AGENT; // Default agent from environment variable
    const query = args.trim();

    if (!query) {
        let errorMessage = 'Please provide a query for MemGPT.';

        // Checking if dynamic error messages are enabled
        if (process.env.DYNAMIC_ERROR_MESSAGE_ENABLED === 'true') {
            const history = await fetchConversationHistory(message.channel);
            const prompt = `Given this conversation context: ${history.join(' ')}\nGenerate a helpful error message for a missing MemGPT query:`;
            errorMessage = await sendLlmRequest(prompt);
        }

        message.reply(errorMessage);
        return;
    }

    try {
        const response = await axios.post(`${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`, {
            agent_id: agent,
            message: query
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MEMGPT_API_KEY}` }
        });

        const memGptResponse = response.data.messages.join('\n');
        message.reply(memGptResponse);
    } catch (error) {
        console.error(`Error in handleMemGptRequest: ${error.message}`);
        message.reply('An error occurred while processing your MemGPT request.');
    }
}

module.exports = { handleMemGptRequest };
