require('dotenv/config'); // Loads environment variables from .env
require('module-alias/register'); // Enables tsconfig @alias paths at runtime

const { redactSensitiveInfo } = require('@common/redactSensitiveInfo');
const { DiscordService } = require('@src/integrations/discord/DiscordService');
import { ConfigurationManager } from '@config/ConfigurationManager'; // Corrected import
const { debugEnvVars } = require('@config/debugEnvVars');
const Debug = require('debug');
const { messageHandler } = require('@src/message/handlers/messageHandler');

const debug = Debug('app:index');

// Debug: Print all environment variables for verification
console.log('[DEBUG] All environment variables:', redactSensitiveInfo('process.env', process.env));

// Initialize configuration manager
const configManager = ConfigurationManager.getInstance();

// Load integration configurations

// Debug environment variables
debugEnvVars();

// Debug: Check if discord configuration is loaded
import discordConfig from '@integrations/discord/interfaces/discordConfig';
console.log('[DEBUG] discordConfig:', discordConfig);
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

        // Retrieve the bot token directly using convict
        const botToken = discordConfig?.get('DISCORD_BOT_TOKEN') || '';  // Convict-based access

        debug('[DEBUG] Bot Token retrieved:', redactSensitiveInfo('DISCORD_BOT_TOKEN', botToken));

        // Guard clause: Ensure bot token is properly configured
        if (!botToken || botToken === 'UNCONFIGURED_DISCORD_BOT_TOKEN') {
            console.error('[DEBUG] Bot Token is not configured correctly.');
            debug('[DEBUG] Full discordConfig:', discordConfig.getProperties()); // Dump full config for debugging
            process.exit(1);
        }

        // Start the Discord service with the bot token
        await discordService.initialize(botToken);
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
import llmConfig from '@llm/interfaces/llmConfig';
import messageConfig from '@message/interfaces/messageConfig';

console.log('LLM Provider in use:', llmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
console.log('Message Provider in use:', messageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');
