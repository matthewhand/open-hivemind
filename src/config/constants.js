// Use constants.js for:
// Environment-Sensitive Settings: Store configurations that are sensitive or vary between different environments (development, staging, production). For example, API keys, endpoint URLs, and feature toggles that depend on the environment. This is because constants.js can access environment variables (via process.env), allowing you to keep sensitive information out of your codebase and version control.
// Dynamic Configuration: Any setting that might be changed without redeploying the application, such as feature toggles controlled through environment variables, should be in constants.js.
// Integration Points: Configuration for external services or APIs (like LLM_API_KEY, LLM_ENDPOINT_URL) that might change based on the deployment environment or need to be kept secret.

// Use config.json for:
// Static Application Settings: Use this for configurations that are less sensitive and don't typically change between environments. For example, UI-related settings, application-wide defaults that aren't environment-specific (like unsolicitedChannelCap), or settings that don't contain sensitive information.
// Feature Flags and Modules: Static feature toggles (like enabledModules) that turn on/off parts of your application. These can be more static and not require hiding or encrypting.
// Predefined Constants: Settings like deciderConfig which are more about the operational logic of the application and less likely to be sensitive or change between environments.

module.exports = {
    // Response settings
    BOT_TO_BOT_MODE: process.env.LLM_BOT_TO_BOT_MODE !== 'false',
    FOLLOW_UP_ENABLED: process.env.LLM_FOLLOW_UP_ENABLED !== 'false',
    FOLLOW_UP_MIN_DELAY: parseInt(process.env.LLM_FOLLOW_UP_MIN_DELAY || '2', 10) * 60 * 1000,
    FOLLOW_UP_MAX_DELAY: parseInt(process.env.LLM_FOLLOW_UP_MAX_DELAY || '60', 10) * 60 * 1000,

    // Remote LLM Settings
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_ENDPOINT_URL: process.env.LLM_ENDPOINT_URL || "http://localhost:5000/v1/chat/completions",

    // LLM Parameters
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'OpenAI', // Default to OpenAI
    LLM_MODEL: process.env.LLM_MODEL || 'gpt-3.5-turbo', // or mistral-7b-instruct, etc
    LLM_SYSTEM_PROMPT: process.env.LLM_SYSTEM_PROMPT || 'You are a helpful assistant.',
    LLM_MAX_CONTENT_LENGTH: parseInt(process.env.LLM_MAX_CONTENT_LENGTH || '4096', 10),
    LLM_TEMPERATURE: parseFloat(process.env.LLM_TEMPERATURE || '0.5'),
    LLM_MAX_TOKENS: parseInt(process.env.LLM_MAX_TOKENS || '420', 10),
    LLM_TOP_P: parseFloat(process.env.LLM_TOP_P || '0.9'),
    LLM_FREQUENCY_PENALTY: parseFloat(process.env.LLM_FREQUENCY_PENALTY || '0.1'),
    LLM_PRESENCE_PENALTY: parseFloat(process.env.LLM_PRESENCE_PENALTY || '0.05'),
    
    // Local LLM Settings (overrides remote)
    OLLAMA_ENABLED: process.env.LLM_OLLAMA_ENABLED !== 'false',
    OLLAMA_DEFAULT_MODEL: process.env.LLM_OLLAMA_DEFAULT_MODEL || 'orca-mini',

    // Other constants...
};
