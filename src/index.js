const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const logger = require('./utils/logger');
const { registerCommands } = require('./utils/registerSlashCommands');
const { commandHandler } = require('./textCommands/commandHandler');
const { handleError } = require('./utils/handleError');
const { debugEnvVars } = require('./utils/debugEnvVars');
const { initializeFetch } = require('./utils/initializeFetch');
const { startWebhookServer } = require('./webhook');
const messageHandler = require('./utils/messageHandler');

// Constants and initialization
const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
};
const NOTIFICATION_CHANNEL_ID = process.env.CHANNEL_ID;
const restartDelayFile = './restartDelay.json';
const maxRestartDelay = parseInt(process.env.MAX_RESTART_DELAY || 60 * 60 * 1000); // Max delay, default 60 minutes
const delayMultiplier = parseFloat(process.env.DELAY_MULTIPLIER || 2); // Delay increase factor
const requireBotMention = process.env.REQUIRE_BOT_MENTION === 'true';
const includeUsername = process.env.INCLUDE_USERNAME === 'true';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});


// Read and write functions for restart delay
function readRestartDelay() {
    if (fs.existsSync(restartDelayFile)) {
        return JSON.parse(fs.readFileSync(restartDelayFile, 'utf8')).restartDelay;
    }
    return parseInt(process.env.INITIAL_RESTART_DELAY || 5 * 60 * 1000); // Default 5 minutes
}

function writeRestartDelay(delay) {
    fs.writeFileSync(restartDelayFile, JSON.stringify({ restartDelay: delay }), 'utf8');
}

// Exception Handling and Auto-Restart Logic
function handleExceptionAndScheduleRestart() {
    try {
        // Announce failure in the specified channel
        const channel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (channel) {
            channel.send('⚠️ The bot has encountered an issue and will restart shortly.');
        }

        logger.error('Bot encountered an exception. Triggering restart.');

        // Exit the current Node.js process
        process.exit(1);

    } catch (err) {
        logger.error(`Error during exception handling: ${err}`);
        process.exit(1); // Ensure exit in case of error in the catch block
    }
}

process.on('uncaughtException', handleExceptionAndScheduleRestart);
process.on('unhandledRejection', handleExceptionAndScheduleRestart);


async function initialize() {
    initializeFetch();
    const webhookPort = process.env.WEB_SERVER_PORT || 3000;
    startWebhookServer(webhookPort);

    // Bot-to-bot interaction is enabled by default; only disabled if explicitly set to 'false'
    const botToBotMode = process.env.BOT_TO_BOT_MODE !== 'false';

    client.on('messageCreate', async (message) => {
        try {
            console.log(`Received message: ${message.content}`); // Debug: Log received message
    
            if (message.author.bot || message.author.id === client.user.id) {
                console.log('Message is from a bot or from the bot itself. Ignoring.'); // Debug
                return;
            }
    
            const botMention = `<@${client.user.id}>`;
            const botMentionWithNick = `<@!${client.user.id}>`;
    
            let commandContent = message.content;
            if (message.content.includes(botMention) || message.content.includes(botMentionWithNick)) {
                console.log('Bot is mentioned in the message.'); // Debug
                commandContent = commandContent.replace(new RegExp(botMention + '|' + botMentionWithNick, 'g'), '').trim();
                if (commandContent.startsWith('!')) {
                    console.log(`Processing command: ${commandContent}`); // Debug
                    await commandHandler(message, commandContent);
                    return;
                }
            }
    
            console.log('Passing message to messageHandler.'); // Debug
            await messageHandler(message, discordSettings);
        } catch (error) {
            console.error(`Error in messageCreate event: ${error}`);
            handleError(error, message);
        }
    });
}

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));
