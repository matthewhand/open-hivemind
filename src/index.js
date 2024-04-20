require('dotenv').config(); // Load environment variables from .env file into process.env

const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const { messageHandler } = require('./handlers/messageHandler');
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager');
const { startWebhookServer } = require('./handlers/webhookHandler');

/**
 * Logs environment variables for debugging purposes, ensuring sensitive information is not exposed.
 */
debugEnvVars();

/**
 * Initializes the Discord bot and related services.
 */
async function initialize() {
    logger.info('Initialization started.');
    try {
        const CLIENT_ID = configurationManager.getConfig('CLIENT_ID') || process.env.CLIENT_ID;
        
        if (!CLIENT_ID) {
            throw new Error('CLIENT_ID is not defined. Please check your configuration.');
        }

        const discordManager = DiscordManager.getInstance();
        console.log(`Type of messageHandler: ${typeof messageHandler}`); // Debug: Confirm type is 'function'
        discordManager.setMessageHandler(messageHandler);

        logger.info(`Bot initialization completed with CLIENT_ID: ${CLIENT_ID}. Starting webhook server...`);
        startWebhookServer(process.env.WEBHOOK_SERVER_PORT || 3000);

    } catch (error) {
        logger.error(`Error during initialization: ${error.message}`);
        process.exit(1); // Exit the process with a status code of 1 (indicates failure)
    }
}

initialize().catch(error => {
    logger.error(`Unhandled error during initialization: ${error.message}`, { stack: error.stack });
    process.exit(1); // Ensure the process exits with a failure status code on unhandled errors
});
