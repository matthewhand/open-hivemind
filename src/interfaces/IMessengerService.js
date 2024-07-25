const logger = require('../utils/logger');

/**
 * Interface for messenger services in the application.
 * @interface IMessengerService
 */
class IMessengerService {
    constructor() {
        if (this.constructor === IMessengerService) {
            throw new TypeError('Cannot construct IMessengerService instances directly');
        }
        logger.debug('IMessengerService instantiated');
    }

    /**
     * Fetches the chat history for a given channel.
     * @param {string} channelId - The ID of the channel.
     * @returns {Promise} The chat history.
     */
    async fetchChatHistory(channelId) {
        logger.debug('fetchChatHistory called with channelId: ' + channelId);
        throw new Error('Method \'fetchChatHistory()\' must be implemented.');
    }

    /**
     * Sends a response message to a given channel.
     * @param {string} channelId - The ID of the channel.
     * @param {string} message - The message to send.
     * @returns {Promise} The result of sending the message.
     */
    async sendResponse(channelId, message) {
        logger.debug('sendResponse called with channelId: ' + channelId + ', message: ' + message);
        throw new Error('Method \'sendResponse()\' must be implemented.');
    }
}

module.exports = IMessengerService;
