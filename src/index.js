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
// const NOTIFICATION_CHANNEL_ID = process.env.CHANNEL_ID;
const restartDelayFile = './restartDelay.json';

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

async function initialize() {
    initializeFetch();
    const webhookPort = process.env.WEB_SERVER_PORT || 3000;
    startWebhookServer(webhookPort);

    client.on('messageCreate', async (message) => {
        try {
            console.log(`[Message Received] Content: ${message.content}, Author: ${message.author.username}`);
    
            if (message.author.id === client.user.id) {
                console.log('[Message Handling] Message from the bot itself. Ignored.');
                return;
            }
    
            const botMention = `<@${client.user.id}>`;
            const botMentionWithNick = `<@!${client.user.id}>`;
            let commandContent = message.content;
    
            if ((message.content.includes(botMention) || message.content.includes(botMentionWithNick)) && !message.author.bot) {
                console.log('[Message Handling] Bot directly mentioned by a user.');
                commandContent = commandContent.replace(new RegExp(`${botMention}|${botMentionWithNick}`, 'g'), '').trim();
    
                if (commandContent.startsWith('!')) {
                    console.log(`[Command Handling] Command detected: ${commandContent}`);
                    await commandHandler(message, commandContent);
                } else {
                    console.log('[Message Handling] Passing to messageHandler.');
                    await messageHandler(message, discordSettings);
                }
                return;
            }
    
            await messageHandler(message, discordSettings);
            console.log('[Message Handling] Passed to messageHandler without direct mention.');
        } catch (error) {
            console.error(`[Error] Message Handling: ${error}`);
        }
    });
            
}

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));
