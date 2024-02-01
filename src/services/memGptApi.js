// services/memGptApi.js
const axios = require('axios');

async function sendMemGptRequest(agentId, userId, message) {
    const payload = {
        type: 'user_message',
        message: message,
        time: new Date().toISOString()
    };

    const requestUrl = `${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`;
    console.debug(`Sending request to ${requestUrl} with payload:`, payload);

    return await axios.post(requestUrl, {
        agent_id: agentId,
        user_id: userId,
        payload: payload
    }, {
        headers: { 'Authorization': `Bearer ${process.env.MEMGPT_API_KEY}` }
    });
}

module.exports = { sendMemGptRequest };
