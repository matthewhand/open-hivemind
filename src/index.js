const logger = require('./utils/logger');
const { debugEnvVars } = require('./utils/environmentUtils');
const messageHandler = require('./handlers/messageHandler').messageHandler; // Ensure this is correctly imported
const DiscordManager = require('./managers/DiscordManager');

debugEnvVars();

async function initialize() {
    try {
        logger.info('Initialization started.');
        // Pass the messageHandler to the DiscordManager instance during its initialization
        DiscordManager.getInstance(messageHandler);
    } catch (error) {
        logger.error(`Error during initialization: ${error}`);
        process.exit(1);
    }
}

initialize().catch(error => logger.error(`Unhandled error during initialization: ${error}`));
