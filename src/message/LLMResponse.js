class LLMResponse {
    /**
     * Constructs an instance of LLMResponse with the specified content, finish reason, and the number of tokens used for the completion.
     * @param {string} content - The response content from the LLM. It includes the actual text response or an error message.
     * @param {string} finish_reason - The reason provided by the LLM for finishing the response.
     * @param {number} completion_tokens - The number of tokens used by the LLM to generate the response.
     */
    constructor(content, finish_reason = 'completed', completion_tokens = 0) {
        this.content = content;
        this.finish_reason = finish_reason;
        this.completion_tokens = completion_tokens;
    }

    /**
     * Gets the response content. Ensures that the content is always treated as a string.
     * @returns {string} The content of the response.
     */
    getContent() {
        if (typeof this.content !== 'string') {
            // Logs an error if the content is not a string and returns a default error message.
            console.error("Expected the content to be a string, but received:", typeof this.content);
            return "Error: Response content is not in string format";
        }
        return this.content;
    }

    /**
     * Gets the reason why the LLM finished generating the response.
     * @returns {string} The finish reason.
     */
    getFinishReason() {
        return this.finish_reason;
    }

    /**
     * Gets the number of tokens used to complete the LLM response.
     * @returns {number} The number of tokens used.
     */
    getCompletionTokens() {
        return this.completion_tokens;
    }
}

module.exports = LLMResponse;
