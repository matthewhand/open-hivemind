import ConfigurationManager from '@src/common/config/ConfigurationManager';

const configManager = new ConfigurationManager();

export function setupVoiceChannel() {
    const welcomeMessage = configManager.DISCORD_WELCOME_MESSAGE;
    const apiKey = configManager.openaiConfig.OPENAI_API_KEY;
    const model = configManager.OPENAI_MODEL;

    // Logic to set up the voice channel using the configuration values
}
