import ConfigurationManager from '@src/config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

export function setupVoiceChannel() {
    const welcomeMessage = configManager.discordConfig.DISCORD_WELCOME_MESSAGE;
    const apiKey = configManager.openaiConfig.OPENAI_API_KEY;
    const model = configManager.OPENAI_MODEL;

    // Logic to set up the voice channel using the configuration values
}
