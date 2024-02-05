module.exports = {
    API_KEY: process.env.LLM_API_KEY,
    LLM_ENDPOINT_URL: process.env.LLM_ENDPOINT_URL || "http://",
    // Optional..
    MODEL_TO_USE: process.env.LLM_MODEL || 'mistral-7b-instruct',
    SYSTEM_PROMPT: process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.',
    BOT_TO_BOT_MODE: process.env.BOT_TO_BOT_MODE !== 'false',
    MAX_CONTENT_LENGTH: parseInt(process.env.LLM_MAX_CONTEXT_SIZE || '4096', 10),

    FOLLOW_UP_ENABLED: process.env.FOLLOW_UP_ENABLED !== 'false',
    FOLLOW_UP_MIN_DELAY: parseInt(process.env.FOLLOW_UP_MIN_DELAY || '2', 10) * 60 * 1000,
    FOLLOW_UP_MAX_DELAY: parseInt(process.env.FOLLOW_UP_MAX_DELAY || '60', 10) * 60 * 1000,

    OLLAMA_ENABLED: process.env.OLLAMA_DEFAULT_MODEL || 'true',
    OLLAMA_DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL || 'orca-mini',
    // Other constants...
};
