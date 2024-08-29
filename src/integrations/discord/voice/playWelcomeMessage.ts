import ConfigurationManager from '@src/config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();

export function playWelcomeMessage() {
    const welcomeMessage = configManager.discordConfig.DISCORD_WELCOME_MESSAGE;

    // Logic to play the welcome message using the configuration value
}
