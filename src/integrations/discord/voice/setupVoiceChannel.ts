import ConfigurationManager from '@src/config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

export function setupVoiceChannel() {
    const discordConfig = configManager.getConfig('discordConfig');
    const openaiConfig = configManager.getConfig('openaiConfig');
    
    const welcomeMessage = discordConfig.DISCORD_WELCOME_MESSAGE;
    const apiKey = openaiConfig.OPENAI_API_KEY;
    const model = openaiConfig.OPENAI_MODEL; // Moved to openaiConfig
    
    // Logic to set up the voice channel using the configuration values
}
