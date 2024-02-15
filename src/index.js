const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const { startWebhookServer } = require('./handlers/webhookHandler');
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager');
const { CHANNEL_ID } = require('./config/constants');
const { messageHandler } = require('./handlers/messageHandler');
const LlmInterface = require('./interfaces/LlmInterface'); // Assuming LlmInterface is used somewhere in messageHandler

debugEnvVars();

// Constants and initialization settings remain unchanged

async function initialize() {
    try {
        logger.info('Initialization started.');
        const discordManager = DiscordManager.getInstance();

        // Setup event handlers after the client is ready
        setupEventHandlers(discordManager.client);

    } catch (error) {
        logger.error(`Error during initialization: ${error}`);
        process.exit(1);
    }
}

initialize().catch(error => logger.error(`Unhandled error during initialization: ${error}`));

// Updated event handlers setup function
function setupEventHandlers(client) {
    client.on('messageCreate', async (message) => {
        try {
            // Basic checks before processing the message
            if (!message) {
                logger.warn('Received undefined message object.');
                return;
            }
            if (message.author.bot) {
                logger.debug('Ignoring message from bot.');
                return;
            }
            if (message.channel.id !== CHANNEL_ID) {
                logger.debug(`Ignoring message not in the designated channel: ${CHANNEL_ID}.`);
                return;
            }

            logger.debug(`Processing message: ${message.content}`);
            await messageHandler(message);
        } catch (error) {
            logger.error(`Error in messageCreate handler: ${error}`);
        }
    });

    // Additional event handlers can be added here as needed
}

module.exports = setupEventHandlers;
