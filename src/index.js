"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
require('dotenv/config'); // Loads environment variables from .env
require('module-alias/register'); // Enables tsconfig @alias paths at runtime
const { redactSensitiveInfo } = require('@common/redactSensitiveInfo');
const { DiscordService } = require('@src/integrations/discord/DiscordService');
const ConfigurationManager = require('@config/ConfigurationManager').default;
const { debugEnvVars } = require('@config/debugEnvVars');
const Debug = require('debug');
const { messageHandler } = require('@src/message/handlers/messageHandler');
const debug = Debug('app:index');
// Initialize configuration manager
const configManager = ConfigurationManager.getInstance();
// Load integration configurations
configManager.loadConfig();
// Debug environment variables
debugEnvVars();
// Debug: Check if discord configuration is loaded
const discordConfig = configManager.getConfig('discord');
if (!discordConfig) {
    console.error('[DEBUG] Discord configuration not found');
}
else {
    debug('[DEBUG] Discord configuration loaded:', discordConfig);
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get the singleton instance of DiscordService
            const discordService = DiscordService.getInstance();
            debug('[DEBUG] DiscordService instance retrieved with options:', discordService.options);
            // Set up the message handler
            discordService.setMessageHandler(messageHandler);
            debug('[DEBUG] Message handler set up successfully.');
            // Retrieve the bot token directly using convict
            const botToken = (discordConfig === null || discordConfig === void 0 ? void 0 : discordConfig.get('DISCORD_TOKEN')) || ''; // Convict-based access
            debug('[DEBUG] Bot Token retrieved:', redactSensitiveInfo('DISCORD_TOKEN', botToken));
            // Guard clause: Ensure bot token is properly configured
            if (!botToken || botToken === 'UNCONFIGURED_DISCORD_TOKEN') {
                console.error('[DEBUG] Bot Token is not configured correctly.');
                debug('[DEBUG] Full discordConfig:', discordConfig.getProperties()); // Dump full config for debugging
                process.exit(1);
            }
            // Start the Discord service with the bot token
            yield discordService.start(botToken);
            debug('[DEBUG] Discord service started successfully with Bot Token.');
        }
        catch (error) {
            // Log the error if the Discord service fails to start
            console.error('[DEBUG] Failed to start Discord service:', error);
            // Exit the process with an error code
            process.exit(1);
        }
    });
}
// Start the application by invoking the main function
main().catch((error) => {
    console.error('[DEBUG] Unexpected error in main execution:', error);
    process.exit(1);
});
