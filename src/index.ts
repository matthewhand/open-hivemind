require('module-alias/register'); // Enables tsconfig @alias paths at runtime
require('dotenv/config'); // Loads environment variables from .env

const { DiscordService } = require('@src/integrations/discord/DiscordService');
const ConfigurationManager = require('@config/ConfigurationManager').default;
const Debug = require('debug');
const { messageHandler } = require('@src/message/handlers/messageHandler');

const debug = Debug('app:index');

async function main() {
    try {
        // Get the singleton instance of DiscordService
        const discordService = DiscordService.getInstance();
        debug('DiscordService instance retrieved:', discordService);

        // Set up the message handler
        discordService.setMessageHandler(messageHandler);
        debug('Message handler set up successfully.');

        // Retrieve the client ID from the configuration manager
        const clientId = ConfigurationManager.getConfig('discord.clientId', 'UNCONFIGURED_DISCORD_CLIENT_ID');
        debug('Client ID retrieved:', clientId);

        // Guard clause: Ensure client ID is properly configured
        if (!clientId || clientId === 'UNCONFIGURED_DISCORD_CLIENT_ID') {
            console.error('Client ID is not configured correctly.');
            process.exit(1);
        }

        // Start the Discord service with the client ID
        await discordService.start(clientId);
        debug('Discord service started successfully with Client ID:', clientId);

    } catch (error) {
        // Log the error if the Discord service fails to start
        console.error('Failed to start Discord service:', error);

        // Exit the process with an error code
        process.exit(1);
    }
}

// Start the application by invoking the main function
main().catch((error) => {
    console.error('Unexpected error in main execution:', error);
    process.exit(1);
});
