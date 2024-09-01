/**
 * Interface for the OpenAI configuration settings.
 */
export interface OpenAiConfig {
    /**
     * The API key for accessing OpenAI services.
     */
    OPENAI_API_KEY: string;

    /**
     * The specific model to use for requests (e.g., "gpt-4").
     */
    OPENAI_MODEL?: string;

    /**
     * The voice setting for voice synthesis, if applicable.
     */
    OPENAI_VOICE?: string;

    /**
     * The temperature setting for generating responses, controlling creativity.
     */
    OPENAI_TEMPERATURE?: number;

    /**
     * The maximum number of retries for API requests.
     */
    OPENAI_MAX_RETRIES?: number;
}
