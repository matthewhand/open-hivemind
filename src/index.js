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
const interrobangBonus = 0.1;
const timeVsResponseChance = [[5, 0.05], [120, 0.5], [420, 0.9], [6900, 0.1]];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.login(process.env.DISCORD_TOKEN);
logger.info('Bot started successfully.');

client.once('ready', () => {
    logger.info('Bot is ready!');
    registerCommands(client);
});

async function initialize() {
    initializeFetch();
    const webhookPort = process.env.WEB_SERVER_PORT || 3000;
    startWebhookServer(webhookPort);

    client.on('messageCreate', async (message) => {
        try {
            // Ignore messages from bots, including itself
            if (message.author.bot || message.author.id === client.user.id) return;
    
            const botMention = `<@${client.user.id}>`;
            const botMentionWithNick = `<@!${client.user.id}>`;
    
            let commandContent = message.content;
    
            // Check if the message includes a bot mention
            if (message.content.includes(botMention) || message.content.includes(botMentionWithNick)) {
                // Strip the bot mention from the message
                commandContent = commandContent.replace(new RegExp(botMention + '|' + botMentionWithNick, 'g'), '').trim();
    
                // If the message starts with '!', treat as a command
                if (commandContent.startsWith('!')) {
                    await commandHandler(message, commandContent);
                    return; // Stop further processing
                }
            }
    
            // Handle as a regular message
            await messageHandler(message, discordSettings, interrobangBonus, timeVsResponseChance);
        } catch (error) {
            handleError(error, message);
        }
    });
    }

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));
