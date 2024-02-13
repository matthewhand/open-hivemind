const logger = require('./utils/logger');
const DiscordBotManager = require('./managers/discordBotManager');
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
        const discordBotManager = new DiscordBotManager(logger);

        await discordBotManager.initBot(); // Ensure this properly awaits the client to be ready

        // Setup event handlers after the client is ready
        setupEventHandlers(discordBotManager.client);

        discordBotManager.client.once('ready', async () => {
            logger.info(`Logged in as ${discordBotManager.client.user.tag}!`);

            const webhookPort = process.env.WEB_SERVER_PORT || 3000;
            startWebhookServer(webhookPort);
            logger.info(`Webhook server started on port: ${webhookPort}`);

            await registerCommands(discordBotManager.client);
            logger.info('Commands registered successfully.');

            configurationManager.setConfig('BOT_USER_ID', discordBotManager.client.user.id);
            logger.info(`Bot ID stored: ${discordBotManager.client.user.id}`);
        });
    } catch (error) {
        logger.error('Error during initialization:', error);
        process.exit(1);
    }
}

initialize().catch(error => logger.error('Unhandled error during initialization:', error));
