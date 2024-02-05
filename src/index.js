// index.js
const logger = require('./utils/logger');
const { registerCommands } = require('./handlers/slashCommandHandler');
const { debugEnvVars } = require('./config/debugEnvVars');
const { initializeFetch } = require('./utils/initializeFetch');
const { startWebhookServer } = require('./handlers/webhookHandler');
const bot = require('./bot'); // Import the initialized bot from bot.js
require('./eventhandlers'); // Import the event handlers

// Constants and initialization
const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
};

async function initialize() {
    initializeFetch();
    const webhookPort = process.env.WEB_SERVER_PORT || 3000;
    startWebhookServer(webhookPort);

    registerCommands(bot.client); // Register commands using the bot client
}

debugEnvVars();
initialize().catch(error => logger.error('Error during initialization:', error));
