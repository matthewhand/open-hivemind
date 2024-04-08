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
    
        // Debug information about the message being initialized
        logger.debug(`DiscordMessage constructor: Initializing with message ID: ${message.id}`);
    
        this.message = message; // Store the original Discord message object
        this.repliedMessage = repliedMessage; // Store the replied-to message, if any
        this.isBotExplicitlySet = isBot; // Store the explicitly set isBot value, if any

        if (!this.message.content) {
            logger.error('[DiscordMessage]: message content is undefined or null.');
            throw new Error('Message content is required');
        }

        // // Additional debug information regarding optional parameters
        // if (repliedMessage) {
        //     logger.debug(`DiscordMessage constructor: repliedMessage parameter provided with ID: ${repliedMessage.id}`);
        // } else {
        //     logger.debug('DiscordMessage constructor: No repliedMessage parameter provided.');
        // }
    
        // if (isBot !== null) {
        //     logger.debug(`DiscordMessage constructor: isBotExplicitlySet parameter explicitly set to: ${isBot}`);
        // } else {
        //     logger.debug('DiscordMessage constructor: isBotExplicitlySet parameter not provided, defaulting to null.');
        // }
    
        // logger.debug('DiscordMessage constructor: message object successfully initialized.');
    }

    // Override getMessageId in subclasses
    getMessageId() {
        return this.data.id;
    }

    // Update mentionsUsers to handle an array of user IDs or a single userID
    mentionsUsers(userIds = [constants.CLIENT_ID]) {
        // Ensure userIds is always an array for consistency
        if (!Array.isArray(userIds)) {
            userIds = [userIds];
        }

        const doesMentionUser = userIds.some(userId => this.message.mentions.users.has(userId));
        logger.debug(`mentionsUsers: Checking if message mentions any user ID in [${userIds.join(", ")}]: ${doesMentionUser}`);
        return doesMentionUser;
    }

    // Implement isDirectionMention to check for mentions that imply direct interaction
    isDirectionMention() {
        // Assuming direct interaction is determined by the bot being the only mention
        const mentions = this.message.mentions.users;
        return mentions.size === 1 && mentions.has(constants.CLIENT_ID);
    }

    // Override or extend isReply method to utilize repliedMessage for additional checks
    isReply() {
        const hasReference = Boolean(this.message.reference && this.message.reference.messageId);
        const isReplyToBot = hasReference && this.repliedMessage && this.repliedMessage.author.id === constants.CLIENT_ID;
        logger.debug(`isReply: Message has reference: ${hasReference}, is reply to bot: ${isReplyToBot}`);
        return hasReference && isReplyToBot;
    }

    // Optionally, you might add a method specifically to check if the reply was to the bot,
    // if you need to keep the simple reply check separate.
    isReplyToBot() {
        const replyToBot = this.isReply(); // This relies on the isReply method's enhanced logic
        logger.debug(`isReplyToBot: Checking if reply is specifically to bot: ${replyToBot}`);
        return replyToBot;
    }
    
    getText() {
        if (!this.message.content) {
            logger.error('DiscordMessage.getText: message content is undefined or null.');
            return ''; // Return empty string if content is missing
        }
        logger.debug(`DiscordMessage.getText: ${this.message.content}`);
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

    // Concrete implementation of isFromBot for Discord messages
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
