"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Class representing an LLM (Large Language Model) response.
 */
class LLMResponse {
    constructor(content, finish_reason = 'completed', completion_tokens = 0) {
        this.content = content;
        this.finish_reason = finish_reason;
        this.completion_tokens = completion_tokens;
    }
    /**
     * Retrieves the content of the response.
     * @returns {string} The response content.
     */
    getContent() {
        return this.content;
    }
    /**
     * Retrieves the reason for finishing the response.
     * @returns {string} The finish reason.
     */
    getFinishReason() {
        return this.finish_reason;
    }
    /**
     * Retrieves the number of completion tokens used in the response.
     * @returns {number} The number of completion tokens.
     */
    getCompletionTokens() {
        return this.completion_tokens;
    }
}
exports.default = LLMResponse;
