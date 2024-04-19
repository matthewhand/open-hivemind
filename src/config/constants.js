module.exports = {
    // Client and channel identification for the bot
    CLIENT_ID: process.env.CLIENT_ID,
    CHANNEL_ID: process.env.CHANNEL_ID,

    // Follow-up message configuration
    FOLLOW_UP_ENABLED: process.env.LLM_FOLLOW_UP_ENABLED !== 'false',
    FOLLOW_UP_MIN_DELAY: parseInt(process.env.LLM_FOLLOW_UP_MIN_DELAY || '120', 10) * 1000,  // 2 minutes in milliseconds
    FOLLOW_UP_MAX_DELAY: parseInt(process.env.LLM_FOLLOW_UP_MAX_DELAY || '300', 10) * 1000,  // 5 minutes in milliseconds

    // LLM interaction configurations
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_ENDPOINT_URL: process.env.LLM_ENDPOINT_URL || "http://localhost:5000/v1/chat/completions",
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'OpenAI',
    LLM_MODEL: process.env.LLM_MODEL || 'gpt-3.5-turbo',
    LLM_SYSTEM_PROMPT: process.env.LLM_SYSTEM_PROMPT || 'Contribute to the provided message history.',
    LLM_SUMMARY_PROMPT: process.env.LLM_SUMMARY_PROMPT || 'Summarise your previous response when instructed.',
    LLM_TEMPERATURE: parseFloat(process.env.LLM_TEMPERATURE || '0.5'),
    LLM_MAX_TOKENS: parseInt(process.env.LLM_MAX_TOKENS || '150', 10),

    // Advanced LLM parameters
    LLM_MAX_LENGTH: parseInt(process.env.LLM_MAX_CONTENT_LENGTH || '4096', 10),
    LLM_TOP_P: parseFloat(process.env.LLM_TOP_P || '0.9'),
    LLM_FREQUENCY_PENALTY: parseFloat(process.env.LLM_FREQUENCY_PENALTY || '0.1'),
    LLM_PRESENCE_PENALTY: parseFloat(process.env.LLM_PRESENCE_PENALTY || '0.05'),

    // Message handling specifics
    LLM_RESPONSE_MAX_TOKENS: parseInt(process.env.LLM_RESPONSE_MAX_TOKENS || '150', 10),
    LLM_MESSAGE_LIMIT_PER_HOUR: parseInt(process.env.LLM_MESSAGE_LIMIT_PER_HOUR || '100', 10),
    LLM_MESSAGE_LIMIT_PER_DAY: parseInt(process.env.LLM_MESSAGE_LIMIT_PER_DAY || '1000', 10),

    // Typing delay simulation
    BOT_TYPING_DELAY_MIN_MS: parseInt(process.env.BOT_TYPING_DELAY_MIN_MS || '1000', 10),
    BOT_TYPING_DELAY_MAX_MS: parseInt(process.env.BOT_TYPING_DELAY_MAX_MS || '5000', 10),
    INTER_PART_DELAY: parseInt(process.env.BOT_TYPING_DELAY_MAX_MS || '3000', 10),
};