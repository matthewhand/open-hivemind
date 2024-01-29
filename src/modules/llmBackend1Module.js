// llmBackend1Module.js
const axios = require('axios');
const { config } = require('../utils/configUtils');

async function sendToBackend(message, includeHistory) {
    // Construct the request payload here, including the history if needed
    const payload = {
        message: message.content,
        history: includeHistory ? /* fetch and format history */ : []
    };

    try {
        const response = await axios.post(config.llmBackendConfig.endpoint, payload);
        return response.data; // or however the backend returns the response
    } catch (error) {
        console.error(`Error sending to LLM backend: ${error}`);
        // Handle the error appropriately
    }
}

module.exports = { sendToBackend };
