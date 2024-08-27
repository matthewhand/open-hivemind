import 'module-alias/register';  // Allows for tsconfig @alias to work at runtime with js
import 'dotenv/config';  // Load environment variables from .env

import { DiscordService } from '@src/integrations/discord/DiscordService';
import ConfigurationManager from "@config/ConfigurationManager";
import logger from '@src/utils/logger';
import { messageHandler } from '@src/message/handlers/messageHandler';

async function main() {
    try {
        // Get the singleton instance of DiscordService
        const discordService = DiscordService.getInstance();

        // Set up the message handler
        discordService.setMessageHandler(messageHandler);

        // Retrieve the client ID from the configuration manager
        const clientId = ConfigurationManager.getConfig<string>('discord.clientId', 'UNCONFIGURED_DISCORD_CLIENT_ID');

        // Start the Discord service with the client ID
        await discordService.start(clientId);
    } catch (error) {
        // Log the error if the Discord service fails to start
        logger.error('Failed to start Discord service:', error);

        // Exit the process with an error code
        process.exit(1);
    }
}

// Call the main function to start the application
main();
