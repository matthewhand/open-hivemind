// src/interfaces/llmInterface.js
class LlmInterface {
    async prepareRequestData(message, history=[]) {
        throw new Error("prepareRequestData method must be implemented");
    }

    async sendRequest(message, history=[]) {
        throw new Error("sendRequest method must be implemented");
    }

    requiresHistory() {
        // Default implementation does not require history.
        // Override this in subclasses if history is required.
        return false;
    }
}

module.exports = LlmInterface;
