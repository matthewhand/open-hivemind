import logger from '@utils/logger';

/**
 * Abstract class representing a standardized message format.
 * This class is intended to be extended with specific implementations as needed.
 */
export abstract class IMessage {
    protected data: any;

    constructor(data: any) {
        if (new.target === IMessage) {
            throw new TypeError('Cannot construct IMessage instances directly');
        }
        this.data = data;
        logger.debug('IMessage initialized with data: ' + JSON.stringify(data));
    }

    /**
     * Retrieves the message ID.
     * @returns {string} The message ID.
     */
    abstract getMessageId(): string;

    /**
     * Retrieves the text content of the message.
     * @returns {string} The text content.
     */
    abstract getText(): string;

    /**
     * Retrieves the channel ID where the message was sent.
     * @returns {string} The channel ID.
     */
    abstract getChannelId(): string;

    /**
     * Retrieves the author ID of the message.
     * @returns {string} The author ID.
     */
    abstract getAuthorId(): string;

    /**
     * Checks if the message is a reply to the bot.
     * @returns {boolean} True if the message is a reply to the bot, false otherwise.
     */
    isReplyToBot(): boolean {
        return false;
    }

    /**
     * Checks if the message mentions a specific user.
     * @param {string} userId - The ID of the user to check for mentions.
     * @returns {boolean} True if the user is mentioned, false otherwise.
     */
    abstract mentionsUsers(userId: string): boolean;

    /**
     * Checks if the message is from a bot.
     * @returns {boolean} True if the message is from a bot, false otherwise.
     */
    abstract isFromBot(): boolean;
}
