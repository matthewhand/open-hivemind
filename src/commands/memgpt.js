const axios = require('axios');
const { fetchConversationHistory, sendLlmRequest } = require('../utils');

async function handleMemGptRequest(message, action = '', args) {
    const agent = action || process.env.MEMGPT_AGENT_ID;
    const userId = process.env.MEMGPT_USER_ID;
    const query = args.trim();

    if (!query) {
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
        const currentTime = new Date().toISOString();

        const payload = {
            type: 'user_message',
            message: query,
            time: currentTime
        };

        const response = await axios.post(`${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`, {
            agent_id: agent,
            user_id: userId,
            payload: payload // Adjusted payload structure
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MEMGPT_API_KEY}` }
        });

        const memGptResponse = response.data.messages.join('\n');
        message.reply(memGptResponse);
    } catch (error) {
        console.error(`Error in handleMemGptRequest: ${error}`);
        message.reply('An error occurred while processing your MemGPT request. Please try again later.');
    }
}

module.exports = { handleMemGptRequest };
