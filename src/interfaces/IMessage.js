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

    // Override if the IM client supports it
    isReplyToBot() {
        return false;
    }
    
    // New method to check if the message mentions a specific user
    mentionsUsers(userId) {
        throw new Error("mentionsUsers method must be implemented by subclasses");
    }

    isFromBot() {
        throw new Error("isFromBot method must be implemented by subclasses");
    }

}

module.exports = IMessage;
