import 'dotenv/config'; // Load environment variables from .env file into process.env

import logger from './utils/logger';
import DiscordManager from './discord/DiscordManager'; // Updated import path for DiscordManager
import { messageHandler } from './handlers/messageHandler';
import { debugEnvVars } from './utils/environmentUtils';
import configurationManager from './config/configurationManager';
import { startWebhookServer } from './handlers/webhookHandler';

/**
 * Logs environment variables for debugging purposes, ensuring sensitive information is not exposed.
 */
debugEnvVars();

/**
 * Initializes the Discord bot and related services.
 */
async function initialize(): Promise<void> {
    logger.info('Initialization started.');
    try {
        const CLIENT_ID: string | undefined = configurationManager.getConfig('CLIENT_ID') || process.env.CLIENT_ID;
        
        if (!CLIENT_ID) {
            throw new Error('CLIENT_ID is not defined. Please check your configuration.');
        }

        const discordManager = DiscordManager.getInstance();
        console.log(`Type of messageHandler: ${typeof messageHandler}`); // Debug: Confirm type is 'function'
        discordManager.setMessageHandler(messageHandler);

        logger.info(`Bot initialization completed with CLIENT_ID: ${CLIENT_ID}. Starting webhook server...`);
        startWebhookServer(process.env.WEBHOOK_SERVER_PORT ? parseInt(process.env.WEBHOOK_SERVER_PORT) : 3000);

    } catch (error) {
        logger.error(`Error during initialization: ${(error as Error).message}`);
        process.exit(1); // Exit the process with a status code of 1 (indicates failure)
    }
}

initialize().catch(error => {
    logger.error(`Unhandled error during initialization: ${(error as Error).message}`, { stack: (error as Error).stack });
    process.exit(1); // Ensure the process exits with a failure status code on unhandled errors
});
