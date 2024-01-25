const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('./utils/logger');
const { registerCommands } = require('./utils/registerSlashCommands');
const { commandHandler } = require('./textCommands/commandHandler');
const { handleError } = require('./utils/handleError');
const { debugEnvVars } = require('./utils/debugEnvVars');
const { initializeFetch } = require('./utils/initializeFetch');
const { startWebhookServer } = require('./webhook');
const messageHandler = require('./utils/messageHandler');

const discordSettings = {
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true,
};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.login(process.env.DISCORD_TOKEN);
logger.info('Bot started successfully.');

client.once('ready', () => {
    logger.info('Bot is ready!');
    registerCommands(client);
});

// Exception Handling and Auto-Restart Logic
const NOTIFICATION_CHANNEL_ID = process.env.CHANNEL_ID; // Use CHANNEL_ID for notification

// Backoff strategy variables
let restartDelay = parseInt(process.env.INITIAL_RESTART_DELAY || 5 * 60 * 1000); // Initial delay, default 5 minutes
const maxRestartDelay = parseInt(process.env.MAX_RESTART_DELAY || 60 * 60 * 1000); // Max delay, default 60 minutes
const delayMultiplier = parseFloat(process.env.DELAY_MULTIPLIER || 2); // Delay increase factor

function handleExceptionAndScheduleRestart() {
    try {
        // Announce failure in the specified channel
        const channel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (channel) {
            channel.send('⚠️ The bot has encountered an issue and will restart shortly.');
        }

        logger.error('Bot encountered an exception. Scheduling a restart.');

        // Use an exponential backoff strategy for restarts
        setTimeout(() => {
            const exec = require('child_process').exec;
            exec('cd ~/discord-llm-bot/ && docker-compose up -d', (error, stdout, stderr) => {
                if (error) {
                    logger.error(`Restart command failed: ${error}`);
                    // Increase the delay for the next restart attempt
                    restartDelay = Math.min(restartDelay * delayMultiplier, maxRestartDelay);
                    return;
                }
                logger.info(`Bot restarted successfully: ${stdout}`);
                // Reset delay after a successful restart
                restartDelay = parseInt(process.env.INITIAL_RESTART_DELAY || 5 * 60 * 1000);
            });
        }, restartDelay);

    } catch (err) {
        logger.error(`Error during exception handling and restart: ${err}`);
        // Increase the delay for the next restart attempt
        restartDelay = Math.min(restartDelay * delayMultiplier, maxRestartDelay);
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
            // Skip if the message is from the bot itself
            if (message.author.id === client.user.id) return;

            // Skip other bots' messages if BOT_TO_BOT_MODE is explicitly set to 'false'
            if (message.author.bot && !botToBotMode) return;

            const botMention = `<@${client.user.id}>`;
            const botMentionWithNick = `<@!${client.user.id}>`;
            let commandContent = message.content;
            if (message.content.includes(botMention) || message.content.includes(botMentionWithNick)) {
                commandContent = commandContent.replace(new RegExp(botMention + '|' + botMentionWithNick, 'g'), '').trim();
                if (commandContent.startsWith('!')) {
                    await commandHandler(message, commandContent);
                    return;
                }
            }
            await messageHandler(message, discordSettings);
        } catch (error) {
            handleError(error, message);
        }
    });
}

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));
