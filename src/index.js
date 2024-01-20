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
            if (message.author.bot || message.author.id === client.user.id) return;
    
            const botMention = `<@${client.user.id}>`;
            const botMentionWithNick = `<@!${client.user.id}>`;
    
            if (message.content.startsWith('!') || message.content.includes(botMention) || message.content.includes(botMentionWithNick)) {
                let commandContent = message.content;
                
                if (message.content.includes(botMention)) {
                    commandContent = message.content.replace(botMention, '').trim();
                } else if (message.content.includes(botMentionWithNick)) {
                    commandContent = message.content.replace(botMentionWithNick, '').trim();
                }
    
                if (commandContent.startsWith('!')) {
                    commandContent = commandContent.slice(1).trim();
                }
    
                await commandHandler(message, commandContent);
                return;
            }
    
            // Handling non-command messages
            await messageHandler(message, discordSettings, interrobangBonus, timeVsResponseChance);
        } catch (error) {
            handleError(error, message);
        }
    });
}

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));
