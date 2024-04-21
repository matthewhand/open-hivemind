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
    
    getMessageId() {
        return this.message.id;
    }

    getText() {
        return this.message.content;
    }

    getChannelId() {
        return this.message.channel.id;
    }

    getAuthorId() {
        return this.message.author.id;
    }

    getChannelTopic() {
        return this.message.channel.topic || "No topic";
    }

    getUserMentions() {
        // Corrected to remove .toArray()
        return this.message.mentions.users.map(user => ({
            id: user.id,
            displayName: user.username
        }));
    }

    getChannelUsers() {
        return Array.from(this.message.channel.members.values()).map(member => ({
            id: member.user.id,
            displayName: member.user.username
        }));
    }

    isFromBot() {
        return this.message.author.bot;
    }
}
module.exports = DiscordMessage;
