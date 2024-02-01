const axios = require('axios');

async function sendMemGptRequest(agentId, message) {
    const requestUrl = `${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`;
    const userId = process.env.MEMGPT_USER_ID;
    const memGptApiKey = process.env.MEMGPT_API_KEY;
    const headers = {};

    // Add Authorization header only if MEMGPT_API_KEY is defined
    if (memGptApiKey) {
        headers['Authorization'] = `Bearer ${memGptApiKey}`;
    } else {
        console.warn('MEMGPT_API_KEY is not defined. Proceeding without Authorization header.');
    }

    try {
        const response = await axios.post(requestUrl, {
            agent_id: agentId,
            user_id: userId,
            message: message
        }, { headers });

        console.debug('Request sent to MemGPT:', { agentId, userId, message });
        console.debug('Response received from MemGPT:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending request to MemGPT:', error);
        // Detailed error logging
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request data:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
        throw error;
    }
}

module.exports = sendMemGptRequest;
