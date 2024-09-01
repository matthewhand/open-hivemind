export interface OpenAiConfig {
    OPENAI_API_KEY: string;
    OPENAI_MODEL?: string;
    OPENAI_VOICE?: string;
    OPENAI_TEMPERATURE?: number;
    OPENAI_MAX_RETRIES?: number;
}

export interface FlowiseConfig {
    FLOWISE_BASE_URL: string;
    FLOWISE_API_KEY: string;
}

export interface N8nConfig {
    N8N_API_BASE_URL: string;
    N8N_API_KEY: string;
}

export interface LlmConfig {
    LLM_PROVIDER: string;
    LLM_MODEL?: string;
    LLM_STOP?: string[];
    LLM_SYSTEM_PROMPT?: string;
    LLM_RESPONSE_MAX_TOKENS?: number;
    LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION?: boolean;
    LLM_PARALLEL_EXECUTION?: boolean;
}

export interface DiscordConfig {
    WELCOME_AUDIO_DIR?: string;
    WELCOME_AUDIO_FILENAME?: string;
    DISCORD_WELCOME_MESSAGE?: string;
}
