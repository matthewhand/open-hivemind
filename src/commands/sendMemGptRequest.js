const axios = require('axios');

async function sendMemGptRequest(agentId, message) {
    const requestUrl = `${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`;
    const userId = process.env.MEMGPT_USER_ID; // Pull the user ID from an environment variable

    try {
        const response = await axios.post(requestUrl, {
            agent_id: agentId,
            user_id: userId,
            message: message
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MEMGPT_API_KEY}` }
        });

        console.log(`Response from MemGPT: ${response.data}`);
        return response.data;
    } catch (error) {
        console.error(`Error sending request to MemGPT: ${error}`);
        throw error;
    }
}

module.exports = sendMemGptRequest;
