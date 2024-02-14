const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
// Remove the now-unused import for registerCommands
const { startWebhookServer } = require('./handlers/webhookHandler');
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager');
const { CHANNEL_ID } = require('./config/constants');
const { messageHandler } = require('./handlers/messageHandler');
const LlmInterface = require('./interfaces/LlmInterface'); // Ensure LlmInterface is imported correctly

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
        const discordManager = DiscordManager.getInstance();

        // Wait for the client to be ready is now handled within DiscordManager

        // Setup event handlers after the client is ready, which remains necessary
        setupEventHandlers(discordManager.client);

        // The attempt to register commands is now removed since it's handled within DiscordManager

    } catch (error) {
        logger.error('Error during initialization:', error);
        process.exit(1);
    }
}

initialize().catch(error => logger.error('Unhandled error during initialization:', error));

// Define and export the event handlers setup function
function setupEventHandlers(client) {
    client.on('messageCreate', async message => {
        try {
            logger.debug(`New message received: ${message.content}`);
            // Ensure the bot only listens to messages in the specified channel
            if (message.author.bot || message.channel.id !== CHANNEL_ID) return;

            await messageHandler(message);
        } catch (error) {
            logger.error(`Error in messageCreate handler: ${error}`);
        }
    });

    // Include additional event handlers here as needed
}

module.exports = setupEventHandlers;
