const sendResponse = require('./sendResponse');

/**
 * Sends a message to a specified channel.
 * @param {string} channelId - The ID of the channel to send the message to.
 * @param {string} messageText - The text of the message to be sent.
 * @returns {Promise<void>}
 */
async function sendMessage(channelId, messageText) {
    await sendResponse(channelId, messageText);
}

module.exports = sendMessage;
