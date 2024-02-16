// src/models/DiscordMessage.js
const IMessage = require('../interfaces/IMessage');
const logger = require('../utils/logger');
const constants = require('../config/constants'); // Ensure this path is correct

class DiscordMessage extends IMessage {
    constructor(message, repliedMessage = null, isBot = null) {
        super(message);

        if (!message) {
            logger.error('DiscordMessage constructor: message parameter is undefined or null.');
            throw new Error('Message parameter is required');
        }

        this.message = message; // Store the original Discord message object
        this.repliedMessage = repliedMessage; // Store the replied-to message, if any
        this.isBotExplicitlySet = isBot; // Store the explicitly set isBot value, if any

        logger.debug('DiscordMessage constructor: message object successfully initialized.');
    }


    // Check if the message mentions a specific user, defaulting to the bot's client ID
    mentionsUsers(userId = constants.CLIENT_ID) {
        // Assuming `this.message.mentions.users` is a Map or similar collection from Discord.js
        return this.message.mentions && this.message.mentions.users.has(userId);
    }

    // Override or extend isReply method to utilize repliedMessage for additional checks
    isReply() {
        const hasReference = Boolean(this.message.reference && this.message.reference.messageId);
        // Enhanced to consider repliedMessage for a more detailed reply context
        const isReplyToBot = hasReference && this.repliedMessage && this.repliedMessage.author.id === constants.CLIENT_ID;
        return hasReference && isReplyToBot;
    }

    // Optionally, you might add a method specifically to check if the reply was to the bot,
    // if you need to keep the simple reply check separate.
    isReplyToBot() {
        return this.isReply(); // This relies on the isReply method's enhanced logic
    }

    getText() {
        if (!this.message.content) {
            logger.error('DiscordMessage.getText: message content is undefined or null.');
            return ''; // Return empty string if content is missing
        }
        logger.debug(`DiscordMessage.getText: Returning message content: ${this.message.content}`);
        return this.message.content;
    }

    getChannelId() {
        if (!this.message.channel || !this.message.channel.id) {
            logger.error('DiscordMessage.getChannelId: channel.id is undefined or null.');
            return ''; // Return empty string if channelId is missing
        }
        logger.debug(`DiscordMessage.getChannelId: Returning channel ID: ${this.message.channel.id}`);
        return this.message.channel.id;
    }

    getAuthorId() {
        if (!this.message.author || !this.message.author.id) {
            logger.error('DiscordMessage.getAuthorId: author.id is undefined or null.');
            return ''; // Return empty string if authorId is missing
        }
        logger.debug(`DiscordMessage.getAuthorId: Returning author ID: ${this.message.author.id}`);
        return this.message.author.id;
    }

}

module.exports = DiscordMessage;
