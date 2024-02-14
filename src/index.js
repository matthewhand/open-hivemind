const logger = require('./utils/logger');
const DiscordManager = require('./managers/DiscordManager');
const { registerCommands } = require('./handlers/slashCommandHandler');
const { startWebhookServer } = require('./handlers/webhookHandler');
const { debugEnvVars } = require('./utils/environmentUtils');
const configurationManager = require('./config/configurationManager');
const { CHANNEL_ID } = require('./config/constants'); // Ensure this is correctly pointing to where CHANNEL_ID is defined

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

        // Wait for the client to be ready
        await new Promise(resolve => discordManager.client.once('ready', async () => {
            logger.info(`Logged in as ${discordManager.client.user.tag}!`);
            // Fetch the last non-bot message and invoke the message handler after the client is ready
            if (CHANNEL_ID) {
                const channel = await discordManager.client.channels.fetch(CHANNEL_ID);
                const messages = await channel.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();
                if (lastMessage && lastMessage.author.id !== discordManager.client.user.id) {
                    // Call the message handler directly if it's not a message from the bot itself
                    await messageHandler(lastMessage);
                }
            } else {
                logger.warn('CHANNEL_ID is not configured. Please check your environment variables.');
            }
            resolve();
        }));

        // Setup event handlers after the client is ready
        setupEventHandlers(discordManager.client);

        // Conditional activation for webhook server
        // const webhookPort = process.env.WEB_SERVER_PORT || 3000;
        // startWebhookServer(webhookPort);
        // logger.info(`Webhook server started on port: ${webhookPort}`);

        await registerCommands(discordManager.client);
        logger.info('Commands registered successfully.');

    } catch (error) {
        logger.error('Error during initialization:', error);
        process.exit(1);
    }
}

initialize().catch(error => logger.error('Unhandled error during initialization:', error));

// Define and export the event handlers setup function
function setupEventHandlers(client) {
    const { messageHandler } = require('./handlers/messageHandler');

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
