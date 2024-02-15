// src/models/DiscordMessage.js

const IMessage = require('../interfaces/IMessage');

class DiscordMessage extends IMessage {
    constructor(message) {
        super(message);
        this.message = message; // Store the original Discord message object
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

    isFromBot() {
        return this.message.author.bot;
    }
}

module.exports = DiscordMessage;
