const axios = require('axios');
const { fetchConversationHistory, sendLlmRequest } = require('../utils');

async function handleMemGptRequest(message, action = '', args) {
    // Use the MEMGPT_AGENT_ID as the default agent ID
    const agent = action || process.env.MEMGPT_AGENT_ID;
    const userId = process.env.MEMGPT_USER_ID; // Add user ID from environment variables
    const query = args.trim();

    if (!query) {
        let errorMessage = 'Please provide a query for MemGPT.';
    
        // Enable dynamic error messages unless the environment variable is explicitly set to 'false'
        if (process.env.DYNAMIC_ERROR_MESSAGE_ENABLED !== 'false') {
            const history = await fetchConversationHistory(message.channel);
            const prompt = `Given this conversation context: ${history.join(' ')}\nGenerate a helpful error message for a missing MemGPT query:`;
            errorMessage = await sendLlmRequest(prompt);
        }
    
        message.reply(errorMessage);
        return;
    }
    
    try {
        // Adjust the POST request to include the user ID
        const response = await axios.post(`${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`, {
            agent_id: agent,
            user_id: userId, // Add user ID to the request body
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
