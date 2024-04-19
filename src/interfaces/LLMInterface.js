// src/interfaces/LLMInterface.js
const logger = require('../utils/Logger');
const constants = require('../config/Constants');

/**
 * Abstracts the LLM (Large Language Models) interface to provide a consistent method
 * of interacting with various LLM providers such as OpenAI.
 */
class LLMInterface {
    constructor() {
        if (this.constructor === LLMInterface) {
            throw new Error("Abstract class LLMInterface cannot be instantiated directly.");
        }
    }

    /**
     * Retrieves an instance of an LLM manager based on the provider specified in the constants.
     * @returns {LLMInterface} An instance of a class extending LLMInterface.
     * @throws {Error} Throws an error if the LLM provider is not supported.
     */
    static getManager() {
        switch (constants.LLM_PROVIDER) {
            case 'OpenAI': {
                const OpenAiManager = require('../managers/OpenAiManager'); // Dynamic require within a block
                return new OpenAiManager();
            }
            // Potential cases for other providers can be added here
            default:
                logger.error(`Unsupported LLM Provider specified in constants: ${constants.LLM_PROVIDER}`);
                throw new Error(`Unsupported LLM Provider specified in constants: ${constants.LLM_PROVIDER}`);
        }
    }

    /**
     * Builds the request body to be sent to the LLM based on the provided messages.
     * @param {IMessage[]} historyMessages - An array of message instances to construct the context.
     * @returns {Object} The request body for the LLM API call.
     * @throws {Error} Must be implemented in subclass.
     */
    async buildRequestBody(historyMessages) {
        throw new Error("buildRequestBody method must be implemented by subclasses");
    }

    /**
     * Sends a request to the LLM and returns the response.
     * @param {IMessage} message - The message prompting an LLM response.
     * @param {IMessage[]} history - Optional. A historical context of messages.
     * @returns {Promise<LLMResponse>} The response from the LLM.
     * @throws {Error} Must be implemented in subclass.
     */
    async sendRequest(message, history=[]) {
        throw new Error("sendRequest method must be implemented by subclasses");
    }

    /**
     * Checks if the LLM manager is currently busy.
     * This abstract method should be overridden to provide specific logic to determine if the manager is busy.
     * @returns {boolean} True if the LLM manager is busy, false otherwise.
     * @throws {Error} Must be implemented in subclass.
     */
    isBusy() {
        throw new Error("isBusy method must be implemented by subclasses");
    }

    /**
     * Determines if historical message data is required by the LLM for generating responses.
     * @returns {boolean} True if historical data is required, false otherwise.
     */
    requiresHistory() {
        return false; // Default implementation, override in subclasses if needed
    }
}

module.exports = LLMInterface;
