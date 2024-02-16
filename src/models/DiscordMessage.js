// src/models/DiscordMessage.js
const IMessage = require('../interfaces/IMessage');
const logger = require('../utils/logger'); // Assuming you have a logger utility

class DiscordMessage extends IMessage {
    constructor(message) {
        super(message);
        
        if (!message) {
            logger.error('DiscordMessage constructor: message parameter is undefined or null.');
            throw new Error('Message parameter is required');
        }
        
        if (!message.content) {
            logger.error('DiscordMessage constructor: message object is missing content property.');
        }
        
        if (!message.channel || !message.channel.id) {
            logger.error('DiscordMessage constructor: message object is missing channel.id property.');
        }
        
        if (!message.author || (!message.author.id && message.author.bot === undefined)) {
            logger.error('DiscordMessage constructor: message object is missing author.id or author.bot property.');
        }
        
        this.message = message; // Store the original Discord message object
        logger.debug('DiscordMessage constructor: message object successfully initialized.');
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

    isFromBot() {
        if (this.message.author.bot === undefined) {
            logger.warn('DiscordMessage.isFromBot: author.bot property is undefined. Assuming message is not from a bot.');
            return false; // Assume not a bot if bot property is missing
        }
        logger.debug(`DiscordMessage.isFromBot: Message is from bot: ${this.message.author.bot}`);
        return this.message.author.bot;
    }
}

module.exports = DiscordMessage;
