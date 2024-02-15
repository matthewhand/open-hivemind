// src/interfaces/IMessage.js

/**
 * Base class for a standardized message format.
 * This class is intended to be extended with specific implementations as needed.
 */
class IMessage {
    constructor(data) {
        if (new.target === IMessage) {
            throw new TypeError("Cannot construct IMessage instances directly");
        }
        this.data = data; // Original message data
    }

    // Returns the text content of the message
    getText() {
        throw new Error("getText method must be implemented by subclasses");
    }

    // Returns the channel ID where the message was sent
    getChannelId() {
        throw new Error("getChannelId method must be implemented by subclasses");
    }

    // Returns the ID of the message author
    getAuthorId() {
        throw new Error("getAuthorId method must be implemented by subclasses");
    }

    // Implement the isFromBot method
    isFromBot() {
        return false;
    }

    // Any additional methods or properties relevant to your application...
}

module.exports = IMessage;
