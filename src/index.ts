require('module-alias/register'); // Enables tsconfig @alias paths at runtime
require('dotenv/config'); // Loads environment variables from .env

const { DiscordService } = require('@src/integrations/discord/DiscordService');
const ConfigurationManager = require('@common/config/ConfigurationManager').default;
const { redactSensitiveInfo } = require('@common/redactSensitiveInfo');
const Debug = require('debug');
const { messageHandler } = require('@src/message/handlers/messageHandler');

const debug = Debug('app:index');

// Iterate over all .env variables and log them with redaction
const envKeys = [
    'MESSAGE_PROVIDER', 
    'LLM_PROVIDER', 
    'DISCORD_TOKEN', 
    'DISCORD_CLIENT_ID', 
    'DISCORD_GUILD_ID', 
    'OPENAI_API_KEY', 
    'OPENAI_BASE_URL', 
    'OPENAI_MODEL',
    'FLOWISE_API_KEY',
    'FLOWISE_BASE_URL',
    'REPLICATE_API_TOKEN',
    'REPLICATE_BASE_URL'
];

envKeys.forEach(key => {
    const value = process.env[key];
    debug(redactSensitiveInfo(key, value));
});

async function main() {
    try {
        // Get the singleton instance of DiscordService
        const discordService = DiscordService.getInstance();
        debug('DiscordService instance retrieved with options:', discordService.options);

        // Set up the message handler
        discordService.setMessageHandler(messageHandler);
        debug('Message handler set up successfully.');

        // Retrieve the bot token from the configuration manager
        const botToken = new ConfigurationManager().DISCORD_TOKEN;
        debug('Bot Token retrieved:', botToken);

        // Guard clause: Ensure bot token is properly configured
        if (!botToken || botToken === 'UNCONFIGURED_DISCORD_TOKEN') {
            console.error('Bot Token is not configured correctly.');
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
