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
    
        logger.debug(`DiscordMessage constructor: Initializing with message ID: ${message.id}`);
    
        this.message = message;
        this.repliedMessage = repliedMessage;
        this.isBotExplicitlySet = isBot;

        if (!this.message.content) {
            logger.error('[DiscordMessage]: message content is undefined or null.');
            throw new Error('Message content is required');
        }
    }

    /**
     * Retrieves the message ID.
     * @returns {string} The message ID.
     */
    getMessageId() {
        return this.message.id;
    }

    /**
     * Checks if the message mentions specific users.
     * @param {string|string[]} userIds - A single user ID or an array of user IDs to check for mentions.
     * @returns {boolean} True if any of the specified users are mentioned in the message.
     */
    mentionsUsers(userIds = [constants.CLIENT_ID]) {
        if (!Array.isArray(userIds)) {
            userIds = [userIds];
        }

        const doesMentionUser = userIds.some(userId => this.message.mentions.users.has(userId));
        logger.debug(`mentionsUsers: Checking if message mentions any user ID in [${userIds.join(", ")}]: ${doesMentionUser}`);
        return doesMentionUser;
    }

    /**
     * Checks if the message is a direct mention.
     * @returns {boolean} True if the bot is the only user mentioned in the message.
     */
    isDirectionMention() {
        const mentions = this.message.mentions.users;
        return mentions.size === 1 && mentions.has(constants.CLIENT_ID);
    }

    /**
     * Determines if the message is a reply to another message.
     * @returns {boolean} True if the message is a reply and specifically to the bot.
     */
    isReply() {
        const hasReference = Boolean(this.message.reference && this.message.reference.messageId);
        const isReplyToBot = hasReference && this.repliedMessage && this.repliedMessage.author.id === constants.CLIENT_ID;
        logger.debug(`isReply: Message has reference: ${hasReference}, is reply to bot: ${isReplyToBot}`);
        return hasReference && isReplyToBot;
    }

    /**
     * Retrieves the textual content of the message.
     * @returns {string} The message content, or an empty string if undefined or null.
     */
    getText() {
        if (!this.message.content) {
            logger.error('DiscordMessage.getText: message content is undefined or null.');
            return ''; // Return empty string if content is missing
        }
        return this.message.content;
    }

    /**
     * Retrieves the ID of the channel the message was sent in.
     * @returns {string} The channel ID, or an empty string if undefined or null.
     */
    getChannelId() {
        if (!this.message.channel || !this.message.channel.id) {
            logger.error('DiscordMessage.getChannelId: channel.id is undefined or null.');
            return '';            // Return empty string if channelId is missing
        }
        logger.debug(`DiscordMessage.getChannelId: Returning channel ID: ${this.message.channel.id}`);
        return this.message.channel.id;
    }

    /**
     * Retrieves the ID of the author of the message.
     * @returns {string} The author ID, or an empty string if undefined or null.
     */
    getAuthorId() {
        if (!this.message.author || !this.message.author.id) {
            logger.error('DiscordMessage.getAuthorId: author.id is undefined or null.');
            return ''; // Return empty string if authorId is missing
        }
        logger.debug(`DiscordMessage.getAuthorId: Returning author ID: ${this.message.author.id}`);
        return this.message.author.id;
    }

    /**
     * Determines if the message was sent by a bot.
     * This can be explicitly set or derived from the message's author.bot flag.
     * @returns {boolean} True if the message is from a bot, false otherwise.
     */
    isFromBot() {
        let isFromBot;
        if (this.isBotExplicitlySet !== null) {
            // If isBotExplicitlySet is explicitly defined, use its value
            isFromBot = this.isBotExplicitlySet;
            logger.debug(`isFromBot: Explicitly set to ${isFromBot}.`);
        } else {
            // Otherwise, derive the value from the message's author.bot flag
            isFromBot = this.message.author.bot;
            logger.debug(`isFromBot: Derived from message author's bot flag as ${isFromBot}.`);
        }

        // Debugging the final decision on whether the message is from a bot
        logger.debug(`isFromBot: Final determination for message ID ${this.message.id} is ${isFromBot}.`);

        return isFromBot;
    }
}

module.exports = DiscordMessage;
