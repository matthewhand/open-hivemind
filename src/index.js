const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const setupEventHandlers = require('./eventhandlers');
const { registerCommands } = require('./handlers/slashCommandHandler');
const { startWebhookServer } = require('./handlers/webhookHandler');
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager');

debugEnvVars();

// Constants and initialization settings
const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
};

async function initialize() {
    try {
        logger.info('Initialization started.');
        // Utilize DiscordManager singleton instance
        const discordManager = DiscordManager.getInstance();

        // Ensuring the Discord client is properly initialized and ready
        discordManager.client.once('ready', async () => {
            logger.info(`Logged in as ${discordManager.client.user.tag}!`);

            // Start the webhook server
            const webhookPort = process.env.WEB_SERVER_PORT || 3000;
            startWebhookServer(webhookPort);
            logger.info(`Webhook server started on port: ${webhookPort}`);

            // Register commands after the client is ready
            await registerCommands(discordManager.client);
            logger.info('Commands registered successfully.');

            // Storing the bot user ID for later use
            configurationManager.setConfig('BOT_USER_ID', discordManager.client.user.id);
            logger.info(`Bot ID stored: ${discordManager.client.user.id}`);
        });

        // Setup event handlers
        setupEventHandlers(discordManager.client);

    } catch (error) {
        logger.error('Error during initialization:', error);
        process.exit(1);
    }
}

initialize().catch(error => logger.error('Unhandled error during initialization:', error));
