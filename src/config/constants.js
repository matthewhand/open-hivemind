module.exports = {
    // Existing constants...
    
    // Follow-up message configuration
    FOLLOW_UP_ENABLED: process.env.LLM_FOLLOW_UP_ENABLED !== 'false',
    FOLLOW_UP_MIN_DELAY: parseInt(process.env.LLM_FOLLOW_UP_MIN_DELAY || '2', 10) * 60 * 1000,
    FOLLOW_UP_MAX_DELAY: parseInt(process.env.LLM_FOLLOW_UP_MAX_DELAY || '60', 10) * 60 * 1000,

    // Client and channel identification for the bot
    CLIENT_ID: process.env.CLIENT_ID,
    CHANNEL_ID: process.env.CHANNEL_ID,

    // Remote Large Language Model (LLM) configuration
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_ENDPOINT_URL: process.env.LLM_ENDPOINT_URL || "http://localhost:5000/v1/chat/completions",

    // LLM parameters for message processing
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'OpenAI',
    LLM_MODEL: process.env.LLM_MODEL || 'gpt-3.5-turbo',
    LLM_SYSTEM_PROMPT: process.env.LLM_SYSTEM_PROMPT || 'Contribute to the provided message history.',

    // Advanced LLM parameters
    LLM_MAX_LENGTH: parseInt(process.env.LLM_MAX_CONTENT_LENGTH || '4096', 10),
    LLM_TEMPERATURE: parseFloat(process.env.LLM_TEMPERATURE || '0.5'),
    LLM_MAX_TOKENS: parseInt(process.env.LLM_MAX_TOKENS || '420', 10),
    LLM_TOP_P: parseFloat(process.env.LLM_TOP_P || '0.9'),
    LLM_FREQUENCY_PENALTY: parseFloat(process.env.LLM_FREQUENCY_PENALTY || '0.1'),
    LLM_PRESENCE_PENALTY: parseFloat(process.env.LLM_PRESENCE_PENALTY || '0.05'),
    
    // Local LLM settings
    OLLAMA_ENABLED: process.env.LLM_OLLAMA_ENABLED !== 'false',
    OLLAMA_DEFAULT_MODEL: process.env.LLM_OLLAMA_DEFAULT_MODEL || 'orca-mini',

    // Message structuring and processing adjustments
    LLM_USE_PADDING: process.env.LLM_USE_PADDING === 'true', // Controls if padding is used for consecutive messages
    LLM_ADJUST_END: process.env.LLM_ADJUST_END !== 'false', // Controls if conversation ending is adjusted to avoid ending with an assistant's message
    LLM_PADDING_TEXT: process.env.LLM_PADDING_TEXT || "...", // Content used for padding between consecutive messages from the same role
    LLM_END_ADJUST_TEXT: process.env.LLM_END_ADJUST_TEXT || "...", // Content used to adjust conversation endings

    // Other constants...
};
