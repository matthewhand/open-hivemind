import convict from 'convict';
declare const openaiConfig: convict.Config<{
    OPENAI_API_KEY: string;
    OPENAI_TEMPERATURE: number;
    OPENAI_MAX_TOKENS: number;
    OPENAI_FREQUENCY_PENALTY: number;
    OPENAI_PRESENCE_PENALTY: number;
    OPENAI_BASE_URL: string;
    OPENAI_TIMEOUT: number;
    OPENAI_ORGANIZATION: string;
    OPENAI_MODEL: string;
    OPENAI_STOP: [];
    OPENAI_TOP_P: number;
    OPENAI_SYSTEM_PROMPT: string;
    OPENAI_RESPONSE_MAX_TOKENS: number;
    OPENAI_MAX_RETRIES: number;
    OPENAI_FINISH_REASON_RETRY: string;
    OPENAI_VOICE: string;
}>;
export default openaiConfig;
//# sourceMappingURL=openaiConfig.d.ts.map