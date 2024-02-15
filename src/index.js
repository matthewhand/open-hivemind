const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const { debugEnvVars } = require('./utils/environmentUtils');

debugEnvVars();

async function initialize() {
    try {
        logger.info('Initialization started.');
        DiscordManager.getInstance(); // This now automatically sets up event handlers as well
    } catch (error) {
        logger.error(`Error during initialization: ${error}`);
        process.exit(1);
    }
}

initialize().catch(error => logger.error(`Unhandled error during initialization: ${error}`));
