const logger = require('./utils/logger');
const { registerCommands } = require('./handlers/slashCommandHandler');
const { startWebhookServer } = require('./handlers/webhookHandler');
const bot = require('./bot'); // Import the initialized bot from bot.js
require('./eventhandlers'); // Import the event handlers
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager'); // Import configuration manager

debugEnvVars();

// Constants and initialization
const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
};

async function initialize() {
    try {
        logger.info('Initialization started.');

        bot.client.once('ready', async () => {
            logger.info(`Logged in as ${bot.client.user.tag}!`);
            // Now that we're sure the client is ready, proceed with the rest of the initialization
            const webhookPort = process.env.WEB_SERVER_PORT || 3000;
            startWebhookServer(webhookPort);
            logger.info(`Webhook server started on port: ${webhookPort}`);

            await registerCommands(bot.client); // Register commands using the bot client
            logger.info('Commands registered successfully.');

            // Store the bot's ID for later use in request payload construction
            configurationManager.setConfig('BOT_USER_ID', bot.client.user.id);
            logger.info(`Bot ID stored: ${bot.client.user.id}`);
        });
    } catch (error) {
        logger.error('Error during initialization:', error);
        process.exit(1); // Exit the process in case of critical failure
    }
}

// Call initialize without waiting for bot.client to be ready
initialize().catch(error => logger.error('Unhandled error during initialization:', error));

