const axios = require('axios');
const { configUtils, fetchConversationHistory, sendLlmRequest } = require('../utils');

async function handleMemGptRequest(message, action = '', args) {
    const agent = action || configUtils.config.defaultMemGptAgent;
    const query = args.trim();

    if (!query) {
        let errorMessage = 'Please provide a query for MemGPT.';

        if (configUtils.config.dynamicErrorMessageEnabled) {
            const history = await fetchConversationHistory(message.channel);
            const prompt = `Given this conversation context: ${history.join(' ')}\nGenerate a helpful error message for a missing MemGPT query:`;
            errorMessage = await sendLlmRequest(prompt);
        }

        message.reply(errorMessage);
        return;
    }

    try {
        const response = await axios.post(`${configUtils.config.MEMGPT_ENDPOINT_URL}/api/agents/message`, {
            agent_id: agent,
            message: query
        }, {
            headers: { 'Authorization': `Bearer ${configUtils.config.MEMGPT_API_KEY}` }
        });

        const memGptResponse = response.data.messages.join('\n');
        message.reply(memGptResponse);
    } catch (error) {
        console.error(`Error in handleMemGptRequest: ${error.message}`);
        message.reply('An error occurred while processing your MemGPT request.');
    }
}

module.exports = { handleMemGptRequest };
