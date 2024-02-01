const { fetchConversationHistory, sendLlmRequest } = require('../utils');
const sendMemGptRequest = require('./sendMemGptRequest'); // Import sendMemGptRequest utility

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
                errorMessage = await sendLlmRequest(message, prompt);
            } catch (err) {
                console.error('Error fetching conversation history or generating dynamic error message:', err);
                errorMessage = 'An error occurred while generating the error message.';
            }
        }

        message.reply(errorMessage);
        return;
    }

    try {
        // Use sendMemGptRequest utility to make API request
        const memGptResponseData = await sendMemGptRequest(agentId, userId, query);

        // Process and reply with the MemGPT response
        const memGptResponse = memGptResponseData.messages.map(msg => msg.assistant_message || msg.internal_monologue).join('\n');
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
