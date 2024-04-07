class LLMResponse {
    /**
     * Constructs an instance of LLMResponse with the specified content and finish reason.
     * @param {string} content - The response content from the LLM.
     * @param {string} finish_reason - The reason provided by the LLM for finishing the response.
     */
    constructor(content, finish_reason) {
        this.content = content;
        this.finish_reason = finish_reason;
    }

    /**
     * Gets the response content.
     * @returns {string} The content of the response.
     */
    getContent() {
        return this.content;
    }

    /**
     * Gets the reason why the LLM finished generating the response.
     * @returns {string} The finish reason.
     */
    getFinishReason() {
        return this.finish_reason;
    }
}

module.exports = LLMResponse;
