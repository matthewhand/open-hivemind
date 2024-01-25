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
const { DecideToRespond } = require('./utils/responseDecider');

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
const botToBotMode = process.env.BOT_TO_BOT_MODE !== 'false'; // Defaults to true

// Bonuses and Response Chances
const INTERROBANG_BONUS = parseFloat(process.env.INTERROBANG_BONUS || '0.2');
const TIME_VS_RESPONSE_CHANCE = process.env.TIME_VS_RESPONSE_CHANCE ?
    JSON.parse(process.env.TIME_VS_RESPONSE_CHANCE) : 
    [[12345, 0.05], [7 * 60000, 0.75], [69 * 60000, 0.1]];

// Response Decider Singleton
const responseDecider = new DecideToRespond({
    disableUnsolicitedReplies: false,
    unsolicitedChannelCap: 5,
    ignore_dms: true
}, INTERROBANG_BONUS, TIME_VS_RESPONSE_CHANCE);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.login(process.env.DISCORD_TOKEN);
logger.info('Bot started successfully.');

client.once('ready', () => {
    logger.info('Bot is ready!');
    registerCommands(client);
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

// // Exception Handling and Auto-Restart Logic
// function handleExceptionAndScheduleRestart() {
//     try {
//         // Announce failure in the specified channel
//         const channel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
//         if (channel) {
//             channel.send('⚠️ The bot has encountered an issue and will restart shortly.');
//         }

//         logger.error('Bot encountered an exception. Triggering restart.');

//         // Exit the current Node.js process
//         process.exit(1);

//     } catch (err) {
//         logger.error(`Error during exception handling: ${err}`);
//         process.exit(1); // Ensure exit in case of error in the catch block
//     }
// }

// process.on('uncaughtException', handleExceptionAndScheduleRestart);
// process.on('unhandledRejection', handleExceptionAndScheduleRestart);

client.on('messageCreate', async (message) => {
    try {
        console.log(`Received message: ${message.content}`); // Debug: Log received message

        // Skip if the message is from the bot itself
        if (message.author.id === client.user.id) {
            console.log('Ignoring message from the bot itself.'); // Debug
            return;
        }

        const botMention = `<@${client.user.id}>`;
        const botMentionWithNick = `<@!${client.user.id}>`;

        let commandContent = message.content;

        // Check if the bot is mentioned by a user (not a bot)
        if ((message.content.includes(botMention) || message.content.includes(botMentionWithNick)) && !message.author.bot) {
            console.log('Bot is directly mentioned by a user.'); // Debug

            // Remove bot mention from message content
            commandContent = commandContent.replace(new RegExp(`${botMention}|${botMentionWithNick}`, 'g'), '').trim();

            // Check for command prefix and process accordingly
            if (commandContent.startsWith('!')) {
                console.log(`Processing command: ${commandContent}`); // Debug
                await commandHandler(message, commandContent);
            } else {
                console.log('Passing message to messageHandler.'); // Debug
                await messageHandler(message, discordSettings);
            }
            return;
        }

        // Use responseDecider to decide whether to reply in other cases
        const shouldReply = responseDecider.shouldReplyToMessage(client.user.id, message);
        if (shouldReply) {
            console.log('Decided to reply. Passing message to messageHandler.'); // Debug
            await messageHandler(message, discordSettings);
        } else {
            console.log('Decided not to reply.'); // Debug
        }
    } catch (error) {
        console.error(`Error in messageCreate event: ${error}`);
        handleError(error, message);
    }
});

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));
