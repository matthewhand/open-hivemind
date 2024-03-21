require('dotenv').config(); // This will read your .env file, parse the contents, assign it to process.env

const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const messageHandler = require('./handlers/messageHandler').messageHandler;
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager');
const { startWebhookServer } = require('./handlers/webhookHandler');

// Assuming debugEnvVars is a function that logs environment variables for debugging
// Ensure this function respects privacy and security by not logging sensitive info
debugEnvVars();

async function initialize() {
    try {
        // Check if debugging is enabled
        if (process.env.DEBUG === 'true') {
            logger.debug('Debug logging is enabled.');
        }
        
        logger.info('Initialization started.');
        // Retrieve CLIENT_ID from your configuration manager or directly from process.env
        const CLIENT_ID = configurationManager.getConfig('CLIENT_ID') || process.env.CLIENT_ID;
        if (!CLIENT_ID) {
            throw new Error('CLIENT_ID is not defined. Please check your configuration.');
        }

        const discordManager = DiscordManager.getInstance();
        discordManager.setMessageHandler(messageHandler);
        
        logger.info(`Bot initialization completed with CLIENT_ID: ${CLIENT_ID}`);
        
        // At the end of the initialize function or after the bot has logged in
        startWebhookServer(process.env.WEB_SERVER_PORT || 3000);

    } catch (error) {
        logger.error(`Error during initialization: ${error}`);
        process.exit(1);
    }
}

initialize().catch(error => logger.error(`Unhandled error during initialization: ${error}`));
