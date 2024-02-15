// src/models/DiscordMessage.js

const IMessage = require('../interfaces/IMessage');

class DiscordMessage extends IMessage {
    constructor(message) {
        super(message);
    }

    getText() {
        return this.data.content;
    }

    getChannelId() {
        return this.data.channel.id;
    }

    getAuthorId() {
        return this.data.author.id;
    }

    // Implement the isFromBot method
    isFromBot() {
        return this.data.author.bot;
    }

    // Implement any additional methods needed specifically for Discord messages
}

module.exports = DiscordMessage;
