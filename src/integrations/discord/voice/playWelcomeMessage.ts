import ConfigurationManager from '@src/common/config/ConfigurationManager';

const configManager = new ConfigurationManager();

export function playWelcomeMessage() {
    const welcomeMessage = configManager.DISCORD_WELCOME_MESSAGE;

    // Logic to play the welcome message using the configuration value
}
