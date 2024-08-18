import configurationManager from '../config/configurationManager';

export const constants = {
    // Client and channel identification for the bot
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
    CLIENT_ID: configurationManager.getConfig('messagePlatform.discord.clientId'),
    CHANNEL_ID: configurationManager.getConfig('messagePlatform.discord.channelId'),
    VOICE_CHANNEL_ID: configurationManager.getConfig('messagePlatform.discord.voiceChannelId'),

    // Follow-up message configuration
    FOLLOW_UP_ENABLED: configurationManager.getConfig('enabledModules.followUp.enabled'),
    FOLLOW_UP_MIN_DELAY: configurationManager.getConfig('enabledModules.followUp.minDelaySec') * 1000,  // Convert to milliseconds
    FOLLOW_UP_MAX_DELAY: configurationManager.getConfig('enabledModules.followUp.maxDelaySec') * 1000,  // Convert to milliseconds

    // LLM interaction configurations
    LLM_API_KEY: process.env.LLM_API_KEY || '',
    LLM_ENDPOINT_URL: configurationManager.getConfig('llm.openai.chatCompletions.endpointUrl'),
    LLM_MODEL: configurationManager.getConfig('llm.openai.chatCompletions.model'),
    LLM_TEMPERATURE: configurationManager.getConfig('llm.openai.chatCompletions.temperature'),

    // Typing delay simulation
    BOT_TYPING_DELAY_MIN_MS: configurationManager.getConfig('messagePlatform.discord.typingDelayMinMs'),
    BOT_TYPING_DELAY_MAX_MS: configurationManager.getConfig('messagePlatform.discord.typingDelayMaxMs'),
    INTER_PART_DELAY: configurationManager.getConfig('messagePlatform.discord.interPartDelayMs'),

    // Other constants not covered by config/default.json
    TRANSCRIBE_API_KEY: process.env.TRANSCRIBE_API_KEY || process.env.OPENAI_API_KEY || '',
    TRANSCRIBE_ENDPOINT_URL: process.env.TRANSCRIBE_ENDPOINT_URL || "https://api.openai.com/v1/audio/transcriptions",
    NARRATION_API_KEY: process.env.NARRATION_API_KEY || process.env.OPENAI_API_KEY || '',
    NARRATION_ENDPOINT_URL: process.env.NARRATION_ENDPOINT_URL || "https://api.openai.com/v1/audio/translations",
    WELCOME_MESSAGE: process.env.WELCOME_MESSAGE || 'Hello everyone, I have joined the voice channel!'
};
