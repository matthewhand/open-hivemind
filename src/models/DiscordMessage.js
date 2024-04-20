// src/models/DiscordMessage.js
const IMessage = require('../interfaces/IMessage');
const logger = require('../utils/logger');
const constants = require('../config/constants'); // Ensure this path is correct

/**
 * Represents a Discord message, extending a generic message interface.
 * This class encapsulates the properties and behaviors of a Discord message,
 * providing methods to access its content, channel ID, author ID, and more,
 * with added error handling and logging for robustness.
 */
class DiscordMessage extends IMessage {
    /**
     * Constructs an instance of DiscordMessage.
     * @param {Object} message - The raw message object from Discord.
     * @param {Object|null} repliedMessage - The message this message is replying to, if any.
     * @param {boolean|null} isBot - Indicates explicitly if the message is from a bot.
     */
    constructor(message, repliedMessage = null, isBot = null) {
        super(message);
    
        if (!message) {
            logger.error('DiscordMessage constructor: message parameter is undefined or null.');
            throw new Error('Message parameter is required');
        }
    
        // logger.debug(`DiscordMessage constructor: Initializing with message ID: ${message.id}`);
    
        this.message = message;
        this.repliedMessage = repliedMessage;
        this.isBotExplicitlySet = isBot;

        if (!this.message.content) {
            logger.error('[DiscordMessage]: message content is undefined or null.');
            throw new Error('Message content is required');
        }

        // Initialize essential properties from the message object
        this.id = message.id;
        this.content = message.content;
        this.channelId = message.channelId;
        this.authorId = message.author ? message.author.id : 'unknown';
        this.isBot = (isBot !== null) ? isBot : !!message.author.bot;
    }

    /**
     * Retrieves the message ID.
     * @returns {string} The message ID.
     */
    getMessageId() {
        return this.id;
    }

    /**
     * Retrieves the textual content of the message.
     * @returns {string} The message content, or an empty string if undefined or null.
     */
    getText() {
        return this.content || '';
    }

    /**
     * Retrieves the ID of the channel the message was sent in.
     * @returns {string} The channel ID.
     */
    getChannelId() {
        return this.channelId || '';
    }

    /**
     * Retrieves the ID of the author of the message.
     * @returns {string} The author ID.
     */
    getAuthorId() {
        return this.authorId;
    }

    /**
     * Determines if the message was sent by a bot.
     * This can be explicitly set or derived from the message's author.bot flag.
     * @returns {boolean} True if the message is from a bot, false otherwise.
     */
    isFromBot() {
        return this.isBot;
    }

    /**
     * Checks if the message mentions specific users.
     * @param {string|string[]} userIds - A single user ID or an array of user IDs to check for mentions.
     * @returns {boolean} True if any of the specified users are mentioned in the message.
     */
    mentionsUsers(userIds = [constants.CLIENT_ID]) {
        const mentionsArray = Array.isArray(userIds) ? userIds : [userIds];
        const mentionedUserIds = this.message.mentions.users.map(user => user.id);
        return mentionsArray.some(userId => mentionedUserIds.includes(userId));
    }

    /**
     * Determines if the message is a reply to another message.
     * @returns {boolean} True if the message is a reply and specifically to the bot.
     */
    isReply() {
        const isReplyToBot = this.repliedMessage && this.repliedMessage.authorId === constants.CLIENT_ID;
        return !!this.message.reference && isReplyToBot;
    }
    
}

module.exports = DiscordMessage;
