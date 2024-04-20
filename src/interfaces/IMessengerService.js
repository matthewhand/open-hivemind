class IMessengerService {
    constructor() {
        if (this.constructor === IMessengerService) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    async fetchChatHistory(channelId) {
        throw new Error("Method 'fetchChatHistory()' must be implemented.");
    }

    async sendResponse(channelId, message) {
        throw new Error("Method 'sendResponse()' must be implemented.");
    }
}
