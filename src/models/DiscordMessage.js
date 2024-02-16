// src/models/DiscordMessage.js
const IMessage = require('../interfaces/IMessage');
const logger = require('../utils/logger');

class DiscordMessage extends IMessage {
    constructor(message, isBot = false) { // Added isBot parameter with default value
        super(message);
        
        if (!message) {
            logger.error('DiscordMessage constructor: message parameter is undefined or null.');
            throw new Error('Message parameter is required');
        }
        
        this.message = message; // Store the original Discord message object
        this.isBot = isBot; // Use the passed isBot parameter

        logger.debug('DiscordMessage constructor: message object successfully initialized.');
    }

    isFromBot() {
        // Use the isBot property set in the constructor
        logger.debug(`DiscordMessage.isFromBot: Message is from bot: ${this.isBot}`);
        return this.isBot;
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
