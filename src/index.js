const logger = require('./utils/logger');
const { registerCommands } = require('./handlers/slashCommandHandler');
// const { initializeFetch } = require('./utils/initializeFetch'); // This line should be removed or commented out
const { startWebhookServer } = require('./handlers/webhookHandler');
const bot = require('./bot'); // Import the initialized bot from bot.js
require('./eventhandlers'); // Import the event handlers
const { debugEnvVars } = require('./utils/environmentUtils');

debugEnvVars();

// Constants and initialization
const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
};

async function initialize() {
    try {
        // initializeFetch(); // This line should also be removed or commented out
        logger.info('Fetch initialized successfully.');

        const webhookPort = process.env.WEB_SERVER_PORT || 3000;
        startWebhookServer(webhookPort);
        logger.info(`Webhook server started on port: ${webhookPort}`);

        await registerCommands(bot.client); // Register commands using the bot client
        logger.info('Commands registered successfully.');
    } catch (error) {
        logger.error('Error during initialization:', error);
        process.exit(1); // Exit the process in case of critical failure
    }
}

initialize().catch(error => logger.error('Unhandled error during initialization:', error));
