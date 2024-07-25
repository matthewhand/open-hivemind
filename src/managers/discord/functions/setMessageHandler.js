/**
 * Sets a callback function to handle incoming Discord messages.
 * @param {Function} messageHandlerCallback - The function to be called with the message data.
 */
function setMessageHandler(messageHandlerCallback) {
    if (typeof messageHandlerCallback !== 'function') {
        throw new Error('messageHandlerCallback must be a function');
    }
    this.messageHandler = messageHandlerCallback;
}

module.exports = setMessageHandler;
