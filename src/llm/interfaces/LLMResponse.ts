import Debug from "debug";
/**
 * Class representing an LLM (Large Language Model) response.
 */
class LLMResponse {
    private content: string;
    private finish_reason: string;
    private completion_tokens: number;

    constructor(content: string, finish_reason: string = 'completed', completion_tokens: number = 0) {
        this.content = content;
        this.finish_reason = finish_reason;
        this.completion_tokens = completion_tokens;
    }

    /**
     * Retrieves the content of the response.
     * @returns {string} The response content.
     */
    getContent(): string {
        if (typeof this.content !== 'string') {
            console.error("Expected the content to be a string, but received:", typeof this.content);
            return "Error: Response content is not in string format";
        }
        return this.content;
    }

    /**
     * Retrieves the reason for finishing the response.
     * @returns {string} The finish reason.
     */
    getFinishReason(): string {
        return this.finish_reason;
    }

    /**
     * Retrieves the number of completion tokens used in the response.
     * @returns {number} The number of completion tokens.
     */
    getCompletionTokens(): number {
        return this.completion_tokens;
    }
}

export default LLMResponse;
