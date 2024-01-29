// chatCommand.js
const { sendToBackend } = require('../modules/llmBackend1Module');
const { config } = require('../utils/configUtils');

module.exports = async function chatCommand(message) {
    // Determine if history should be included based on config
    const includeHistory = config.llmBackendConfig.includeHistory;

    // Send the message to the backend
    const backendResponse = await sendToBackend(message, includeHistory);

    // Handle the backend response (e.g., reply to the user)
    if (backendResponse) {
        await message.reply(backendResponse);
    } else {
        // Handle no response or error scenario
        await message.reply('Sorry, there was an issue processing your request.');
    }
};
