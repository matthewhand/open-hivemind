// src/interfaces/IMessageFetcher.js

class IMessageFetcher {
    async fetchChatHistory(channelId) {
        throw new Error("fetchChatHistory method must be implemented");
    }

    async sendResponse(channelId, message) {
        throw new Error("sendResponse method must be implemented");
    }
}

module.exports = IMessageFetcher;
