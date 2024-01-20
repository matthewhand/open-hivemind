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
            console.debug("Message received:", message.content);
    
            if (message.author.bot || message.author.id === client.user.id) {
                console.debug("Message is from a bot or the bot itself, ignoring.");
                return;
            }
    
            const botMention = `<@!${client.user.id}>`;
            console.debug("Bot mention string:", botMention);
    
            if (message.content.startsWith('!') || message.content.includes(botMention)) {
                let commandContent = message.content;
    
                if (message.content.includes(botMention)) {
                    console.debug("Message includes bot mention.");
                    commandContent = message.content.replace(botMention, '').trim();
                    console.debug("Message after removing bot mention:", commandContent);
                }
    
                if (commandContent.startsWith('!')) {
                    console.debug("Message starts with '!'.");
                    commandContent = commandContent.slice(1).trim();
                    console.debug("Command content after removing '!':", commandContent);
                }
    
                console.debug("Passing to commandHandler with content:", commandContent);
                await commandHandler(message, commandContent);
                return;
            }
    
            console.debug("Passing to messageHandler.");
            await messageHandler(message, discordSettings, interrobangBonus, timeVsResponseChance);
        } catch (error) {
            console.error("Error in message event:", error);
            handleError(error, message);
        }
    });
}

debugEnvVars();
initialize().catch(error => console.error('Error during initialization:', error));
