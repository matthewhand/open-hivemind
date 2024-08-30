require('dotenv/config'); // Loads environment variables from .env
require('module-alias/register'); // Enables tsconfig @alias paths at runtime

const { redactSensitiveInfo } = require('@common/redactSensitiveInfo');

console.log("process.env.DISCORD_TOKEN:", redactSensitiveInfo("DISCORD_TOKEN", process.env.DISCORD_TOKEN)); // Redacted token

const { DiscordService } = require('@src/integrations/discord/DiscordService');
const ConfigurationManager = require('@config/ConfigurationManager').default;
const { debugEnvVars } = require('@config/debugEnvVars');
const Debug = require('debug');
const { messageHandler } = require('@src/message/handlers/messageHandler');

const debug = Debug('app:index');

// Initialize configuration manager
const configManager = ConfigurationManager.getInstance();

// Debug environment variables
debugEnvVars();

// Debug: Check if discord configuration is loaded
const discordConfig = configManager.getConfig('discord');
if (!discordConfig) {
    console.error('Discord configuration not found');
} else {
    debug('Discord configuration loaded:', discordConfig);
}

async function main() {
    try {
        // Get the singleton instance of DiscordService
        const discordService = DiscordService.getInstance();
        debug('DiscordService instance retrieved with options:', discordService.options);

        // Set up the message handler
        discordService.setMessageHandler(messageHandler);
        debug('Message handler set up successfully.');

        // Retrieve the bot token from the configuration manager
        const botToken = discordConfig ? discordConfig.DISCORD_TOKEN : null;
        debug('Bot Token retrieved:', redactSensitiveInfo('DISCORD_TOKEN', botToken));

        // Guard clause: Ensure bot token is properly configured
        if (!botToken || botToken === 'UNCONFIGURED_DISCORD_TOKEN') {
            console.error('Bot Token is not configured correctly.');
            debug('Full discordConfig:', discordConfig); // Dump full config for debugging
            process.exit(1);
        }

        // Start the Discord service with the bot token
        await discordService.start(botToken);
        debug('Discord service started successfully with Bot Token.');

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
