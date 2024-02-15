const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const messageHandler = require('./handlers/messageHandler').messageHandler; // Adjusted import based on your setup
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager'); // Assuming this is where you manage your .env variables

debugEnvVars();

async function initialize() {
    try {

        logger.debug('Debug logging is enabled.');
        logger.info('Info level log.');
        logger.error('Error level log.');

        logger.info('Initialization started.');
        // Retrieve CLIENT_ID from your configuration manager or directly from process.env
        const CLIENT_ID = configurationManager.getConfig('CLIENT_ID') || process.env.CLIENT_ID;
        if (!CLIENT_ID) {
            throw new Error('CLIENT_ID is not defined. Please check your configuration.');
        }

        const discordManager = DiscordManager.getInstance();
        discordManager.setMessageHandler(messageHandler);
        
        logger.info(`Bot initialization completed with CLIENT_ID: ${CLIENT_ID}`);
        // Additional initialization logic if necessary
    } catch (error) {
        logger.error(`Error during initialization: ${error}`);
        process.exit(1);
    }
}

initialize().catch(error => logger.error(`Unhandled error during initialization: ${error}`));
