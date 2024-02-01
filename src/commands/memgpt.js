const axios = require('axios');
const { fetchConversationHistory, sendLlmRequest } = require('../utils');

async function handleMemGptRequest(message, action = '', args) {
    const agentId = action || process.env.MEMGPT_AGENT_ID;
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
        const requestUrl = `${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`;
        console.debug(`Sending request to ${requestUrl} with payload:`, query);

        const response = await axios.post(requestUrl, {
            agent_id: agentId,
            user_id: userId,
            message: query
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MEMGPT_API_KEY}` }
        });

        console.debug(`Received response:`, response.data);
        const memGptResponse = response.data.messages.map(msg => msg.assistant_message || msg.internal_monologue).join('\n');
        message.reply(memGptResponse);
    } catch (error) {
        console.error(`Error in handleMemGptRequest:`, error);
        // Detailed error handling
        if (error.response) {
            console.error(error.response.data);
            console.error(error.response.status);
            console.error(error.response.headers);
        } else if (error.request) {
            console.error(error.request);
        } else {
            console.error('Error', error.message);
        }
        message.reply('An error occurred while processing your MemGPT request. Please try again later.');
    }
}

module.exports = { handleMemGptRequest };
