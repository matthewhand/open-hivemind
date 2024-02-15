// src/models/DiscordMessage.js

const IMessage = require('../interfaces/IMessage');

class DiscordMessage extends IMessage {
    constructor(message) {
        super(message);
    }

    getText() {
        // Direct access seems correct based on your description
        return this.data.content;
    }

    getChannelId() {
        // Adjust if the actual path to channelId is different
        return this.data.channelId; // Assuming direct access is correct
    }

    getAuthorId() {
        // Adjust if the actual path to authorId is different
        return this.data.authorId; // Assuming direct access is correct
    }

    isFromBot() {
        // Assuming this.data.author might be an object with a 'bot' property
        return this.data.author.bot;
    }
}

module.exports = DiscordMessage;
