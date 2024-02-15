// index.js or equivalent initializer
const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const messageHandler = require('./handlers/messageHandler');
const { debugEnvVars } = require('./utils/environmentUtils');

debugEnvVars();

async function initialize() {
    try {
        logger.info('Initialization started.');
        const discordManager = DiscordManager.getInstance();
        discordManager.setMessageHandler(messageHandler);

        // Additional initialization logic if necessary
    } catch (error) {
        logger.error(`Error during initialization: ${error}`);
        process.exit(1);
    }
}

initialize().catch(error => logger.error(`Unhandled error during initialization: ${error}`));
