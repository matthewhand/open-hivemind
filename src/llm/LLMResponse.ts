import Debug from "debug";
class LLMResponse {
    private content: string;
    private finish_reason: string;
    private completion_tokens: number;

    constructor(content: string, finish_reason: string = 'completed', completion_tokens: number = 0) {
        this.content = content;
        this.finish_reason = finish_reason;
        this.completion_tokens = completion_tokens;
    }

    getContent(): string {
        if (typeof this.content !== 'string') {
            console.error("Expected the content to be a string, but received:", typeof this.content);
            return "Error: Response content is not in string format";
        }
        return this.content;
    }

    getFinishReason(): string {
        return this.finish_reason;
    }

    getCompletionTokens(): number {
        return this.completion_tokens;
    }
}

export default LLMResponse;
