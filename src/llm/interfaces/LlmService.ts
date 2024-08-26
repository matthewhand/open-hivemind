import Debug from "debug";

import constants from '@config/ConfigurationManager';

const debug = Debug('app:llm:LlmService');

/**
 * Abstract class representing the interface for Large Language Models (LLM).
 * Subclasses must implement the abstract methods defined here.
 */
export abstract class LlmService {
    constructor() {
        if (new.target === LlmService) {
            throw new Error('Abstract class LlmService cannot be instantiated directly.');
        }
        debug('LlmService instantiated');
    }

    /**
     * Returns an instance of the LLM provider specified in the configuration.
     * Currently supports only OpenAI as the LLM provider.
     * @returns {LlmService} An instance of the LLM provider.
     */
    static getManager(): LlmService {
        debug('getManager called with LLM_PROVIDER: ' + constants.LLM_PROVIDER);
        switch (constants.LLM_PROVIDER) {
            case 'OpenAI': {
                const { OpenAiService } = require('@src/llm/openai/OpenAiService');
                return OpenAiService.getInstance();
            }
            default:
                debug('Unsupported LLM Provider: ' + constants.LLM_PROVIDER);
                throw new Error('Unsupported LLM Provider specified in constants: ' + constants.LLM_PROVIDER);
        }
    }

    /**
     * Builds the request body to be sent to the LLM.
     * Must be implemented by subclasses.
     * @param {any[]} historyMessages - The history of messages to include in the request.
     * @returns {Promise<object>} The request body object.
     */
    abstract buildRequestBody(historyMessages: any[]): Promise<object>;

    /**
     * Sends the request to the LLM and returns the response.
     * Must be implemented by subclasses.
     * @param {any} message - The message to send to the LLM.
     * @param {any[]} [history] - Optional history of previous messages.
     * @returns {Promise<any>} The response from the LLM.
     */
    abstract sendRequest(message: any, history?: any[]): Promise<any>;

    /**
     * Checks if the LLM is currently busy processing a request.
     * Must be implemented by subclasses.
     * @returns {boolean} True if the LLM is busy, false otherwise.
     */
    abstract isBusy(): boolean;

    /**
     * Indicates whether the LLM requires message history.
     * Can be overridden by subclasses if history is required.
     * @returns {boolean} False by default, indicating history is not required.
     */
    requiresHistory(): boolean {
        debug('requiresHistory called');
        return false;
    }
}
