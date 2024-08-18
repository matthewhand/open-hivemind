import logger from './logger';

/**
 * Abstract class representing a messenger service interface.
 */
export abstract class IMessengerService {
    constructor() {
        if (new.target === IMessengerService) {
            throw new TypeError('Cannot construct IMessengerService instances directly');
        }
        logger.debug('IMessengerService instantiated');
    }

    /**
     * Fetches the chat history for a given channel.
     * @param {string} channelId - The ID of the channel.
     * @returns {Promise<any>} The chat history.
     */
    abstract fetchChatHistory(channelId: string): Promise<any>;

    /**
     * Sends a response message to a given channel.
     * @param {string} channelId - The ID of the channel.
     * @param {string} message - The message to send.
     * @returns {Promise<any>} The result of sending the message.
     */
    abstract sendResponse(channelId: string, message: string): Promise<any>;
}
