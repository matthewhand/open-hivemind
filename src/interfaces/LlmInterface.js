// src/interfaces/LlmInterface.js
const logger = require('../utils/logger');
const constants = require('../config/constants');

class LlmInterface {
    static getManager() {
        switch (constants.LLM_PROVIDER) {
            case 'OpenAI': {
                const OpenAiManager = require('../managers/OpenAiManager'); // Dynamic require within a block
                return new OpenAiManager();
            }
            // Add more cases as needed for different providers
            default:
                logger.error(`Unsupported LLM Provider specified in constants: ${constants.LLM_PROVIDER}`);
                throw new Error(`Unsupported LLM Provider specified in constants: ${constants.LLM_PROVIDER}`);
        }
    }

    async prepareRequestData(message, history=[]) {
        throw new Error("prepareRequestData method must be implemented");
    }

    async sendRequest(message, history=[]) {
        throw new Error("sendRequest method must be implemented");
    }

    requiresHistory() {
        return false; // Default implementation, override in subclasses if needed
    }
}

module.exports = LlmInterface;
