import DiscordManager from '@message/discord/DiscordManager';
import ConfigurationManager from "@config/ConfigurationManager";
import logger from '@src/utils/logger';

import { messageHandler } from '@src/message/handlers/messageHandler';

async function main() {
    try {
        // Initialize DiscordManager
        const discordManager = new DiscordManager();
        
        // Set up the message handler
        discordManager.setMessageHandler(messageHandler);
        
        // Retrieve the client ID from the configuration manager
        const clientId = ConfigurationManager.getConfig<string>('discord.clientId');
        
        // Start the Discord manager with the client ID
        await discordManager.start(clientId);
    } catch (error) {
        // Log the error if the Discord manager fails to start
        logger.error('Failed to start Discord manager:', error);
        
        // Exit the process with an error code
        process.exit(1);
    }
}

// Call the main function to start the application
main();
