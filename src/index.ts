require('dotenv/config'); // Loads environment variables from .env
require('module-alias/register'); // Enables tsconfig @alias paths at runtime

const { redactSensitiveInfo } = require('@common/redactSensitiveInfo');

console.log("[DEBUG] process.env.DISCORD_TOKEN after dotenv load:", redactSensitiveInfo('DISCORD_TOKEN', process.env.DISCORD_TOKEN)); // Redacted token

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
    console.error('[DEBUG] Discord configuration not found');
} else {
    debug('[DEBUG] Discord configuration loaded:', discordConfig);
}

async function main() {
    try {
        // Get the singleton instance of DiscordService
        const discordService = DiscordService.getInstance();
        debug('[DEBUG] DiscordService instance retrieved with options:', discordService.options);

        // Set up the message handler
        discordService.setMessageHandler(messageHandler);
        debug('[DEBUG] Message handler set up successfully.');

        // Retrieve the bot token from the configuration manager
        const botToken = configManager.getEnvConfig('DISCORD_TOKEN', 'discord.DISCORD_TOKEN', '');  // Force call to test

        debug('[DEBUG] Bot Token retrieved:', redactSensitiveInfo('DISCORD_TOKEN', botToken));

        // Guard clause: Ensure bot token is properly configured
        if (!botToken || botToken === 'UNCONFIGURED_DISCORD_TOKEN') {
            console.error('[DEBUG] Bot Token is not configured correctly.');
            debug('[DEBUG] Full discordConfig:', discordConfig); // Dump full config for debugging
            process.exit(1);
        }

        // Start the Discord service with the bot token
        await discordService.start(botToken);
        debug('[DEBUG] Discord service started successfully with Bot Token.');

    } catch (error) {
        // Log the error if the Discord service fails to start
        console.error('[DEBUG] Failed to start Discord service:', error);

        // Exit the process with an error code
        process.exit(1);
    }
}

// Start the application by invoking the main function
main().catch((error) => {
    console.error('[DEBUG] Unexpected error in main execution:', error);
    process.exit(1);
});
