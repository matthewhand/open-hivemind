import DiscordManager from '@message/discord/DiscordManager';
import ConfigurationManager from '@common/ConfigurationManager';
import logger from '@utils/logger';

import { messageHandler } from '@message/handlers/messageHandler';

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
        Logger.error('Failed to start Discord manager:', error);
        
        // Exit the process with an error code
        process.exit(1);
    }
}

// Call the main function to start the application
main();
