export interface LlmConfig {
    LLM_PROVIDER: string;
    LLM_MODEL?: string;
    LLM_STOP?: string[];
    LLM_SYSTEM_PROMPT?: string;
    LLM_RESPONSE_MAX_TOKENS?: number;
    LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION?: boolean;
    LLM_PARALLEL_EXECUTION?: boolean;
}
